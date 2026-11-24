from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from extensions import db
from models import Category
from cache_service import get_json, set_json, invalidate_product_cache

categories_bp = Blueprint("categories", __name__)


@categories_bp.route("/", methods=["GET"])
def get_categories():
    cached = get_json("catalog:categories:list")
    if cached is not None:
        return jsonify(cached)
    categories = Category.query.filter_by(is_active=True).order_by(Category.name.asc()).all()
    result = [category.to_dict() for category in categories]
    set_json("catalog:categories:list", result, ttl=300)
    return jsonify(result)


@categories_bp.route("/", methods=["POST"])
@jwt_required()
def add_category():
    data = request.get_json() or {}
    name = data.get("name", "").strip()
    if not name:
        return jsonify({"error": "Category name required"}), 400
    if Category.query.filter_by(name=name).first():
        return jsonify({"error": "Category already exists"}), 409
    category = Category(name=name, is_active=True)
    db.session.add(category)
    db.session.commit()
    invalidate_product_cache()
    return jsonify(category.to_dict()), 201


@categories_bp.route("/<int:id>", methods=["DELETE"])
@jwt_required()
def delete_category(id):
    category = db.session.get(Category, id)
    if not category:
        return jsonify({"error": "Category not found"}), 404
    if any(product.is_active for product in category.products):
        return jsonify({"error": "Category contains active products"}), 400
    category.is_active = False
    db.session.commit()
    invalidate_product_cache()
    return jsonify({"message": "Category archived"})
