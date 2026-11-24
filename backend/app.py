
import logging
import os

from flask import Flask, jsonify
from flask_jwt_extended import JWTManager
from sqlalchemy import text

from config import Config
from extensions import db
from models import User

from routes.auth import auth_bp
from routes.products import products_bp
from routes.categories import categories_bp
from routes.cart import cart_bp
from routes.orders import orders_bp
from routes.services import services_bp
from routes.therapists import therapists_bp
from routes.appointments import appointments_bp
from routes.payments import payments_bp
from routes.notifications import notifications_bp


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # In production, CloudFront routes /api/* to this application.
    # CORS is enabled only for the local Vite development origin.
    if os.getenv("FLASK_ENV", "development") == "development":
        from flask_cors import CORS

        CORS(
            app,
            resources={
                r"/api/*": {
                    "origins": [
                        "http://localhost:5173",
                        "http://127.0.0.1:5173",
                    ]
                }
            },
        )

    db.init_app(app)
    JWTManager(app)

    # Register API blueprints
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(products_bp, url_prefix="/api/products")
    app.register_blueprint(categories_bp, url_prefix="/api/categories")
    app.register_blueprint(cart_bp, url_prefix="/api/cart")
    app.register_blueprint(orders_bp, url_prefix="/api/orders")
    app.register_blueprint(services_bp, url_prefix="/api/services")
    app.register_blueprint(therapists_bp, url_prefix="/api/therapists")
    app.register_blueprint(
        appointments_bp,
        url_prefix="/api/appointments",
    )
    app.register_blueprint(
        payments_bp,
        url_prefix="/api/payments",
    )
    app.register_blueprint(
        notifications_bp,
        url_prefix="/api/notifications",
    )

    # Home endpoint
    @app.get("/")
    def home():
        return jsonify({
            "status": "success",
            "message": "E-commerce API",
            "health": "/api/health",
        })

    # Health check
    @app.get("/api/health")
    def health():
        return jsonify({
            "status": "success",
            "message": "Backend is running",
        })

    # Database readiness check
    @app.get("/api/ready")
    def ready():
        try:
            db.session.execute(text("SELECT 1"))

            return jsonify({
                "status": "ready",
                "database": "connected",
            }), 200

        except Exception:
            db.session.rollback()
            logging.exception("Readiness check failed")

            return jsonify({
                "status": "not_ready",
                "database": "unavailable",
            }), 503

    # Database startup diagnostic
    with app.app_context():
        try:
            print("\n========== DATABASE CHECK ==========")
            print("Database:", db.engine.url.database)
            print("Host:", db.engine.url.host)
            print("Users table:", User.__tablename__)
            print("Existing users:", User.query.count())
            print("====================================\n")

        except Exception as exc:
            db.session.rollback()

            logging.warning(
                "Database diagnostic unavailable during startup: %s",
                exc,
            )

    return app


app = create_app()


if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True,
    )
