
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import CartItem, Product

cart_bp = Blueprint("cart", __name__)


@cart_bp.route("/", methods=["GET"])
@jwt_required()
def get_cart():

    user_id = int(get_jwt_identity())

    items = CartItem.query.filter_by(user_id=user_id).all()

    result = []
    total = 0

    for item in items:
        product = item.product

        subtotal = float(product.price) * item.quantity
        total += subtotal

        result.append({
            "id": item.id,
            "product_id": product.id,
            "name": product.name,
            "price": float(product.price),
            "image_url": product.image_url,
            "quantity": item.quantity,
            "subtotal": round(subtotal, 2)
        })

    return jsonify({
        "items": result,
        "total": round(total, 2)
    })


@cart_bp.route("/", methods=["POST"])
@jwt_required()
def add_to_cart():

    user_id = int(get_jwt_identity())
    data = request.get_json() or {}

    try:
        product_id = int(data["product_id"])
        quantity = int(data.get("quantity", 1))

        if quantity < 1:
            raise ValueError()

    except (KeyError, TypeError, ValueError):
        return jsonify({"error": "Invalid product or quantity"}), 400

    product = db.session.get(Product, product_id)

    if not product:
        return jsonify({"error": "Product not found"}), 404

    item = CartItem.query.filter_by(
        user_id=user_id,
        product_id=product_id
    ).first()

    new_quantity = quantity + (item.quantity if item else 0)

    if new_quantity > product.stock:
        return jsonify({"error": "Insufficient stock"}), 400

    if item:
        item.quantity = new_quantity
    else:
        item = CartItem(
            user_id=user_id,
            product_id=product_id,
            quantity=quantity
        )
        db.session.add(item)

    db.session.commit()

    return jsonify({"message": "Added to cart"}), 201


@cart_bp.route("/<int:id>", methods=["PUT"])
@jwt_required()
def update_cart(id):

    user_id = int(get_jwt_identity())

    item = CartItem.query.filter_by(
        id=id,
        user_id=user_id
    ).first()

    if not item:
        return jsonify({"error": "Cart item not found"}), 404

    data = request.get_json() or {}

    try:
        quantity = int(data["quantity"])

        if quantity < 1 or quantity > item.product.stock:
            raise ValueError()

    except (KeyError, TypeError, ValueError):
        return jsonify({"error": "Invalid quantity"}), 400

    item.quantity = quantity
    db.session.commit()

    return jsonify({"message": "Cart updated"})


@cart_bp.route("/<int:id>", methods=["DELETE"])
@jwt_required()
def remove_from_cart(id):

    user_id = int(get_jwt_identity())

    item = CartItem.query.filter_by(
        id=id,
        user_id=user_id
    ).first()

    if not item:
        return jsonify({"error": "Cart item not found"}), 404

    db.session.delete(item)
    db.session.commit()

    return jsonify({"message": "Removed from cart"})
