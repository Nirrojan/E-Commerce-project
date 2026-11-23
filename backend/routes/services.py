
from flask import Blueprint, jsonify

from models import Service


services_bp = Blueprint("services", __name__)


# ==========================================
# GET ALL ACTIVE SERVICES
# GET /api/services/
# ==========================================

@services_bp.route("/", methods=["GET"])
def get_services():

    services = (
        Service.query
        .filter_by(is_active=True)
        .order_by(Service.id.asc())
        .all()
    )

    return jsonify({
        "status": "success",
        "services": [
            service.to_dict()
            for service in services
        ]
    }), 200


# ==========================================
# GET ONE SERVICE
# GET /api/services/1
# ==========================================

@services_bp.route("/<int:service_id>", methods=["GET"])
def get_service(service_id):

    service = Service.query.filter_by(
        id=service_id,
        is_active=True
    ).first()

    if not service:
        return jsonify({
            "status": "error",
            "message": "Service not found"
        }), 404

    return jsonify({
        "status": "success",
        "service": service.to_dict()
    }), 200
