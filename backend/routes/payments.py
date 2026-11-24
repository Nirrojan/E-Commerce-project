
"""Portfolio-only simulated appointment payments.

This module deliberately has no connection to a payment gateway.
Card fields are validated in the browser and are never sent to this API,
logged, or stored.
"""

import uuid
from decimal import Decimal

from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required
from sqlalchemy.exc import IntegrityError

from extensions import db

from models import (
    Appointment,
    AppointmentPayment,
    EmailOutbox,
    Notification,
)

from routes.appointments import local_now


payments_bp = Blueprint("payments", __name__)


# ==========================================
# SIMULATE APPOINTMENT PAYMENT
# ==========================================

@payments_bp.post("/appointments/<int:appointment_id>/simulate")
@jwt_required()
def simulate_appointment_payment(appointment_id):

    user_id = int(get_jwt_identity())

    # Lock appointment to prevent duplicate payment confirmation.
    appointment = (
        Appointment.query
        .filter_by(
            id=appointment_id,
            user_id=user_id
        )
        .with_for_update()
        .first()
    )

    if appointment is None:
        return jsonify({
            "error": "Appointment not found"
        }), 404

    if appointment.status == "confirmed" and appointment.payment:
        return jsonify({
            "message": "This appointment has already been confirmed.",
            "appointment_id": appointment.id,
            "payment_status": appointment.payment.status,
        }), 200

    if appointment.status != "held":
        return jsonify({
            "error": (
                "This appointment is no longer held. "
                "Please select another slot."
            )
        }), 409

    now = local_now()

    if (
        not appointment.hold_expires_at
        or appointment.hold_expires_at <= now
    ):
        appointment.status = "expired"
        appointment.slot_key = None
        db.session.commit()

        return jsonify({
            "error": (
                "Your 15-minute slot hold has expired. "
                "Please select another slot."
            )
        }), 409

    # Card details are never received by this API.
    amount = Decimal(
        str(appointment.service.price)
    ).quantize(Decimal("0.01"))

    payment = appointment.payment

    if payment is None:

        payment = AppointmentPayment(
            appointment_id=appointment.id,
            provider="demo",
            order_id=(
                f"DEMO-APT-{appointment.id}-"
                f"{uuid.uuid4().hex[:10].upper()}"
            ),
            amount=amount,
            currency="LKR",
            status="success",
            provider_payment_id=(
                f"DEMO-{uuid.uuid4().hex.upper()}"
            ),
            method="demo_card",
            status_message=(
                "Simulated portfolio payment; no money was charged."
            ),
        )

        db.session.add(payment)

    else:

        payment.provider = "demo"

        payment.order_id = (
            f"DEMO-APT-{appointment.id}-"
            f"{uuid.uuid4().hex[:10].upper()}"
        )

        payment.provider_payment_id = (
            f"DEMO-{uuid.uuid4().hex.upper()}"
        )

        payment.amount = amount
        payment.currency = "LKR"
        payment.status = "success"
        payment.method = "demo_card"

        payment.status_message = (
            "Simulated portfolio payment; no money was charged."
        )

    # Confirm appointment.
    appointment.status = "confirmed"
    appointment.confirmed_at = now
    appointment.hold_expires_at = None

    # Create email notification event.
    db.session.add(
        EmailOutbox(
            event_type="appointment_confirmation",
            payload={
                "type": "appointment_confirmation",
                "to": appointment.user.email,
                "customer_name": appointment.user.name,
                "service_name": appointment.service.name,
                "therapist_name": appointment.therapist.name,
                "starts_at": appointment.starts_at.isoformat(),
                "ends_at": appointment.ends_at.isoformat(),
                "amount": f"{amount:.2f}",
                "currency": "LKR",
                "appointment_id": appointment.id,
                "payment_mode": "simulated_demo",
            },
        )
    )

    # Create in-app notification.
    db.session.add(
        Notification(
            user_id=user_id,
            title="Appointment confirmed",
            message=(
                f"Your {appointment.service.name} appointment "
                f"with {appointment.therapist.name} has been confirmed. "
                f"Appointment date: "
                f"{appointment.starts_at.strftime('%d %B %Y, %I:%M %p')}."
            ),
            type="appointment_confirmed",
            is_read=False,
        )
    )

    try:
        db.session.commit()

    except IntegrityError:
        db.session.rollback()

        return jsonify({
            "error": (
                "This appointment slot is no longer available. "
                "Please choose another time."
            )
        }), 409

    except Exception:
        db.session.rollback()
        raise

    return jsonify({
        "message": (
            "Demo payment successful. No money was charged."
        ),
        "appointment_id": appointment.id,
        "payment_status": "success",
        "appointment_status": "confirmed",
        "transaction_reference": payment.order_id,
        "amount": float(amount),
        "currency": "LKR",
    }), 200
