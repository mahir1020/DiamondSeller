from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from config import Config

app = Flask(__name__)
app.config.from_object(Config)
db = SQLAlchemy(app)

app.config['MAIL_SERVER'] = 'smtp.gmail.com'  # Or your SMTP server
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = 'handyman.ca009@gmail.com'  # Replace with your email
app.config['MAIL_PASSWORD'] = 'oear tbvj eslh xwbx'   # Replace with your password or app password
app.config['MAIL_DEFAULT_SENDER'] = 'handyman.ca009@gmail.com'
app.config['MAIL_RECEIVER_ADDRESS'] = 'shriyagems38@gmail.com'  # Where you want to receive messages

from app import routes, models

with app.app_context():
    db.create_all()
