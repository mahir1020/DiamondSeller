# from app import app
# from flask_sqlalchemy import SQLAlchemy

# app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///site.db'
# db = SQLAlchemy(app)

# class Product(db.Model):
#     id = db.Column(db.Integer, primary_key=True)
#     name = db.Column(db.String(100), nullable=False)
#     description = db.Column(db.Text, nullable=False)
#     price = db.Column(db.Float, nullable=False)

# db.create_all()

from app import db
from datetime import datetime

class Diamond(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    carat = db.Column(db.Float, nullable=False)
    cut = db.Column(db.String(50), nullable=False)
    color = db.Column(db.String(20), nullable=False)
    clarity = db.Column(db.String(20), nullable=False)
    price = db.Column(db.Float, nullable=False)
    description = db.Column(db.Text, nullable=False)
    image_file = db.Column(db.String(40), nullable=False, default='default_diamond.jpg')
    date_added = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    def __repr__(self):
        return f"Diamond('{self.name}', {self.carat} carats, ${self.price})"
