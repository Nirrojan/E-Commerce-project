"""Publish committed email-outbox rows to RabbitMQ.

Run separately from Gunicorn:
    python -m workers.outbox_publisher
"""

import logging
import os
import time
from datetime import datetime

from dotenv import load_dotenv

# Load environment variables before importing Flask or RabbitMQ settings.
load_dotenv()

from app import app
from extensions import db
from models import EmailOutbox
from rabbitmq_service import publish_email_event, rabbitmq_enabled

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger("email-outbox-publisher")


def publish_pending():
    """Publish pending appointment and product-order email events."""
    if not rabbitmq_enabled():
        logger.info("RabbitMQ is disabled. Skipping outbox publishing.")
        return 0

    with app.app_context():
        rows = (
            EmailOutbox.query
            .filter_by(status="pending")
            .order_by(EmailOutbox.id.asc())
            .with_for_update(skip_locked=True)
            .limit(50)
            .all()
        )

        published = 0

        for row in rows:
            payload = dict(row.payload or {})
            payload.setdefault("event_type", row.event_type)

            if publish_email_event(payload):
                row.status = "published"
                row.published_at = datetime.utcnow()
                row.last_error = None
                published += 1
            else:
                row.attempts += 1
                row.last_error = "RabbitMQ publish failed"

        db.session.commit()
        return published


def main():
    """Continuously publish pending outbox events."""
    if not rabbitmq_enabled():
        logger.info("RabbitMQ is disabled. Outbox publisher will not start.")
        return

    delay = max(1, int(os.getenv("EMAIL_OUTBOX_POLL_SECONDS", "5")))
    logger.info("Email outbox publisher started")

    while True:
        try:
            count = publish_pending()
            if count:
                logger.info("Published %s email events", count)
        except Exception:
            db.session.rollback()
            logger.exception("Outbox publishing cycle failed")

        time.sleep(delay)


if __name__ == "__main__":
    main()
