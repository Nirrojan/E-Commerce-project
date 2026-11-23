
from flask import Blueprint, request, jsonify

from flask_jwt_extended import (
    create_access_token,
    jwt_required,
    get_jwt_identity
)

from extensions import db
from models import User


auth_bp = Blueprint("auth", __name__)

ALLOWED_MIMETYPES = {
    "image/jpeg",
    "image/png",
    "image/webp"
}

MAX_IMAGE_SIZE = 800 * 1024


def get_current_user():

    user_id = int(get_jwt_identity())

    return db.session.get(User, user_id)


# ==========================================
# REGISTER
# ==========================================

@auth_bp.route("/register", methods=["POST"])
def register():

    data = request.get_json() or {}

    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not name or not email or len(password) < 8:
        return jsonify({
            "error": "Invalid registration details"
        }), 400

    if User.query.filter_by(email=email).first():
        return jsonify({
            "error": "Email already exists"
        }), 409

    user = User(name=name, email=email)

    user.set_password(password)

    db.session.add(user)
    db.session.commit()

    token = create_access_token(identity=str(user.id))

    return jsonify({
        "message": "Registration successful",
        "user": user.to_dict(),
        "access_token": token
    }), 201


# ==========================================
# LOGIN
# ==========================================

@auth_bp.route("/login", methods=["POST"])
def login():

    data = request.get_json() or {}

    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    user = User.query.filter_by(email=email).first()

    if not user or not user.check_password(password):
        return jsonify({
            "error": "Invalid email or password"
        }), 401

    token = create_access_token(identity=str(user.id))

    return jsonify({
        "message": "Login successful",
        "user": user.to_dict(),
        "access_token": token
    }), 200


# ==========================================
# GET PROFILE
# ==========================================

@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def get_profile():

    user = get_current_user()

    if not user:
        return jsonify({
            "error": "User not found"
        }), 404

    return jsonify({
        "user": user.to_dict()
    }), 200


# ==========================================
# UPDATE PROFILE NAME
# ==========================================

@auth_bp.route("/profile", methods=["PUT"])
@jwt_required()
def update_profile():

    user = get_current_user()

    if not user:
        return jsonify({
            "error": "User not found"
        }), 404

    data = request.get_json() or {}

    name = data.get("name", "").strip()

    if not name:
        return jsonify({
            "error": "Name is required"
        }), 400

    user.name = name

    db.session.commit()

    return jsonify({
        "message": "Profile updated successfully",
        "user": user.to_dict()
    }), 200


# ==========================================
# UPLOAD PROFILE PICTURE TO MYSQL
# ==========================================

@auth_bp.route("/profile-picture", methods=["POST"])
@jwt_required()
def upload_profile_picture():

    user = get_current_user()

    if not user:
        return jsonify({
            "error": "User not found"
        }), 404

    if "picture" not in request.files:
        return jsonify({
            "error": "Please select an image"
        }), 400

    file = request.files["picture"]

    if not file or not file.filename:
        return jsonify({
            "error": "No image selected"
        }), 400

    mimetype = (file.mimetype or "").lower()

    if mimetype not in ALLOWED_MIMETYPES:
        return jsonify({
            "error": "Only JPG, JPEG, PNG and WEBP images are allowed"
        }), 400

    # Read the image into memory
    file_bytes = file.read(MAX_IMAGE_SIZE + 1)

    if not file_bytes:
        return jsonify({
            "error": "The selected image is empty"
        }), 400

    if len(file_bytes) > MAX_IMAGE_SIZE:
        return jsonify({
            "error": "Image must be smaller than 800 KB"
        }), 400

    try:

        # Store the actual image bytes in MySQL
        user.picture = file_bytes
        user.picture_mimetype = mimetype

        db.session.commit()

    except Exception:

        db.session.rollback()

        return jsonify({
            "error": "Unable to save profile picture"
        }), 500

    return jsonify({
        "message": "Profile picture saved in MySQL successfully",
        "user": user.to_dict()
    }), 200


# ==========================================
# CHANGE PASSWORD
# ==========================================

@auth_bp.route("/change-password", methods=["POST"])
@jwt_required()
def change_password():

    user = get_current_user()

    if not user:
        return jsonify({
            "error": "User not found"
        }), 404

    data = request.get_json() or {}

    current_password = data.get("current_password", "")
    new_password = data.get("new_password", "")

    if not current_password or not new_password:
        return jsonify({
            "error": "Please enter both passwords"
        }), 400

    if not user.check_password(current_password):
        return jsonify({
            "error": "Current password is incorrect"
        }), 400

    if len(new_password) < 8:
        return jsonify({
            "error": "New password must contain at least 8 characters"
        }), 400

    if current_password == new_password:
        return jsonify({
            "error": "New password must be different from current password"
        }), 400

    user.set_password(new_password)

    db.session.commit()

    return jsonify({
        "message": "Password changed successfully"
    }), 200
