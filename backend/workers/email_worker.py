
"""Run separately: python -m workers.email_worker"""

import json
import logging
import os
import smtplib

from email.message import EmailMessage

from dotenv import load_dotenv

load_dotenv()

import pika

from rabbitmq_service import (
    connection_parameters,
    QUEUE_NAME,
    rabbitmq_enabled,
)

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO")
)

logger = logging.getLogger("booking-email-worker")


def send_confirmation(payload):
    """Send appointment confirmation email using SMTP."""

    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))

    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")

    sender = os.getenv("SMTP_FROM", smtp_user or "")

    use_tls = os.getenv(
        "SMTP_USE_TLS", "true"
    ).lower() in {"1", "true", "yes"}

    if not smtp_host or not sender:
        raise RuntimeError(
            "SMTP_HOST and SMTP_FROM must be configured"
        )

    message = EmailMessage()

    message["Subject"] = (
        f"Appointment confirmed - {payload['service_name']}"
    )

    message["From"] = sender
    message["To"] = payload["to"]

    message.set_content(
        f"Hello {payload['customer_name']},\n\n"
        f"Your appointment is confirmed.\n\n"
        f"Service: {payload['service_name']}\n"
        f"Therapist: {payload['therapist_name']}\n"
        f"Start: {payload['starts_at']} (Asia/Colombo)\n"
        f"End: {payload['ends_at']} (Asia/Colombo)\n"
        f"Amount paid: {payload['currency']} {payload['amount']}\n"
        f"Booking reference: {payload['appointment_id']}\n\n"
        "Thank you for booking with us."
    )

    with smtplib.SMTP(
        smtp_host,
        smtp_port,
        timeout=20
    ) as server:

        if use_tls:
            server.starttls()

        if smtp_user and smtp_password:
            server.login(
                smtp_user,
                smtp_password
            )

        server.send_message(message)


def main():
    """Start the RabbitMQ email consumer."""

    if not rabbitmq_enabled():
        logger.info(
            "RabbitMQ is disabled. Email worker will not start."
        )
        return

    connection = pika.BlockingConnection(
        connection_parameters()
    )

    channel = connection.channel()

    channel.queue_declare(
        queue=QUEUE_NAME,
        durable=True
    )

    channel.basic_qos(prefetch_count=1)

    def callback(ch, method, properties, body):

        try:
            payload = json.loads(
                body.decode("utf-8")
            )

            send_confirmation(payload)

            ch.basic_ack(
                delivery_tag=method.delivery_tag
            )

            logger.info(
                "Sent appointment email for booking %s",
                payload.get("appointment_id")
            )

        except Exception:
            logger.exception(
                "Email delivery failed; message will be requeued"
            )

            ch.basic_nack(
                delivery_tag=method.delivery_tag,
                requeue=True
            )

    channel.basic_consume(
        queue=QUEUE_NAME,
        on_message_callback=callback
    )

    logger.info(
        "Waiting for messages on %s",
        QUEUE_NAME
    )

    try:
        channel.start_consuming()

    finally:
        if connection.is_open:
            connection.close()


if __name__ == "__main__":
    main()
