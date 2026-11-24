from flask import Blueprint, jsonify

from models import Service
from cache_service import get_json, set_json

services_bp = Blueprint("services", __name__)


@services_bp.get("/")
def get_services():
    cached = get_json("catalog:services:list")
    if cached is not None:
        return jsonify({"status": "success", "services": cached})

    services = (
        Service.query.filter_by(is_active=True)
        .order_by(Service.id.asc()).all()
    )
    result = [service.to_dict() for service in services]
    set_json("catalog:services:list", result, ttl=300)
    return jsonify({"status": "success", "services": result})


@services_bp.get("/<int:service_id>")
def get_service(service_id):
    key = f"catalog:services:{service_id}"
    cached = get_json(key)
    if cached is not None:
        return jsonify({"status": "success", "service": cached})

    service = Service.query.filter_by(id=service_id, is_active=True).first()
    if not service:
        return jsonify({"status": "error", "message": "Service not found"}), 404

    result = service.to_dict()
    set_json(key, result, ttl=300)
    return jsonify({"status": "success", "service": result})
