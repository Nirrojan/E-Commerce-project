
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import CartItem, Product, Order, OrderItem
from decimal import Decimal

orders_bp = Blueprint("orders", __name__)


@orders_bp.route("/", methods=["POST"])
@jwt_required()
def checkout():

    user_id = int(get_jwt_identity())
    data = request.get_json() or {}

    address = data.get("shipping_address", "").strip()

    if not address:
        return jsonify({"error": "Shipping address required"}), 400

    try:
        items = CartItem.query.filter_by(user_id=user_id).with_for_update().all()

        if not items:
            return jsonify({"error": "Cart is empty"}), 400

        total = Decimal("0.00")

        for item in items:
            product = db.session.get(Product, item.product_id)

            if not product or item.quantity > product.stock:
                db.session.rollback()
                return jsonify({"error": "Product unavailable or insufficient stock"}), 400

            total += Decimal(str(product.price)) * item.quantity

        order = Order(
            user_id=user_id,
            total_amount=total,
            shipping_address=address
        )

        db.session.add(order)
        db.session.flush()

        for item in items:

            product = db.session.get(Product, item.product_id)

            order_item = OrderItem(
                order_id=order.id,
                product_id=product.id,
                product_name=product.name,
                price=product.price,
                quantity=item.quantity
            )

            product.stock -= item.quantity

            db.session.add(order_item)
            db.session.delete(item)

        db.session.commit()

        return jsonify({
            "message": "Order placed successfully",
            "order_id": order.id,
            "total_amount": float(order.total_amount),
            "status": order.status
        }), 201

    except Exception:
        db.session.rollback()
        raise


@orders_bp.route("/", methods=["GET"])
@jwt_required()
def get_orders():

    user_id = int(get_jwt_identity())

    orders = Order.query.filter_by(
        user_id=user_id
    ).order_by(Order.created_at.desc()).all()

    result = []

    for order in orders:
        result.append({
            "id": order.id,
            "total_amount": float(order.total_amount),
            "status": order.status,
            "shipping_address": order.shipping_address,
            "created_at": order.created_at.isoformat()
        })

    return jsonify(result)


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

    return jsonify({
        "id": order.id,
        "total_amount": float(order.total_amount),
        "status": order.status,
        "shipping_address": order.shipping_address,
        "items": [
            {
                "product_name": item.product_name,
                "price": float(item.price),
                "quantity": item.quantity
            }
            for item in order.items
        ]
    })
