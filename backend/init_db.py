
from app import app
from extensions import db
from models import Category, Product

with app.app_context():

    db.create_all()

    if Category.query.count() == 0:

        categories = [
            Category(name="Electronics"),
            Category(name="Fashion"),
            Category(name="Home"),
            Category(name="Accessories")
        ]

        db.session.add_all(categories)
        db.session.commit()

    if Product.query.count() == 0:

        electronics = Category.query.filter_by(
            name="Electronics"
        ).first()

        products = [
            Product(
                name="Wireless Headphones",
                description="Bluetooth headphones",
                price=4990,
                stock=20,
                category_id=electronics.id
            ),
            Product(
                name="Smart Watch",
                description="Smart watch",
                price=7990,
                stock=15,
                category_id=electronics.id
            )
        ]

        db.session.add_all(products)
        db.session.commit()

    print("Database initialized successfully!")
