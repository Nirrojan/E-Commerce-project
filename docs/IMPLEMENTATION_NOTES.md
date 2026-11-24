# Implementation notes

- Appointment payment is simulated for portfolio demonstration. No real payment gateway or card authorization is used.
- The React page checks cardholder name, 16-digit card number, future MM/YY expiry and 3-digit CVV format. Card data is never sent to Flask or stored.
- Product/service prices and therapist profiles in the seed SQL are demo data.
- Each bookable slot is two hours and is held for 15 minutes during checkout.
- MySQL is the authoritative double-booking guard. Memcached is only used for catalogue/profile data.
- Appointment confirmation writes an email event to the MySQL outbox. The Elastic Beanstalk `outbox` process publishes to Amazon MQ; the `email_worker` process consumes messages and sends email through the configured SMTP provider.
- The AWS version uses managed ElastiCache and Amazon MQ. It does not use Docker Compose or local systemd service files.

## Before end-to-end testing

1. Run the SQL migration and optional demo seed against RDS after taking a backup.
2. Configure the Elastic Beanstalk environment properties for RDS, ElastiCache, Amazon MQ, JWT and SMTP.
3. Deploy the backend bundle to Elastic Beanstalk.
4. Deploy the React build to private S3 and configure CloudFront behaviors for S3 and `/api/*`.
5. Test product/service caching, appointment holds, outbox publishing and email delivery.

## Validation status

- Python source files passed syntax compilation in the prepared workspace.
- Full dependency installation, live AWS connectivity and end-to-end deployment have not been performed.
- Run `npm ci` and `npm run build` locally before uploading the frontend.
- Test SQL migration on a backup/staging database before running it on your main database.
