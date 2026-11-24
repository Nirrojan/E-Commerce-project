
from decimal import Decimal
from uuid import uuid4

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from extensions import db
from models import (
    Product,
    Order,
    OrderItem,
    ProductPayment,
    Notification
)

orders_bp = Blueprint("orders", __name__)


# ==========================================
# CREATE PENDING ORDER
# ==========================================

@orders_bp.route("/", methods=["POST"])
@jwt_required()
def checkout():
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}

    address = str(data.get("shipping_address", "")).strip()
    requested_items = data.get("items", [])

    if not address:
        return jsonify({"error": "Shipping address required"}), 400

    if not isinstance(requested_items, list) or not requested_items:
        return jsonify({"error": "Your cart is empty"}), 400

    if len(address) > 2000:
        return jsonify({"error": "Delivery address is too long"}), 400

    try:
        # Combine duplicate product IDs.
        quantities = {}

        for entry in requested_items:
            if not isinstance(entry, dict):
                return jsonify({"error": "Invalid cart item"}), 400

            product_id = int(entry["product_id"])
            quantity = int(entry["quantity"])

            if product_id < 1 or quantity < 1:
                return jsonify({
                    "error": "Invalid product or quantity"
                }), 400

            quantities[product_id] = (
                quantities.get(product_id, 0) + quantity
            )

        product_ids = sorted(quantities.keys())

        # Lock products while checking their current details.
        products = (
            Product.query
            .filter(Product.id.in_(product_ids))
            .order_by(Product.id)
            .with_for_update()
            .all()
        )

        product_map = {
            product.id: product
            for product in products
        }

        if len(product_map) != len(product_ids):
            db.session.rollback()
            return jsonify({
                "error": "One or more products were not found"
            }), 404

        total = Decimal("0.00")

        for product_id, quantity in quantities.items():
            product = product_map[product_id]

            if not product.is_active:
                db.session.rollback()
                return jsonify({
                    "error": f"{product.name} is no longer available"
                }), 400

            if product.stock is None or quantity > product.stock:
                db.session.rollback()
                return jsonify({
                    "error": f"Insufficient stock for {product.name}"
                }), 400

            total += Decimal(str(product.price)) * quantity

        # Create order as pending.
        # Stock is NOT reduced at this stage.
        order = Order(
            user_id=user_id,
            total_amount=total,
            shipping_address=address,
            status="Payment Pending"
        )

        db.session.add(order)
        db.session.flush()

        for product_id, quantity in quantities.items():
            product = product_map[product_id]

            db.session.add(OrderItem(
                order_id=order.id,
                product_id=product.id,
                product_name=product.name,
                price=product.price,
                quantity=quantity
            ))

        db.session.commit()

        return jsonify({
            "message": "Pending order created. Continue to the simulated card payment.",
            "order": order.to_dict()
        }), 201

    except (KeyError, TypeError, ValueError):
        db.session.rollback()
        return jsonify({
            "error": "Invalid product or quantity"
        }), 400

    except Exception:
        db.session.rollback()
        raise


# ==========================================
# SIMULATE PRODUCT PAYMENT
# ==========================================

@orders_bp.route(
    "/<int:order_id>/simulate-payment",
    methods=["POST"]
)
@jwt_required()
def simulate_product_payment(order_id):
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}

    # This endpoint is strictly for the portfolio simulation.
    if data.get("confirm_simulation") is not True:
        return jsonify({
            "error": "Simulation confirmation is required"
        }), 400

    try:
        # Lock the order to prevent duplicate confirmations.
        order = (
            Order.query
            .filter_by(id=order_id, user_id=user_id)
            .with_for_update()
            .first()
        )

        if not order:
            return jsonify({"error": "Order not found"}), 404

        # Idempotency: an already-confirmed simulated payment
        # must not reduce stock or create another notification.
        existing_payment = ProductPayment.query.filter_by(
            order_id=order.id
        ).first()

        if existing_payment:
            return jsonify({
                "message": "This simulated order is already confirmed.",
                "order": order.to_dict()
            }), 200

        if order.status != "Payment Pending":
            return jsonify({
                "error": "This order cannot be confirmed"
            }), 409

        order_items = list(order.items)

        if not order_items:
            return jsonify({"error": "Order has no items"}), 400

        product_ids = sorted({
            item.product_id
            for item in order_items
            if item.product_id is not None
        })

        products = (
            Product.query
            .filter(Product.id.in_(product_ids))
            .order_by(Product.id)
            .with_for_update()
            .all()
        ) if product_ids else []

        product_map = {
            product.id: product
            for product in products
        }

        # Recheck availability because stock may have changed
        # since the pending order was created.
        for item in order_items:
            if item.product_id is None:
                db.session.rollback()
                return jsonify({
                    "error": f"{item.product_name} is no longer available"
                }), 409

            product = product_map.get(item.product_id)

            if not product or not product.is_active:
                db.session.rollback()
                return jsonify({
                    "error": f"{item.product_name} is no longer available"
                }), 409

            if product.stock is None or product.stock < item.quantity:
                db.session.rollback()
                return jsonify({
                    "error": f"Insufficient stock for {item.product_name}"
                }), 409

        # Reduce stock only after all products pass validation.
        for item in order_items:
            product = product_map[item.product_id]
            product.stock -= item.quantity

        # Record simulation metadata only.
        # No card details are received or stored.
        payment = ProductPayment(
            order_id=order.id,
            provider="simulation",
            transaction_reference=f"SIM-{uuid4().hex[:20].upper()}",
            amount=order.total_amount,
            currency="LKR",
            status="simulated_success",
            method="test_card_format"
        )

        db.session.add(payment)

        order.status = "Confirmed (Simulation)"

        total_quantity = sum(
            item.quantity for item in order_items
        )

        summary = ", ".join(
            f"{item.product_name} x {item.quantity}"
            for item in order_items
        )

        notification_message = (
            f"Your simulated order #{order.id} was confirmed. "
            f"You purchased {total_quantity} product units "
            f"across {len(order_items)} product types. "
            f"Products: {summary[:250]}. "
            f"Total: LKR {Decimal(str(order.total_amount)):.2f}. "
            f"No real payment was processed."
        )

        db.session.add(Notification(
            user_id=user_id,
            title="Product order confirmed (simulation)",
            message=notification_message[:500],
            type="product_purchased",
            is_read=False
        ))

        db.session.commit()

        return jsonify({
            "message": "Simulated payment successful. Order confirmed.",
            "order": order.to_dict()
        }), 200

    except Exception:
        db.session.rollback()
        raise


# ==========================================
# GET CUSTOMER ORDERS
# ==========================================

@orders_bp.route("/", methods=["GET"])
@jwt_required()
def get_orders():
    user_id = int(get_jwt_identity())

    orders = (
        Order.query
        .filter_by(user_id=user_id)
        .order_by(Order.created_at.desc())
        .all()
    )

    return jsonify({
        "orders": [order.to_dict() for order in orders]
    })


# ==========================================
# GET ONE CUSTOMER ORDER
# ==========================================

@orders_bp.route("/<int:id>", methods=["GET"])
@jwt_required()
def get_order(id):
    user_id = int(get_jwt_identity())

    order = Order.query.filter_by(
        id=id,
        user_id=user_id
    ).first()

    if not order:
        return jsonify({"error": "Order not found"}), 404

    return jsonify({"order": order.to_dict()})
