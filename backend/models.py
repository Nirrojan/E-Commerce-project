
import base64
from datetime import datetime

from werkzeug.security import generate_password_hash, check_password_hash

from extensions import db


# ==========================================
# USER MODEL
# ==========================================

class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), default="customer")

    picture = db.Column(db.LargeBinary, nullable=True)
    picture_mimetype = db.Column(db.String(50), nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, password):
        self.password = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password, password)

    def to_dict(self):
        picture_data = ""

        if self.picture and self.picture_mimetype:
            encoded = base64.b64encode(self.picture).decode("utf-8")
            picture_data = f"data:{self.picture_mimetype};base64,{encoded}"

        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "role": self.role,
            "picture": picture_data,
            "created_at": (
                self.created_at.isoformat()
                if self.created_at else None
            )
        }


# ==========================================
# CATEGORY MODEL
# ==========================================

class Category(db.Model):
    __tablename__ = "categories"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)

    is_active = db.Column(
        db.Boolean,
        nullable=False,
        default=True
    )

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "is_active": self.is_active
        }


# ==========================================
# PRODUCT MODEL
# ==========================================

class Product(db.Model):
    __tablename__ = "products"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(180), nullable=False)
    description = db.Column(db.Text)
    price = db.Column(db.Numeric(10, 2), nullable=False)
    image_url = db.Column(db.String(500))
    stock = db.Column(db.Integer, default=0)

    is_active = db.Column(
        db.Boolean,
        nullable=False,
        default=True
    )

    category_id = db.Column(
        db.Integer,
        db.ForeignKey("categories.id"),
        nullable=True
    )

    category = db.relationship(
        "Category",
        backref=db.backref("products", lazy=True)
    )

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "price": float(self.price),
            "image_url": self.image_url,
            "stock": self.stock,
            "is_active": self.is_active,
            "category_id": self.category_id,
            "category": self.category.name if self.category else None
        }


# ==========================================
# CART ITEM MODEL
# ==========================================

class CartItem(db.Model):
    __tablename__ = "cart_items"

    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )

    product_id = db.Column(
        db.Integer,
        db.ForeignKey("products.id"),
        nullable=False
    )

    quantity = db.Column(
        db.Integer,
        default=1,
        nullable=False
    )

    product = db.relationship("Product")

    user = db.relationship(
        "User",
        backref=db.backref("cart_items", lazy=True)
    )

    __table_args__ = (
        db.UniqueConstraint(
            "user_id",
            "product_id",
            name="unique_user_product_cart"
        ),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "product_id": self.product_id,
            "quantity": self.quantity,
            "product": self.product.to_dict() if self.product else None
        }


# ==========================================
# ORDER MODEL
# ==========================================

class Order(db.Model):
    __tablename__ = "orders"

    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )

    total_amount = db.Column(db.Numeric(10, 2), nullable=False)
    shipping_address = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(40), default="Pending")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship(
        "User",
        backref=db.backref("orders", lazy=True)
    )

    items = db.relationship(
        "OrderItem",
        backref="order",
        cascade="all, delete-orphan",
        lazy=True
    )

    product_payment = db.relationship(
        "ProductPayment",
        back_populates="order",
        uselist=False,
        cascade="all, delete-orphan"
    )

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "total_amount": float(self.total_amount),
            "shipping_address": self.shipping_address,
            "status": self.status,
            "created_at": (
                self.created_at.isoformat()
                if self.created_at else None
            ),
            "items": [item.to_dict() for item in self.items],
            "payment": (
                self.product_payment.to_dict()
                if self.product_payment else None
            )
        }


# ==========================================
# ORDER ITEM MODEL
# ==========================================

class OrderItem(db.Model):
    __tablename__ = "order_items"

    id = db.Column(db.Integer, primary_key=True)

    order_id = db.Column(
        db.Integer,
        db.ForeignKey("orders.id"),
        nullable=False
    )

    product_id = db.Column(
        db.Integer,
        db.ForeignKey("products.id"),
        nullable=True
    )

    product_name = db.Column(db.String(180), nullable=False)
    price = db.Column(db.Numeric(10, 2), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)

    product = db.relationship("Product")

    def to_dict(self):
        return {
            "id": self.id,
            "order_id": self.order_id,
            "product_id": self.product_id,
            "product_name": self.product_name,
            "price": float(self.price),
            "quantity": self.quantity
        }


# ==========================================
# PRODUCT PAYMENT MODEL
# ==========================================

class ProductPayment(db.Model):
    """
    Portfolio-only simulated product payment.

    Card numbers, CVV and expiry dates are never stored.
    This model is separate from AppointmentPayment.
    """

    __tablename__ = "product_payments"

    id = db.Column(db.Integer, primary_key=True)

    order_id = db.Column(
        db.Integer,
        db.ForeignKey("orders.id", ondelete="CASCADE"),
        nullable=False,
        unique=True
    )

    provider = db.Column(
        db.String(30),
        nullable=False,
        default="simulation"
    )

    transaction_reference = db.Column(
        db.String(100),
        nullable=False,
        unique=True
    )

    amount = db.Column(
        db.Numeric(10, 2),
        nullable=False
    )

    currency = db.Column(
        db.String(3),
        nullable=False,
        default="LKR"
    )

    status = db.Column(
        db.String(30),
        nullable=False,
        default="simulated_success"
    )

    method = db.Column(
        db.String(40),
        nullable=False,
        default="test_card_format"
    )

    created_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow
    )

    order = db.relationship(
        "Order",
        back_populates="product_payment"
    )

    def to_dict(self):
        return {
            "id": self.id,
            "order_id": self.order_id,
            "provider": self.provider,
            "transaction_reference": self.transaction_reference,
            "amount": float(self.amount),
            "currency": self.currency,
            "status": self.status,
            "method": self.method,
            "created_at": (
                self.created_at.isoformat()
                if self.created_at else None
            )
        }


# ==========================================
# SERVICE MODEL
# ==========================================

class Service(db.Model):
    __tablename__ = "services"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(180), nullable=False)
    description = db.Column(db.Text, nullable=False)
    image_url = db.Column(db.String(500), nullable=True)
    price = db.Column(db.Numeric(10, 2), nullable=True)
    duration = db.Column(db.String(100), nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "image_url": self.image_url,
            "price": float(self.price) if self.price is not None else None,
            "duration": self.duration,
            "is_active": self.is_active,
            "created_at": (
                self.created_at.isoformat()
                if self.created_at else None
            )
        }


# ==========================================
# THERAPIST AND SERVICE RELATIONSHIPS
# ==========================================

therapist_services = db.Table(
    "therapist_services",
    db.Column(
        "therapist_id",
        db.Integer,
        db.ForeignKey("therapists.id", ondelete="CASCADE"),
        primary_key=True
    ),
    db.Column(
        "service_id",
        db.Integer,
        db.ForeignKey("services.id", ondelete="CASCADE"),
        primary_key=True
    ),
)


class Therapist(db.Model):
    __tablename__ = "therapists"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    title = db.Column(db.String(150), nullable=False, default="Beauty Therapist")
    bio = db.Column(db.Text, nullable=True)
    experience_years = db.Column(db.Integer, nullable=False, default=0)
    photo_url = db.Column(db.String(500), nullable=True)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    services = db.relationship(
        "Service",
        secondary=therapist_services,
        backref=db.backref("therapists", lazy="select")
    )

    schedules = db.relationship(
        "TherapistSchedule",
        back_populates="therapist",
        cascade="all, delete-orphan"
    )

    def to_dict(self, include_services=True):
        result = {
            "id": self.id,
            "name": self.name,
            "title": self.title,
            "bio": self.bio,
            "experience_years": self.experience_years,
            "photo_url": self.photo_url,
            "is_active": self.is_active,
        }

        if include_services:
            result["services"] = [
                {"id": service.id, "name": service.name}
                for service in self.services
                if service.is_active
            ]

        return result


class TherapistSchedule(db.Model):
    __tablename__ = "therapist_schedules"

    id = db.Column(db.Integer, primary_key=True)

    therapist_id = db.Column(
        db.Integer,
        db.ForeignKey("therapists.id", ondelete="CASCADE"),
        nullable=False
    )

    day_of_week = db.Column(db.Integer, nullable=False)
    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time, nullable=False)
    is_active = db.Column(db.Boolean, nullable=False, default=True)

    therapist = db.relationship(
        "Therapist",
        back_populates="schedules"
    )

    __table_args__ = (
        db.UniqueConstraint(
            "therapist_id",
            "day_of_week",
            "start_time",
            name="uq_therapist_weekday_start"
        ),
    )


class TherapistScheduleException(db.Model):
    __tablename__ = "therapist_schedule_exceptions"

    id = db.Column(db.Integer, primary_key=True)

    therapist_id = db.Column(
        db.Integer,
        db.ForeignKey("therapists.id", ondelete="CASCADE"),
        nullable=False
    )

    exception_date = db.Column(db.Date, nullable=False)
    is_closed = db.Column(db.Boolean, nullable=False, default=True)
    start_time = db.Column(db.Time, nullable=True)
    end_time = db.Column(db.Time, nullable=True)
    note = db.Column(db.String(255), nullable=True)

    __table_args__ = (
        db.UniqueConstraint(
            "therapist_id",
            "exception_date",
            name="uq_therapist_exception_date"
        ),
    )


# ==========================================
# APPOINTMENT MODEL
# ==========================================

class Appointment(db.Model):
    __tablename__ = "appointments"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    service_id = db.Column(db.Integer, db.ForeignKey("services.id"), nullable=False)
    therapist_id = db.Column(db.Integer, db.ForeignKey("therapists.id"), nullable=False)

    starts_at = db.Column(db.DateTime, nullable=False)
    ends_at = db.Column(db.DateTime, nullable=False)
    status = db.Column(db.String(20), nullable=False, default="held")
    slot_key = db.Column(db.String(64), nullable=True, unique=True)
    hold_expires_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    confirmed_at = db.Column(db.DateTime, nullable=True)

    user = db.relationship("User")
    service = db.relationship("Service")
    therapist = db.relationship("Therapist")

    payment = db.relationship(
        "AppointmentPayment",
        back_populates="appointment",
        uselist=False,
        cascade="all, delete-orphan"
    )

    __table_args__ = (
        db.Index("ix_appointments_starts_status", "starts_at", "status"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "service": self.service.to_dict() if self.service else None,
            "therapist": (
                self.therapist.to_dict(include_services=False)
                if self.therapist else None
            ),
            "starts_at": self.starts_at.isoformat(),
            "ends_at": self.ends_at.isoformat(),
            "status": self.status,
            "hold_expires_at": (
                self.hold_expires_at.isoformat()
                if self.hold_expires_at else None
            ),
            "created_at": (
                self.created_at.isoformat()
                if self.created_at else None
            )
        }


# ==========================================
# APPOINTMENT PAYMENT MODEL
# ==========================================

class AppointmentPayment(db.Model):
    __tablename__ = "appointment_payments"

    id = db.Column(db.Integer, primary_key=True)

    appointment_id = db.Column(
        db.Integer,
        db.ForeignKey("appointments.id", ondelete="CASCADE"),
        nullable=False,
        unique=True
    )

    provider = db.Column(db.String(30), nullable=False, default="demo")
    order_id = db.Column(db.String(80), nullable=False, unique=True)
    provider_payment_id = db.Column(db.String(100), nullable=True, unique=True)
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    currency = db.Column(db.String(3), nullable=False, default="LKR")
    status = db.Column(db.String(20), nullable=False, default="initiated")
    method = db.Column(db.String(30), nullable=True)
    status_message = db.Column(db.String(255), nullable=True)

    # Refund tracking
    refund_amount = db.Column(db.Numeric(10, 2), nullable=True)

    refund_status = db.Column(
        db.String(20),
        nullable=False,
        default="not_requested"
    )

    refund_requested_at = db.Column(db.DateTime, nullable=True)
    refund_completed_at = db.Column(db.DateTime, nullable=True)

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

    appointment = db.relationship(
        "Appointment",
        back_populates="payment"
    )


# ==========================================
# IN-APP NOTIFICATION MODEL
# ==========================================

class Notification(db.Model):
    __tablename__ = "notifications"

    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )

    title = db.Column(db.String(150), nullable=False)
    message = db.Column(db.String(500), nullable=False)
    type = db.Column(db.String(50), nullable=False)

    is_read = db.Column(
        db.Boolean,
        nullable=False,
        default=False
    )

    created_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow
    )

    user = db.relationship(
        "User",
        backref=db.backref("notifications", lazy=True)
    )

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "message": self.message,
            "type": self.type,
            "is_read": self.is_read,
            "created_at": (
                self.created_at.isoformat()
                if self.created_at else None
            )
        }


# ==========================================
# EMAIL OUTBOX MODEL
# ==========================================

class EmailOutbox(db.Model):
    __tablename__ = "email_outbox"

    id = db.Column(db.Integer, primary_key=True)
    event_type = db.Column(db.String(80), nullable=False)
    payload = db.Column(db.JSON, nullable=False)
    status = db.Column(db.String(20), nullable=False, default="pending")
    attempts = db.Column(db.Integer, nullable=False, default=0)
    last_error = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    published_at = db.Column(db.DateTime, nullable=True)
