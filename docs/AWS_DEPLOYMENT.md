# AWS deployment guide (no Docker)

## 1. AWS architecture

- **Route 53**: DNS for your domain.
- **CloudFront**: one public entry point. The default behavior serves the React build from a private S3 bucket; `/api/*` is forwarded to the Elastic Beanstalk environment.
- **S3**: stores the Vite production build. Use CloudFront Origin Access Control (OAC); do not enable public bucket access.
- **Elastic Beanstalk**: runs the Flask API and two supervised background processes from the `Procfile` (`outbox` and `email_worker`).
- **RDS for MySQL**: authoritative application database.
- **ElastiCache for Memcached**: catalogue cache.
- **Amazon MQ for RabbitMQ**: durable asynchronous email queue.

Place RDS, ElastiCache, Amazon MQ and the Elastic Beanstalk instances in the same VPC, with private subnets where practical. Configure the Elastic Beanstalk environment to use the VPC and subnets that can reach the managed services.

## 2. Create and prepare Amazon RDS

1. Create an RDS for MySQL database. Choose a MySQL version compatible with your SQL migration and SQLAlchemy/PyMySQL.
2. Keep **Public access = No**.
3. Create a database and an application database user. Do not use the RDS master account in the application.
4. In the RDS security group, allow TCP 3306 only from the Elastic Beanstalk instance security group.
5. Copy the RDS endpoint hostname. Do not use an IP address; RDS endpoints can resolve to a different IP after maintenance or failover.
6. Connect from a trusted administration environment and run, in order:
   - `db/migration_appointments_and_catalog.sql`
   - `db/seed_demo_catalog_and_therapists.sql` (only if you want the demo records)
7. Run `python init_db.py` from the backend folder after configuring the database environment variables to verify the schema.

Back up the existing database before migration. The seed script inserts sample catalogue and therapist data; inspect it before using it with existing data.

## 3. Create ElastiCache for Memcached

1. Create an ElastiCache **Memcached** cluster in the same VPC as Elastic Beanstalk.
2. Select private subnets and enable in-transit encryption/TLS if supported by the selected engine and node configuration.
3. In the cache security group, allow TCP 11211 only from the Elastic Beanstalk instance security group.
4. Copy the **node endpoint hostname(s)** and port from the ElastiCache console. This project uses `pymemcache` static node endpoints; it does not implement ElastiCache configuration-endpoint auto-discovery. If you use more than one node, list each node endpoint separated by commas.

Set these Elastic Beanstalk environment properties:

```text
CACHE_ENABLED=true
MEMCACHED_SERVERS=<node-1-endpoint,node-2-endpoint-if-used>
MEMCACHED_PORT=11211
MEMCACHED_TLS=true
MEMCACHED_POOL_SIZE=8
```

If you intentionally create a cluster without TLS for a controlled private-network lab, set `MEMCACHED_TLS=false`. Do not expose port 11211 to the Internet. If you add/remove nodes later, update `MEMCACHED_SERVERS` and restart/redeploy the Elastic Beanstalk environment. The application treats cache errors as cache misses and reads from RDS instead.

The code uses versioned therapist cache keys to invalidate a whole therapist namespace. Memcached does not support wildcard key deletion.

## 4. Create Amazon MQ for RabbitMQ

1. Create an Amazon MQ broker using the RabbitMQ engine, in the same VPC.
2. Create a dedicated RabbitMQ username and password. Keep the broker private (not publicly accessible).
3. Allow TCP 5671 from the Elastic Beanstalk instance security group to the broker security group. The application uses the TLS/AMQPS listener.
4. Copy the broker's private DNS endpoint/hostname. Do not add `amqps://` or a port to `RABBITMQ_HOST`; set host and port separately.

Set these Elastic Beanstalk environment properties:

```text
RABBITMQ_HOST=<private Amazon MQ broker endpoint>
RABBITMQ_PORT=5671
RABBITMQ_TLS=true
RABBITMQ_USER=<broker username>
RABBITMQ_PASSWORD=<broker password>
RABBITMQ_VHOST=/
RABBITMQ_EMAIL_QUEUE=booking_emails
EMAIL_OUTBOX_POLL_SECONDS=5
```

Use the broker's TLS endpoint and keep its management interface private. Do not expose RabbitMQ ports to the public Internet.

## 5. Prepare Elastic Beanstalk environment properties

Create an Elastic Beanstalk application with the current supported **Python** platform branch. Create an environment in the same VPC as RDS, ElastiCache and Amazon MQ. The environment's instance security group must be allowed by the three managed-service security groups.

In **Configuration → Updates, monitoring, and logging → Environment properties** (the exact console grouping can vary), set:

```text
FLASK_ENV=production
FLASK_DEBUG=False
DB_HOST=<RDS endpoint hostname>
DB_PORT=3306
DB_NAME=<database name>
DB_USER=<application database username>
DB_PASSWORD=<database password>
JWT_SECRET_KEY=<new long random secret>
JWT_ACCESS_TOKEN_EXPIRES=3600
CACHE_ENABLED=true
MEMCACHED_HOST=<ElastiCache endpoint>
MEMCACHED_PORT=11211
MEMCACHED_TLS=true
RABBITMQ_HOST=<Amazon MQ private endpoint>
RABBITMQ_PORT=5671
RABBITMQ_TLS=true
RABBITMQ_USER=<Amazon MQ username>
RABBITMQ_PASSWORD=<Amazon MQ password>
RABBITMQ_VHOST=/
RABBITMQ_EMAIL_QUEUE=booking_emails
EMAIL_OUTBOX_POLL_SECONDS=5
SMTP_HOST=<your SMTP provider host>
SMTP_PORT=587
SMTP_USER=<SMTP username>
SMTP_PASSWORD=<SMTP password or app password>
SMTP_FROM=<verified sender address>
SMTP_USE_TLS=true
```

Use a fresh JWT secret. Do not reuse any secret that was previously pasted into a chat, committed to Git, or otherwise exposed. For a stronger production setup, store credentials in AWS Secrets Manager and restrict access to the Elastic Beanstalk instance role. Do not place real secrets in `.ebextensions`, source code, or GitHub.

The application needs no AWS API credentials for the RDS, cache or RabbitMQ connections; it uses their private network endpoints and service credentials.

## 6. Deploy the Flask backend to Elastic Beanstalk

The `backend/` directory is the Elastic Beanstalk source bundle root. It contains:

- `requirements.txt` for Python dependencies.
- `wsgi.py` as the WSGI entry point.
- `Procfile` with the web server, outbox publisher and RabbitMQ email consumer.
- `.ebextensions/01_healthcheck.config` for the `/api/health` health-check path.

From PowerShell at the repository root, create the ZIP with the **contents** of `backend`, not a parent `backend` directory:

```powershell
Compress-Archive -Path .\backend\* -DestinationPath .\ecommerce-backend-eb.zip -Force
```

Important: PowerShell wildcard expansion can omit hidden files on some versions. Confirm that `.ebextensions/01_healthcheck.config` is inside the ZIP. If it is missing, use the AWS EB CLI from inside `backend` (`eb init`, then `eb deploy`) or create the archive with a ZIP utility that includes hidden files.

Upload `ecommerce-backend-eb.zip` as the Elastic Beanstalk application version and deploy it. Check the environment health and logs. Test:

```text
https://<your-elastic-beanstalk-environment-domain>/api/health
https://<your-elastic-beanstalk-environment-domain>/api/ready
```

`/api/health` checks that Flask is running. `/api/ready` also checks the database connection.

### Background processes and scaling note

The Procfile runs `outbox` and `email_worker` alongside `web`. Elastic Beanstalk monitors these long-running processes and restarts them if they exit. Each EC2 instance in the environment will run its own publisher and consumer. The outbox publisher uses MySQL row locking (`FOR UPDATE SKIP LOCKED`) to reduce concurrent publishing when the environment scales horizontally. The outbox design is at-least-once: a process crash after publishing but before marking the row published can still cause a duplicate message. For a portfolio deployment, monitor the worker logs and test retries; for a high-volume production system, add explicit message idempotency and a dead-letter/retry policy.

If you want to keep background processing isolated, deploy the same backend bundle into a separate small Elastic Beanstalk environment dedicated to workers, with a single instance initially, and configure its Procfile to run only the worker processes. Do not run multiple outbox publishers without the row-locking logic.

### Email delivery

The queue worker uses SMTP. Configure a valid sender/provider and verify the sender address/domain with that provider. If SMTP is not configured, messages will remain/retry in RabbitMQ and emails will not be delivered. Never use real customer email addresses for tests without permission.

## 7. Build and upload the React frontend to S3

The production API base is `/api`, so the browser sends API requests to the same CloudFront hostname. This avoids hard-coding the Elastic Beanstalk hostname in React.

From PowerShell:

```powershell
cd frontend
npm ci
npm run build
```

Create an S3 bucket for the frontend build, keep Block Public Access enabled, and configure CloudFront Origin Access Control (OAC) for the bucket. Upload the contents of `frontend/dist` to the bucket root:

```powershell
aws s3 sync .\dist s3://YOUR_FRONTEND_BUCKET/ --delete
```

Do not make the S3 bucket public. CloudFront should be the public path to the frontend.

## 8. Configure CloudFront origins and behaviors

Create one CloudFront distribution with two origins:

**Origin 1 – frontend S3 bucket**
- Origin type: S3 REST origin (not the S3 website endpoint).
- Use Origin Access Control (OAC) and sign requests.
- Keep S3 Block Public Access enabled.

**Origin 2 – Elastic Beanstalk environment**
- Origin domain: the Elastic Beanstalk environment DNS name.
- Origin protocol policy: HTTPS only if the EB environment has a valid HTTPS origin endpoint; otherwise use HTTP to the EB load balancer and restrict its inbound access as described below. For a production setup, configure TLS from CloudFront to the EB origin.

Configure behaviors:

| Path pattern | Origin | Methods | Cache policy |
|---|---|---|---|
| `/api/*` | Elastic Beanstalk | All required API methods (GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE) | CachingDisabled; forward Authorization, required headers, query strings and cookies as needed |
| Default `*` | S3 | GET, HEAD | Managed-CachingOptimized |

For `/api/*`, do not cache authenticated or dynamic API responses. Forward the `Authorization` header so JWT authentication works. Configure the origin request policy to forward the headers, cookies and query strings your API actually uses. The frontend currently uses bearer tokens in the `Authorization` header and JSON request bodies.

For the default S3 behavior, configure SPA fallback so missing object paths return `/index.html` with HTTP 200 (CloudFront custom error responses for 403/404). This allows React Router routes such as `/services` and `/profile` to load on refresh.

After uploading a new frontend build, create a CloudFront invalidation for `/*` or use versioned assets plus a suitable index.html cache policy.

## 9. Configure Route 53

1. Add or use your domain hosted zone in Route 53.
2. Request/validate an ACM certificate in **us-east-1** for the CloudFront domain name(s).
3. Attach the certificate and alternate domain names to CloudFront.
4. Create Route 53 A/AAAA alias records pointing your root domain and/or `www` name to the CloudFront distribution.

Do not point public DNS directly at the RDS, ElastiCache or Amazon MQ endpoints.

## 10. Security-group traffic summary

| Resource security group | Inbound source | Port | Purpose |
|---|---|---:|---|
| Elastic Beanstalk instances / load balancer | CloudFront origin-facing access (or a carefully restricted origin access design) | 80/443 | API origin traffic |
| RDS | Elastic Beanstalk instance security group | 3306 | MySQL |
| ElastiCache Memcached | Elastic Beanstalk instance security group | 11211 | Memcached (TLS if enabled) |
| Amazon MQ RabbitMQ | Elastic Beanstalk instance security group | 5671 | AMQPS/TLS |

Do not open 3306, 11211 or 5671 to `0.0.0.0/0`. For the EB origin, use CloudFront origin-facing IP ranges or a private-origin architecture where available; do not assume a security group can directly reference a CloudFront distribution. Keep SSH closed unless you have a specific, restricted administration requirement.

## 11. Deployment validation checklist

- [ ] `/api/health` returns success through Elastic Beanstalk.
- [ ] `/api/ready` reports the RDS connection as ready.
- [ ] Product and category endpoints return data with `CACHE_ENABLED=true`.
- [ ] Service and therapist endpoints return data with ElastiCache enabled.
- [ ] Appointment slot availability still comes from MySQL, not Memcached.
- [ ] A confirmed appointment creates an email-outbox row.
- [ ] Outbox process publishes to the Amazon MQ queue.
- [ ] Email worker consumes the message and SMTP provider accepts the email.
- [ ] CloudFront serves React from S3 and forwards `/api/*` to Elastic Beanstalk.
- [ ] Route 53 domain resolves to CloudFront over HTTPS.
