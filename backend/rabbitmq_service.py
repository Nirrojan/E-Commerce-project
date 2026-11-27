"""Publisher for Amazon MQ for RabbitMQ (AMQPS/TLS) or local RabbitMQ."""

import json
import logging
import os
import ssl

import pika

logger = logging.getLogger(__name__)

QUEUE_NAME = os.getenv("RABBITMQ_EMAIL_QUEUE", "booking_emails")


def rabbitmq_enabled():
    """Return whether RabbitMQ integration is enabled."""
    return os.getenv("RABBITMQ_ENABLED", "false").lower() in {
        "1", "true", "yes"
    }


def connection_parameters():
    """Create RabbitMQ connection parameters."""
    if not rabbitmq_enabled():
        raise RuntimeError("RabbitMQ is disabled")

    host = os.getenv("RABBITMQ_HOST")
    if not host:
        raise RuntimeError("RABBITMQ_HOST is not configured")

    port = int(os.getenv("RABBITMQ_PORT", "5671"))
    username = os.getenv("RABBITMQ_USER", "")
    password = os.getenv("RABBITMQ_PASSWORD", "")
    virtual_host = os.getenv("RABBITMQ_VHOST", "/")

    tls_enabled = os.getenv(
        "RABBITMQ_TLS", "true"
    ).lower() in {"1", "true", "yes"}

    credentials = pika.PlainCredentials(username, password)
    ssl_options = None

    if tls_enabled:
        context = ssl.create_default_context()
        ssl_options = pika.SSLOptions(context, host)

    return pika.ConnectionParameters(
        host=host,
        port=port,
        virtual_host=virtual_host,
        credentials=credentials,
        ssl_options=ssl_options,
        heartbeat=60,
        blocked_connection_timeout=30,
        connection_attempts=3,
        retry_delay=3,
        socket_timeout=10,
    )


def publish_email_event(payload):
    """Publish any supported email event to the durable email queue."""
    if not rabbitmq_enabled():
        logger.info("RabbitMQ is disabled. Skipping email publishing.")
        return False

    if not isinstance(payload, dict):
        logger.error("Email payload must be a dictionary")
        return False

    connection = None
    try:
        connection = pika.BlockingConnection(connection_parameters())
        channel = connection.channel()
        channel.confirm_delivery()

        channel.queue_declare(
            queue=QUEUE_NAME,
            durable=True,
        )

        channel.basic_publish(
            exchange="",
            routing_key=QUEUE_NAME,
            body=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
            properties=pika.BasicProperties(
                delivery_mode=2,
                content_type="application/json",
            ),
            mandatory=True,
        )

        logger.info(
            "Published email event type=%s",
            payload.get("type") or payload.get("event_type"),
        )
        return True

    except Exception:
        logger.exception("Could not publish email event to RabbitMQ")
        return False

    finally:
        if connection and connection.is_open:
            connection.close()


# Backwards-compatible name for existing imports.
publish_booking_email = publish_email_event
