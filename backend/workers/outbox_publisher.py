
"""Publish committed email-outbox rows to RabbitMQ.

Run separately from Gunicorn:
python -m workers.outbox_publisher
"""

import logging
import os
import time

from datetime import datetime

from dotenv import load_dotenv

# Load environment variables before importing Flask.
load_dotenv()

from app import app
from extensions import db
from models import EmailOutbox

from rabbitmq_service import (
    publish_booking_email,
    rabbitmq_enabled,
)

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO")
)

logger = logging.getLogger("email-outbox-publisher")


def publish_pending():
    """Publish pending email events."""

    if not rabbitmq_enabled():
        logger.info(
            "RabbitMQ is disabled. Skipping outbox publishing."
        )
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

            if publish_booking_email(row.payload):

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
    """Start the email outbox publisher."""

    if not rabbitmq_enabled():
        logger.info(
            "RabbitMQ is disabled. Outbox publisher will not start."
        )
        return

    delay = int(
        os.getenv("EMAIL_OUTBOX_POLL_SECONDS", "5")
    )

    logger.info("Outbox publisher started")

    while True:

        try:
            published = publish_pending()

            if published:
                logger.info(
                    "Published %s email events",
                    published
                )

        except Exception:
            logger.exception(
                "Outbox publishing cycle failed"
            )

        time.sleep(delay)


if __name__ == "__main__":
    main()
