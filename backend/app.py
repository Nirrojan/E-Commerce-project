
from flask import Flask, jsonify
from flask_jwt_extended import JWTManager

from config import Config
from extensions import db

from models import User

from routes.auth import auth_bp
from routes.products import products_bp
from routes.categories import categories_bp
from routes.cart import cart_bp
from routes.orders import orders_bp
from routes.services import services_bp


# =====================================
# CREATE FLASK APPLICATION
# =====================================

app = Flask(__name__)

app.config.from_object(Config)


# =====================================
# INITIALIZE EXTENSIONS
# =====================================

db.init_app(app)

jwt = JWTManager(app)


# =====================================
# DATABASE DIAGNOSTIC
# =====================================

def check_database():

    print("\n========== DATABASE CHECK ==========")

    try:

        with app.app_context():

            print("Database:", db.engine.url.database)
            print("Host:", db.engine.url.host)
            print("Users table:", User.__tablename__)

            user_count = User.query.count()

            print("Existing users:", user_count)

    except Exception as error:

        print("Database connection unavailable:", error)

    print("====================================\n")


# Run diagnostic without preventing application startup
check_database()


# =====================================
# REGISTER API BLUEPRINTS
# =====================================

app.register_blueprint(
    auth_bp,
    url_prefix="/api/auth"
)

app.register_blueprint(
    products_bp,
    url_prefix="/api/products"
)

app.register_blueprint(
    categories_bp,
    url_prefix="/api/categories"
)

app.register_blueprint(
    cart_bp,
    url_prefix="/api/cart"
)

app.register_blueprint(
    orders_bp,
    url_prefix="/api/orders"
)

app.register_blueprint(
    services_bp,
    url_prefix="/api/services"
)


# =====================================
# HOME ENDPOINT
# =====================================

@app.route("/", methods=["GET"])
def home():

    return jsonify({
        "status": "success",
        "message": "Welcome to the E-commerce API",
        "health": "/api/health"
    }), 200


# =====================================
# HEALTH CHECK
# =====================================

@app.route("/api/health", methods=["GET"])
def health():

    return jsonify({
        "status": "success",
        "message": "E-commerce backend is running"
    }), 200


# =====================================
# PRINT REGISTERED ROUTES
# =====================================

print("\n========== REGISTERED ROUTES ==========")

for rule in app.url_map.iter_rules():

    print(f"{rule} -> {rule.endpoint}")

print("=======================================\n")


# =====================================
# RUN LOCAL DEVELOPMENT SERVER
# =====================================

if __name__ == "__main__":

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )
