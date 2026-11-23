
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from extensions import db
from models import Category

categories_bp = Blueprint("categories", __name__)


@categories_bp.route("/", methods=["GET"])
def get_categories():
    categories = Category.query.all()
    return jsonify([c.to_dict() for c in categories])


@categories_bp.route("/", methods=["POST"])
@jwt_required()
def add_category():

    data = request.get_json() or {}
    name = data.get("name", "").strip()

    if not name:
        return jsonify({"error": "Category name required"}), 400

    if Category.query.filter_by(name=name).first():
        return jsonify({"error": "Category already exists"}), 409

    category = Category(name=name)

    db.session.add(category)
    db.session.commit()

    return jsonify(category.to_dict()), 201


@categories_bp.route("/<int:id>", methods=["DELETE"])
@jwt_required()
def delete_category(id):

    category = db.session.get(Category, id)

    if not category:
        return jsonify({"error": "Category not found"}), 404

    if category.products if hasattr(category, "products") else False:
        return jsonify({"error": "Category contains products"}), 400

    db.session.delete(category)
    db.session.commit()

    return jsonify({"message": "Category deleted"})
