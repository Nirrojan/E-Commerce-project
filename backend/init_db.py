"""Database verification helper.

Run the SQL migration and demo seed scripts in db/ first. db.create_all()
does not alter existing MySQL tables, so it is not a substitute for migration.
"""
from sqlalchemy import inspect, text

from app import app
from extensions import db

REQUIRED_TABLES = [
    "users", "categories", "products", "services",
    "therapists", "therapist_services", "therapist_schedules",
    "therapist_schedule_exceptions", "appointments",
    "appointment_payments", "email_outbox",
]


with app.app_context():
    db.session.execute(text("SELECT 1"))
    existing = set(inspect(db.engine).get_table_names())
    missing = [table for table in REQUIRED_TABLES if table not in existing]

    if missing:
        raise SystemExit(
            "Missing database tables: " + ", ".join(missing)
            + ". Run db/migration_appointments_and_catalog.sql first."
        )

    print("Database connection and required tables verified.")
