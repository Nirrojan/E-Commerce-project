# Booking and AWS messaging flow

```mermaid
flowchart TD
    A[Customer selects service] --> B[Choose therapist]
    B --> C[View therapist profile]
    C --> D[Request dates and available slots]
    D --> E[Flask checks MySQL schedule and appointments]
    E --> F[Customer selects a two-hour slot]
    F --> G[MySQL creates temporary hold with unique slot key]
    G --> H[Customer enters dummy card details in React]
    H --> I{Browser validation passes?}
    I -- No --> J[Show validation errors]
    I -- Yes --> K[React sends appointment ID only]
    K --> L[Backend verifies hold and records simulated payment]
    L --> M[Confirm appointment in MySQL]
    M --> N[Write email event to MySQL outbox]
    N --> O[Elastic Beanstalk outbox process publishes to Amazon MQ]
    O --> P[Elastic Beanstalk email worker consumes message]
    P --> Q[SMTP provider sends confirmation]
```

The card number, expiry and CVV are validated in the browser only. They are never sent to Flask, stored in MySQL, logged or published to RabbitMQ. This is a portfolio simulation: no bank, card network or payment provider is contacted and no money is charged.

Memcached caches products, categories, services and therapist catalogue/profile data. It does not reserve appointment slots and is never the authority for availability or payment success. RDS MySQL remains authoritative.

The outbox publisher and queue consumer are separate Elastic Beanstalk Procfile processes. RabbitMQ messages are persistent. Delivery is at-least-once, so downstream email handling should be made idempotent before adapting this design for a high-volume production system.
