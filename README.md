# Beauty E-Commerce Platform

React + Flask + MySQL portfolio application designed for AWS managed services.

## Application features

- User registration, login and JWT-protected account pages.
- Product catalogue, categories, product details, cart and checkout.
- Therapist profiles and service-to-therapist mapping.
- Therapist weekly schedules and date exceptions.
- Two-hour appointment slots and temporary slot holds.
- MySQL uniqueness protection against simultaneous double-booking.
- Simulated appointment checkout. Card fields are validated in the browser only; no real payment gateway is contacted and no card data is sent to Flask.
- MySQL email outbox and asynchronous RabbitMQ confirmation-email processing.
- Memcached caching for products, categories, services and therapist information.

## Target AWS architecture

```text
Browser
  |
  v
Route 53 (DNS)
  |
  v
CloudFront
  |-- default behavior --> private S3 origin (React/Vite static website files)
  |-- /api/* behavior --> Elastic Beanstalk origin (Flask API)
                              |
                              |-- Amazon ElastiCache for Memcached
                              |-- Amazon MQ for RabbitMQ
                              |-- Amazon RDS for MySQL
                              `-- outbox publisher + email worker processes
```

No Docker is required. Memcached and RabbitMQ are AWS managed services, not containers on the Elastic Beanstalk instances.

## Project structure

```text
backend/
  app.py
  wsgi.py
  Procfile
  config.py
  models.py
  extensions.py
  routes/
  workers/
    outbox_publisher.py
    email_worker.py
  cache_service.py
  rabbitmq_service.py
  requirements.txt
  .env.example
  .ebextensions/

frontend/
  src/
  package.json
  package-lock.json
  .env.production
  vite.config.js

db/
  migration_appointments_and_catalog.sql
  seed_demo_catalog_and_therapists.sql
  README.md

docs/
  AWS_DEPLOYMENT.md
  BOOKING_FLOW.md
```

## Database setup

1. Back up your existing database before making schema changes.
2. Create or select the MySQL database on Amazon RDS.
3. Restore your private database backup to RDS if you need the existing users/products.
4. Run `db/migration_appointments_and_catalog.sql` once.
5. Run `db/seed_demo_catalog_and_therapists.sql` to add sample beauty products, services, therapists and weekly schedules.
6. Run `python init_db.py` from the backend folder to verify the connection and required tables.

The seed script contains illustrative sample catalogue records. Review it before running it against a database that already contains production data. The original private database dump is not included in this repository because it contained user data and password hashes.

## Local development

### Backend (PowerShell)

```powershell
cd backend
py -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
# Edit .env with local MySQL, Memcached and RabbitMQ settings.
python app.py
```

For local testing, you can use locally installed Memcached and RabbitMQ, or temporarily set `CACHE_ENABLED=false` and configure a reachable RabbitMQ instance. No Docker setup is included in this AWS version.

### Frontend (second PowerShell terminal)

```powershell
cd frontend
npm ci
npm run dev
```

Vite proxies `/api` requests to `http://127.0.0.1:5000` during local development.

## AWS deployment

Read [docs/AWS_DEPLOYMENT.md](docs/AWS_DEPLOYMENT.md). It explains the RDS schema migration, Elastic Beanstalk source bundle, ElastiCache and Amazon MQ connectivity, S3/CloudFront frontend deployment, Route 53 DNS and security groups.

## Important booking rules

- A slot lasts two hours.
- A slot is temporarily held for 15 minutes after selection.
- MySQL is the source of truth for availability. A unique slot key prevents two active appointments from owning the same therapist and start time.
- Memcached is only for read-heavy catalogue data; it must never decide whether an appointment slot is available.
- The email outbox is written in the same MySQL transaction as appointment confirmation. Background processes publish outbox events to Amazon MQ, and a consumer sends the confirmation email.

## Simulated appointment payment

This portfolio project does not use a real payment gateway. The appointment payment page accepts dummy card details after checking their format: cardholder name, 16 digits, a valid future `MM/YY` expiry, and a 3-digit CVV. Any dummy 16-digit number is accepted; there is no bank authorization or real charge. Card fields are validated in React and are never sent to Flask, stored in MySQL, logged, or published to RabbitMQ. The backend receives only the appointment ID and records a simulated result.

This is a portfolio demonstration, not a real payment implementation.
