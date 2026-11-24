
from calendar import monthrange
from datetime import date, datetime, time, timedelta
from decimal import Decimal, ROUND_HALF_UP
from zoneinfo import ZoneInfo

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from sqlalchemy.exc import IntegrityError

from extensions import db
from models import (
    Appointment,
    AppointmentPayment,
    Notification,
    Service,
    Therapist,
    TherapistSchedule,
    TherapistScheduleException,
)

appointments_bp = Blueprint("appointments", __name__)

LOCAL_TZ = ZoneInfo("Asia/Colombo")
SLOT_HOURS = 2
HOLD_MINUTES = 15
CANCELLATION_HOURS = 24
REFUND_PERCENTAGE = Decimal("0.75")


def local_now():
    return datetime.now(LOCAL_TZ).replace(tzinfo=None)


def _slot_key(therapist_id, starts_at):
    return f"{therapist_id}:{starts_at.strftime('%Y%m%d%H%M%S')}"


def _expire_old_holds(therapist_id=None):
    now = local_now()

    query = Appointment.query.filter(
        Appointment.status == "held",
        Appointment.hold_expires_at <= now,
    )

    if therapist_id is not None:
        query = query.filter(
            Appointment.therapist_id == therapist_id
        )

    expired = query.all()

    for appointment in expired:
        appointment.status = "expired"
        appointment.slot_key = None

    if expired:
        db.session.commit()


def _working_windows(therapist_id, target_date):
    exception = TherapistScheduleException.query.filter_by(
        therapist_id=therapist_id,
        exception_date=target_date,
    ).first()

    if exception:
        if (
            exception.is_closed
            or not exception.start_time
            or not exception.end_time
        ):
            return []

        return [(exception.start_time, exception.end_time)]

    schedules = TherapistSchedule.query.filter_by(
        therapist_id=therapist_id,
        day_of_week=target_date.weekday(),
        is_active=True,
    ).order_by(
        TherapistSchedule.start_time.asc()
    ).all()

    return [
        (item.start_time, item.end_time)
        for item in schedules
    ]


def _scheduled_slots(therapist_id, target_date):
    slots = []

    for start_time, end_time in _working_windows(
        therapist_id,
        target_date
    ):
        cursor = datetime.combine(target_date, start_time)
        closing = datetime.combine(target_date, end_time)

        while cursor + timedelta(hours=SLOT_HOURS) <= closing:
            slots.append(cursor)
            cursor += timedelta(hours=SLOT_HOURS)

    return slots


def _therapist_can_perform(therapist_id, service_id):
    therapist = Therapist.query.filter_by(
        id=therapist_id,
        is_active=True
    ).first()

    service = Service.query.filter_by(
        id=service_id,
        is_active=True
    ).first()

    if not therapist or not service:
        return False

    return any(
        item.id == service_id
        for item in therapist.services
    )


# ==========================================
# CHECK AVAILABLE APPOINTMENT DATES
# ==========================================

@appointments_bp.get("/availability")
def get_availability():
    try:
        service_id = int(request.args.get("service_id", ""))
        therapist_id = int(request.args.get("therapist_id", ""))

        month_text = request.args.get("month", "")
        year, month = [
            int(part) for part in month_text.split("-")
        ]

        first_day = date(year, month, 1)
        last_day = date(
            year,
            month,
            monthrange(year, month)[1]
        )

    except (TypeError, ValueError):
        return jsonify({
            "error": "Provide service_id, therapist_id and month=YYYY-MM"
        }), 400

    if not _therapist_can_perform(therapist_id, service_id):
        return jsonify({
            "error": "Therapist does not provide this service"
        }), 404

    service = Service.query.filter_by(
        id=service_id,
        is_active=True
    ).first()

    if service is None or service.price is None or service.price <= 0:
        return jsonify({
            "error": "This service needs a valid price before appointments can be booked"
        }), 400

    _expire_old_holds(therapist_id)

    now = local_now()
    days = []

    current = first_day

    while current <= last_day:
        starts = _scheduled_slots(therapist_id, current)

        if starts:
            busy = Appointment.query.filter(
                Appointment.therapist_id == therapist_id,
                Appointment.starts_at >= datetime.combine(
                    current,
                    time.min
                ),
                Appointment.starts_at < datetime.combine(
                    current + timedelta(days=1),
                    time.min
                ),
                Appointment.status.in_(["held", "confirmed"]),
            ).all()

            busy_starts = {
                item.starts_at
                for item in busy
                if (
                    item.status == "confirmed"
                    or (
                        item.status == "held"
                        and item.hold_expires_at
                        and item.hold_expires_at > now
                    )
                )
            }

            available = [
                start
                for start in starts
                if start > now and start not in busy_starts
            ]

            if available:
                days.append({
                    "date": current.isoformat(),
                    "slots": [
                        {
                            "starts_at": start.isoformat(),
                            "ends_at": (
                                start + timedelta(hours=SLOT_HOURS)
                            ).isoformat(),
                            "label": (
                                f"{start.strftime('%I:%M %p')} - "
                                f"{(start + timedelta(hours=SLOT_HOURS)).strftime('%I:%M %p')}"
                            ),
                        }
                        for start in available
                    ],
                })

        current += timedelta(days=1)

    return jsonify({
        "timezone": "Asia/Colombo",
        "slot_duration_hours": SLOT_HOURS,
        "month": month_text,
        "available_dates": days,
    })


# ==========================================
# CREATE TEMPORARY APPOINTMENT HOLD
# ==========================================

@appointments_bp.post("/holds")
@jwt_required()
def create_appointment_hold():
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}

    try:
        service_id = int(data["service_id"])
        therapist_id = int(data["therapist_id"])
        starts_at = datetime.fromisoformat(data["starts_at"])

    except (KeyError, TypeError, ValueError):
        return jsonify({
            "error": "Invalid service, therapist or appointment time"
        }), 400

    if starts_at.tzinfo is not None:
        starts_at = starts_at.astimezone(
            LOCAL_TZ
        ).replace(tzinfo=None)

    now = local_now()

    if starts_at <= now:
        return jsonify({
            "error": "Please choose a future appointment time"
        }), 400

    if not _therapist_can_perform(therapist_id, service_id):
        return jsonify({
            "error": "Therapist does not provide this service"
        }), 400

    service = Service.query.filter_by(
        id=service_id,
        is_active=True
    ).first()

    if service is None or service.price is None or service.price <= 0:
        return jsonify({
            "error": "This service needs a valid price before appointments can be booked"
        }), 400

    if starts_at not in _scheduled_slots(
        therapist_id,
        starts_at.date()
    ):
        return jsonify({
            "error": "That time is not in the therapist's schedule"
        }), 400

    _expire_old_holds(therapist_id)

    appointment = Appointment(
        user_id=user_id,
        service_id=service_id,
        therapist_id=therapist_id,
        starts_at=starts_at,
        ends_at=starts_at + timedelta(hours=SLOT_HOURS),
        status="held",
        slot_key=_slot_key(therapist_id, starts_at),
        hold_expires_at=now + timedelta(minutes=HOLD_MINUTES),
    )

    try:
        db.session.add(appointment)
        db.session.commit()

    except IntegrityError:
        db.session.rollback()

        return jsonify({
            "error": "That appointment slot has just been booked by someone else. Please choose another time."
        }), 409

    except Exception:
        db.session.rollback()
        raise

    return jsonify({
        "message": "Appointment slot temporarily reserved",
        "appointment": appointment.to_dict(),
        "hold_minutes": HOLD_MINUTES,
    }), 201


# ==========================================
# GET CUSTOMER APPOINTMENTS WITH PAYMENT INFO
# ==========================================

@appointments_bp.get("/mine")
@jwt_required()
def my_appointments():
    user_id = int(get_jwt_identity())

    appointments = Appointment.query.filter_by(
        user_id=user_id
    ).order_by(
        Appointment.starts_at.asc()
    ).all()

    result = []

    for item in appointments:
        payment = item.payment

        appointment_data = item.to_dict()

        appointment_data["payment"] = {
            "status": payment.status,
            "amount": float(payment.amount),
            "currency": payment.currency,
            "refund_amount": (
                float(payment.refund_amount)
                if payment.refund_amount is not None
                else None
            ),
            "refund_status": payment.refund_status,
        } if payment else None

        result.append(appointment_data)

    return jsonify({
        "appointments": result
    }), 200


# ==========================================
# GET ONE CUSTOMER APPOINTMENT
# ==========================================

@appointments_bp.get("/<int:appointment_id>")
@jwt_required()
def get_my_appointment(appointment_id):
    user_id = int(get_jwt_identity())

    appointment = Appointment.query.filter_by(
        id=appointment_id,
        user_id=user_id
    ).first()

    if not appointment:
        return jsonify({
            "error": "Appointment not found"
        }), 404

    payment = appointment.payment

    return jsonify({
        "appointment": appointment.to_dict(),
        "payment": {
            "status": payment.status,
            "amount": float(payment.amount),
            "currency": payment.currency,
            "refund_amount": (
                float(payment.refund_amount)
                if payment.refund_amount is not None
                else None
            ),
            "refund_status": payment.refund_status,
        } if payment else None,
    })


# ==========================================
# CANCEL APPOINTMENT AND REQUEST REFUND
# ==========================================

@appointments_bp.post("/<int:appointment_id>/cancel")
@jwt_required()
def cancel_appointment(appointment_id):
    user_id = int(get_jwt_identity())
    now = local_now()

    try:
        appointment = Appointment.query.filter_by(
            id=appointment_id,
            user_id=user_id
        ).with_for_update().first()

        if not appointment:
            return jsonify({
                "error": "Appointment not found"
            }), 404

        if appointment.status == "cancelled":
            return jsonify({
                "error": "This appointment has already been cancelled"
            }), 409

        if appointment.status != "confirmed":
            return jsonify({
                "error": "Only confirmed appointments can be cancelled"
            }), 400

        remaining_time = appointment.starts_at - now

        if remaining_time <= timedelta(hours=CANCELLATION_HOURS):
            return jsonify({
                "error": "Cancellation is only allowed more than 24 hours before your appointment."
            }), 400

        payment = AppointmentPayment.query.filter_by(
            appointment_id=appointment.id
        ).with_for_update().first()

        if not payment or payment.status != "success":
            return jsonify({
                "error": "A successful appointment payment was not found. Please contact support."
            }), 409

        if payment.refund_status != "not_requested":
            return jsonify({
                "error": "A refund request already exists for this appointment."
            }), 409

        refund_amount = (
            Decimal(str(payment.amount)) * REFUND_PERCENTAGE
        ).quantize(
            Decimal("0.01"),
            rounding=ROUND_HALF_UP
        )

        appointment.status = "cancelled"
        appointment.slot_key = None

        payment.refund_amount = refund_amount
        payment.refund_status = "pending"
        payment.refund_requested_at = now
        payment.status_message = (
            "Appointment cancelled. Refund request submitted."
        )

        notification = Notification(
            user_id=user_id,
            title="Appointment cancelled",
            message=(
                f"Your {appointment.service.name} appointment has been "
                f"cancelled. Your refund request for "
                f"{payment.currency} {refund_amount:.2f} "
                f"(75% of the payment) has been submitted."
            ),
            type="appointment_cancelled",
            is_read=False,
        )

        db.session.add(notification)
        db.session.commit()

        return jsonify({
            "message": (
                "Your refund request has been submitted. "
                "The refund will be given within 24 hours."
            ),
            "appointment_id": appointment.id,
            "appointment_status": appointment.status,
            "refund": {
                "amount": float(refund_amount),
                "currency": payment.currency,
                "percentage": 75,
                "status": payment.refund_status,
            }
        }), 200

    except Exception:
        db.session.rollback()
        raise
