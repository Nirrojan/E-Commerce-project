"""RabbitMQ consumer that sends appointment and product emails through Amazon SES.

Run from the backend directory:
    python -m workers.email_worker

AWS credentials are resolved through the standard boto3 credential chain.
On EC2/Elastic Beanstalk, use an instance profile; do not put AWS keys in .env.
"""

import html
import json
import logging
import os
import boto3
import pika
from dotenv import load_dotenv

load_dotenv()

from rabbitmq_service import (
    QUEUE_NAME,
    connection_parameters,
    rabbitmq_enabled,
)

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger("email-worker")

RETRY_QUEUE = f"{QUEUE_NAME}.retry"
DEAD_LETTER_QUEUE = f"{QUEUE_NAME}.dead"
MAX_RETRIES = max(0, int(os.getenv("EMAIL_MAX_RETRIES", "5")))
RETRY_DELAY_MS = max(1000, int(os.getenv("EMAIL_RETRY_DELAY_MS", "60000")))

_ses_client = None


class PermanentMessageError(Exception):
    """A message is invalid and should not be retried."""


def get_ses_client():
    """Create the SES client using the normal AWS credential provider chain."""
    global _ses_client

    if _ses_client is None:
        region = (
            os.getenv("AWS_REGION")
            or os.getenv("AWS_DEFAULT_REGION")
            or "us-east-1"
        )
        _ses_client = boto3.client("ses", region_name=region)

    return _ses_client


def _required(payload, fields):
    missing = [
        field for field in fields
        if field not in payload or payload[field] is None or payload[field] == ""
    ]
    if missing:
        raise PermanentMessageError(
            "Missing required email fields: " + ", ".join(missing)
        )


def _appointment_content(payload):
    _required(payload, [
        "to", "customer_name", "service_name", "therapist_name",
        "starts_at", "ends_at", "amount", "currency", "appointment_id",
    ])

    subject = f"Appointment confirmed - {payload['service_name']}"
    text_body = (
        f"Hello {payload['customer_name']},\n\n"
        "Your appointment has been confirmed.\n\n"
        f"Service: {payload['service_name']}\n"
        f"Therapist: {payload['therapist_name']}\n"
        f"Start: {payload['starts_at']} (Asia/Colombo)\n"
        f"End: {payload['ends_at']} (Asia/Colombo)\n"
        f"Appointment amount: {payload['currency']} {payload['amount']}\n"
        f"Booking reference: {payload['appointment_id']}\n\n"
        "Payment notice: This was a simulated portfolio transaction. "
        "No money was charged.\n\n"
        "Thank you for booking with us."
    )

    safe = {key: html.escape(str(payload[key])) for key in (
        "customer_name", "service_name", "therapist_name",
        "starts_at", "ends_at", "amount", "currency", "appointment_id",
    )}
    html_body = f"""<!doctype html>
<html><body>
  <p>Hello {safe['customer_name']},</p>
  <p>Your appointment has been confirmed.</p>
  <ul>
    <li><strong>Service:</strong> {safe['service_name']}</li>
    <li><strong>Therapist:</strong> {safe['therapist_name']}</li>
    <li><strong>Start:</strong> {safe['starts_at']} (Asia/Colombo)</li>
    <li><strong>End:</strong> {safe['ends_at']} (Asia/Colombo)</li>
    <li><strong>Appointment amount:</strong> {safe['currency']} {safe['amount']}</li>
    <li><strong>Booking reference:</strong> {safe['appointment_id']}</li>
  </ul>
  <p><strong>Simulated transaction:</strong> No money was charged.</p>
  <p>Thank you for booking with us.</p>
</body></html>"""
    return subject, text_body, html_body


def _product_order_content(payload):
    _required(payload, [
        "to", "customer_name", "order_id", "items", "total_amount",
        "currency", "shipping_address", "transaction_reference",
    ])

    items = payload["items"]
    if not isinstance(items, list) or not items:
        raise PermanentMessageError("Product order email has no valid items")

    text_lines = [
        f"Hello {payload['customer_name']},",
        "",
        f"Your order #{payload['order_id']} has been confirmed.",
        "",
        "Order items:",
    ]
    html_items = []

    for item in items:
        if not isinstance(item, dict):
            raise PermanentMessageError("Invalid product item in email payload")
        for field in ("product_name", "quantity", "unit_price", "line_total"):
            if field not in item:
                raise PermanentMessageError(
                    f"Product item is missing {field}"
                )

        name = str(item["product_name"])
        quantity = int(item["quantity"])
        if quantity < 1:
            raise PermanentMessageError("Product quantity must be positive")

        text_lines.append(
            f"- {name} x {quantity} | "
            f"{payload['currency']} {item['unit_price']} each | "
            f"Line total: {payload['currency']} {item['line_total']}"
        )
        html_items.append(
            "<tr>"
            f"<td>{html.escape(name)}</td>"
            f"<td>{quantity}</td>"
            f"<td>{html.escape(str(payload['currency']))} "
            f"{html.escape(str(item['unit_price']))}</td>"
            f"<td>{html.escape(str(payload['currency']))} "
            f"{html.escape(str(item['line_total']))}</td>"
            "</tr>"
        )

    status = str(payload.get("order_status", "Confirmed (Simulation)"))
    address = str(payload["shipping_address"])
    text_lines.extend([
        "",
        f"Order total: {payload['currency']} {payload['total_amount']}",
        f"Delivery address: {address}",
        f"Order status: {status}",
        f"Transaction reference: {payload['transaction_reference']}",
        "",
        "Payment notice: This was a simulated portfolio transaction. "
        "No money was charged.",
        "",
        "Thank you for shopping with us.",
    ])

    safe_name = html.escape(str(payload["customer_name"]))
    safe_currency = html.escape(str(payload["currency"]))
    safe_total = html.escape(str(payload["total_amount"]))
    safe_address = html.escape(address).replace("\n", "<br>")
    safe_status = html.escape(status)
    safe_order_id = html.escape(str(payload["order_id"]))
    safe_reference = html.escape(str(payload["transaction_reference"]))

    html_body = f"""<!doctype html>
<html><body>
  <p>Hello {safe_name},</p>
  <p>Your order <strong>#{safe_order_id}</strong> has been confirmed.</p>
  <h3>Order items</h3>
  <table border="1" cellpadding="6" cellspacing="0">
    <thead><tr><th>Product</th><th>Quantity</th><th>Unit price</th><th>Line total</th></tr></thead>
    <tbody>{''.join(html_items)}</tbody>
  </table>
  <p><strong>Order total:</strong> {safe_currency} {safe_total}</p>
  <p><strong>Delivery address:</strong><br>{safe_address}</p>
  <p><strong>Order status:</strong> {safe_status}</p>
  <p><strong>Transaction reference:</strong> {safe_reference}</p>
  <p><strong>Simulated transaction:</strong> No money was charged.</p>
  <p>Thank you for shopping with us.</p>
</body></html>"""

    return (
        f"Order confirmed - #{payload['order_id']}",
        "\n".join(text_lines),
        html_body,
    )


def build_email(payload):
    """Validate an event and return (recipient, subject, text, html)."""
    if not isinstance(payload, dict):
        raise PermanentMessageError("Email event must be a JSON object")

    event_type = payload.get("type") or payload.get("event_type")

    if event_type == "appointment_confirmation":
        subject, text_body, html_body = _appointment_content(payload)
    elif event_type == "product_order_confirmation":
        subject, text_body, html_body = _product_order_content(payload)
    else:
        raise PermanentMessageError(
            f"Unsupported email event type: {event_type!r}"
        )

    recipient = str(payload["to"]).strip()
    if "@" not in recipient or len(recipient) > 320:
        raise PermanentMessageError("Invalid recipient email address")

    return recipient, subject, text_body, html_body


def send_confirmation(payload):
    """Send one appointment or product-order confirmation using Amazon SES."""
    sender = os.getenv("SES_FROM_EMAIL", "").strip()
    if not sender:
        raise RuntimeError("SES_FROM_EMAIL is not configured")

    recipient, subject, text_body, html_body = build_email(payload)

    response = get_ses_client().send_email(
        Source=sender,
        Destination={"ToAddresses": [recipient]},
        Message={
            "Subject": {"Data": subject, "Charset": "UTF-8"},
            "Body": {
                "Text": {"Data": text_body, "Charset": "UTF-8"},
                "Html": {"Data": html_body, "Charset": "UTF-8"},
            },
        },
    )
    return response.get("MessageId")


def declare_queues(channel):
    """Declare durable main, delayed-retry and dead-letter queues."""
    channel.queue_declare(queue=QUEUE_NAME, durable=True)
    channel.queue_declare(
        queue=RETRY_QUEUE,
        durable=True,
        arguments={
            "x-message-ttl": RETRY_DELAY_MS,
            "x-dead-letter-exchange": "",
            "x-dead-letter-routing-key": QUEUE_NAME,
        },
    )
    channel.queue_declare(queue=DEAD_LETTER_QUEUE, durable=True)


def _republish(channel, routing_key, body, properties, headers):
    """Publish with broker confirmation before acknowledging the original."""
    channel.basic_publish(
        exchange="",
        routing_key=routing_key,
        body=body,
        properties=pika.BasicProperties(
            content_type="application/json",
            delivery_mode=2,
            headers=headers,
            message_id=getattr(properties, "message_id", None),
            correlation_id=getattr(properties, "correlation_id", None),
        ),
        mandatory=True,
    )


def _route_failed_message(channel, method, properties, body, error, permanent=False):
    headers = dict(getattr(properties, "headers", None) or {})
    retry_count = int(headers.get("x-retry-count", 0))

    if permanent:
        target_queue = DEAD_LETTER_QUEUE
        headers["x-failure-reason"] = str(error)[:500]
        logger.error("Invalid email event sent to dead-letter queue: %s", error)

    elif retry_count < MAX_RETRIES:
        retry_count += 1
        headers["x-retry-count"] = retry_count
        target_queue = RETRY_QUEUE
        logger.warning(
            "Email delivery failed; scheduling retry %s of %s",
            retry_count,
            MAX_RETRIES,
        )

    else:
        target_queue = DEAD_LETTER_QUEUE
        headers["x-failure-reason"] = str(error)[:500]
        logger.error(
            "Email event exceeded %s retries; moved to dead-letter queue",
            MAX_RETRIES,
        )

    _republish(channel, target_queue, body, properties, headers)
    channel.basic_ack(delivery_tag=method.delivery_tag)


def main():
    """Start the RabbitMQ email consumer."""
    if not rabbitmq_enabled():
        logger.info("RabbitMQ is disabled. Email worker will not start.")
        return

    connection = pika.BlockingConnection(connection_parameters())
    channel = connection.channel()

    # Publisher confirms ensure retry/DLQ copies reach RabbitMQ before acking
    # the original delivery.
    channel.confirm_delivery()
    declare_queues(channel)
    channel.basic_qos(prefetch_count=1)

    def callback(ch, method, properties, body):
        try:
            try:
                payload = json.loads(body.decode("utf-8"))
            except (UnicodeDecodeError, json.JSONDecodeError) as exc:
                raise PermanentMessageError("Message is not valid UTF-8 JSON") from exc

            message_id = send_confirmation(payload)
            event_type = payload.get("type") or payload.get("event_type")

            ch.basic_ack(delivery_tag=method.delivery_tag)
            logger.info(
                "Email sent successfully; event_type=%s ses_message_id=%s",
                event_type,
                message_id,
            )

        except PermanentMessageError as exc:
            try:
                _route_failed_message(
                    ch, method, properties, body, exc, permanent=True
                )
            except Exception:
                logger.exception("Could not move invalid email event to DLQ")
                ch.basic_nack(
                    delivery_tag=method.delivery_tag,
                    requeue=True,
                )

        except Exception as exc:
            # SES/network failures are retried with a delay, then sent to DLQ.
            logger.exception("Email delivery failed")
            try:
                _route_failed_message(
                    ch, method, properties, body, exc, permanent=False
                )
            except Exception:
                logger.exception("Could not schedule email retry")
                ch.basic_nack(
                    delivery_tag=method.delivery_tag,
                    requeue=True,
                )

    channel.basic_consume(
        queue=QUEUE_NAME,
        on_message_callback=callback,
    )

    logger.info(
        "Email worker listening on %s; retry queue=%s; dead-letter queue=%s",
        QUEUE_NAME,
        RETRY_QUEUE,
        DEAD_LETTER_QUEUE,
    )

    try:
        channel.start_consuming()
    finally:
        if connection.is_open:
            connection.close()


if __name__ == "__main__":
    main()
