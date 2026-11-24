
from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required

from extensions import db
from models import Notification

notifications_bp = Blueprint("notifications", __name__)


# Get notifications for the logged-in user
@notifications_bp.get("/")
@jwt_required()
def get_notifications():

    user_id = int(get_jwt_identity())

    notifications = (
        Notification.query
        .filter_by(user_id=user_id)
        .order_by(Notification.created_at.desc())
        .all()
    )

    unread_count = (
        Notification.query
        .filter_by(user_id=user_id, is_read=False)
        .count()
    )

    return jsonify({
        "notifications": [
            notification.to_dict()
            for notification in notifications
        ],
        "unread_count": unread_count,
    }), 200


# Mark one notification as read
@notifications_bp.patch("/<int:notification_id>/read")
@jwt_required()
def mark_notification_read(notification_id):

    user_id = int(get_jwt_identity())

    notification = Notification.query.filter_by(
        id=notification_id,
        user_id=user_id,
    ).first()

    if notification is None:
        return jsonify({
            "error": "Notification not found"
        }), 404

    notification.is_read = True
    db.session.commit()

    return jsonify({
        "message": "Notification marked as read",
        "notification": notification.to_dict(),
    }), 200


# Mark all notifications as read
@notifications_bp.patch("/read-all")
@jwt_required()
def mark_all_notifications_read():

    user_id = int(get_jwt_identity())

    Notification.query.filter_by(
        user_id=user_id,
        is_read=False,
    ).update(
        {"is_read": True},
        synchronize_session=False,
    )

    db.session.commit()

    return jsonify({
        "message": "All notifications marked as read"
    }), 200


# Delete one notification
@notifications_bp.delete("/<int:notification_id>")
@jwt_required()
def delete_notification(notification_id):

    user_id = int(get_jwt_identity())

    notification = Notification.query.filter_by(
        id=notification_id,
        user_id=user_id,
    ).first()

    if notification is None:
        return jsonify({
            "error": "Notification not found"
        }), 404

    db.session.delete(notification)
    db.session.commit()

    return jsonify({
        "message": "Notification deleted successfully"
    }), 200
