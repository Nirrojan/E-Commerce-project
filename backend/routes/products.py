
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from extensions import db
from models import Product, Category

products_bp = Blueprint("products", __name__)


@products_bp.route("/", methods=["GET"])
def get_products():

    products = Product.query.all()

    return jsonify([p.to_dict() for p in products])


@products_bp.route("/<int:id>", methods=["GET"])
def get_product(id):

    product = db.session.get(Product, id)

    if not product:
        return jsonify({"error": "Product not found"}), 404

    return jsonify(product.to_dict())


@products_bp.route("/", methods=["POST"])
@jwt_required()
def add_product():

    data = request.get_json() or {}

    try:
        name = data["name"].strip()
        price = float(data["price"])
        stock = int(data.get("stock", 0))

        if not name or price < 0 or stock < 0:
            raise ValueError()

        product = Product(
            name=name,
            description=data.get("description"),
            price=price,
            stock=stock,
            image_url=data.get("image_url"),
            category_id=data.get("category_id")
        )

        db.session.add(product)
        db.session.commit()

        return jsonify(product.to_dict()), 201

    except (KeyError, TypeError, ValueError):
        db.session.rollback()
        return jsonify({"error": "Invalid product information"}), 400


@products_bp.route("/<int:id>", methods=["PUT"])
@jwt_required()
def update_product(id):

    product = db.session.get(Product, id)

    if not product:
        return jsonify({"error": "Product not found"}), 404

    data = request.get_json() or {}

    try:
        if "name" in data:
            product.name = data["name"].strip()

        if "price" in data:
            product.price = float(data["price"])

        if "stock" in data:
            product.stock = int(data["stock"])

        if "description" in data:
            product.description = data["description"]

        if "image_url" in data:
            product.image_url = data["image_url"]

        if "category_id" in data:
            product.category_id = data["category_id"]

        if product.price < 0 or product.stock < 0:
            raise ValueError()

        db.session.commit()

        return jsonify(product.to_dict())

    except (TypeError, ValueError):
        db.session.rollback()
        return jsonify({"error": "Invalid product information"}), 400


@products_bp.route("/<int:id>", methods=["DELETE"])
@jwt_required()
def delete_product(id):

    product = db.session.get(Product, id)

    if not product:
        return jsonify({"error": "Product not found"}), 404

    db.session.delete(product)
    db.session.commit()

    return jsonify({"message": "Product deleted"})
