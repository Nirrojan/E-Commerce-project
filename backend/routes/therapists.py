from flask import Blueprint, jsonify

from models import Therapist, Service
from cache_service import get_json, set_json, namespace_version

therapists_bp = Blueprint("therapists", __name__)


@therapists_bp.get("/by-service/<int:service_id>")
def get_therapists_for_service(service_id):
    version = namespace_version("therapists")
    key = f"catalog:therapists:{version}:service:{service_id}"
    cached = get_json(key)
    if cached is not None:
        return jsonify({"therapists": cached})

    therapists = (
        Therapist.query.join(Therapist.services)
        .filter(Therapist.is_active.is_(True))
        .filter(Service.id == service_id, Service.is_active.is_(True))
        .order_by(Therapist.name.asc())
        .all()
    )
    result = [therapist.to_dict() for therapist in therapists]
    set_json(key, result, ttl=300)
    return jsonify({"therapists": result})


@therapists_bp.get("/<int:therapist_id>")
def get_therapist(therapist_id):
    version = namespace_version("therapists")
    key = f"catalog:therapists:{version}:profile:{therapist_id}"
    cached = get_json(key)
    if cached is not None:
        return jsonify({"therapist": cached})

    therapist = Therapist.query.filter_by(
        id=therapist_id, is_active=True
    ).first()
    if not therapist:
        return jsonify({"error": "Therapist not found"}), 404

    result = therapist.to_dict()
    set_json(key, result, ttl=300)
    return jsonify({"therapist": result})
