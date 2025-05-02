from flask import render_template, url_for, flash, redirect, request, jsonify, abort
from flask_mail import Mail, Message
from app import app, db
from app.models import Diamond
import json
import os
import requests


# Initialize Flask-Mail
mail = Mail(app)

def load_diamonds_data():
    try:
        response = requests.get("http://www.wellcome.co.in/ambeExport/?APIKEY=JAY")
        response.raise_for_status()  # Raise an error for bad status codes


        data = response.json()

        # Check if the response is a list
        if not isinstance(data, list):
            print("Unexpected response format. Expected a list.")
            return []

        # Map each diamond item from the API data to our internal format
        mapped_diamonds = []
        for item in data:  # Iterate directly over the list
            try:
                if item.get('Available', '').upper() == 'N':
                    continue

                mapped_diamond = map_diamond_data(item)
                if mapped_diamond['shape'] and mapped_diamond['carat'] > 0 and mapped_diamond['price'] > 0:
                    mapped_diamonds.append(mapped_diamond)
            except Exception as e:
                print(f"Error mapping diamond data: {e}")
                continue

        print(f"Successfully loaded {len(mapped_diamonds)} diamonds.")
        return mapped_diamonds
    except Exception as e:
        print(f"Error fetching API data: {e}")
        return []
    
    
def map_diamond_data(json_data):
    try:
        return {
            'id': json_data['stock_num'],
            'shape': json_data['shape'],
            'carat': float(json_data['size']),
            'cut': json_data.get('cut', 'N/A'),
            'color': json_data['color'],
            'clarity': json_data['clarity'],
            'polish': json_data.get('polish', 'N/A'),
            'symmetry': json_data.get('symmetry', 'N/A'),
            'fluorescence': json_data.get('fluor_intensity', ''),
            'price': float(json_data['total_sales_price']) * 1.2,  # Increase price by 20%
            'original_price': float(json_data.get('Rap_price', 0)),
            'discount': float(json_data.get('discount_percent', 0)),
            'certificate': json_data.get('cert_num', ''),
            'measurements': json_data.get('measurement', 'N/A'),
            'table': float(json_data.get('table_percent', 0)),
            'depth': float(json_data.get('depth_percent', 0)),
            'diamond_type': json_data.get('DiamondType', 'N/A'),
            'image_url': json_data.get('image_url', ''),
            'video_url': json_data.get('video_url', ''),
            'lab': json_data.get('lab', ''),
            'location': f"{json_data.get('city', '')}, {json_data.get('country', '')}".strip(', ')
        }
    except Exception as e:
        print(f"Error mapping diamond: {e}")
        raise


# Load diamonds data when the application starts
diamonds_data = load_diamonds_data()
print(f"\nLoaded {len(diamonds_data)} diamonds")

class Pagination:
    def __init__(self, items, page, per_page, total):
        self.items = items
        self.page = page
        self.per_page = per_page
        self.total = total
        
    @property
    def total_pages(self):
        return (self.total + self.per_page - 1) // self.per_page

    @property
    def has_prev(self):
        return self.page > 1

    @property
    def has_next(self):
        return self.page < self.total_pages

@app.route('/')
def home():
    featured_diamonds = diamonds_data[:12] if diamonds_data else []
    return render_template('index.html', featured_diamonds=featured_diamonds)

@app.route('/diamonds')
def diamonds():
    if not diamonds_data:
        print("No diamonds data loaded!")
        flash('No diamonds data available.', 'error')
        return render_template('diamonds.html', diamonds=None, filters={}, current_filters={})

    page = request.args.get('page', 1, type=int)
    per_page = 12
    search_query = request.args.get('search', '')
    sort = request.args.get('sort', 'price_asc')
    
    # Filter parameters (handle multiple values)
    shapes = request.args.getlist('shape')  # Get multiple shapes
    colors = request.args.getlist('color')  # Get multiple colors
    clarities = request.args.getlist('clarity')  # Get multiple clarities
    diamond_types = request.args.getlist('diamond_type')  # Get multiple diamond types
    min_price = request.args.get('min_price', type=float)
    max_price = request.args.get('max_price', type=float)
    min_carat = request.args.get('min_carat', type=float)
    max_carat = request.args.get('max_carat', type=float)

    # Filter the diamonds
    filtered_diamonds = diamonds_data.copy()

    if search_query:
        search_query = search_query.lower()
        filtered_diamonds = [
            d for d in filtered_diamonds
            if search_query in d['shape'].lower() or
               search_query in d['color'].lower() or
               search_query in d['clarity'].lower() or
               search_query in d['diamond_type'].lower()
        ]

    if shapes:
        filtered_diamonds = [d for d in filtered_diamonds if d['shape'] in shapes]
    if colors:
        filtered_diamonds = [d for d in filtered_diamonds if d['color'] in colors]
    if clarities:
        filtered_diamonds = [d for d in filtered_diamonds if d['clarity'] in clarities]
    if diamond_types:
        filtered_diamonds = [d for d in filtered_diamonds if d['diamond_type'] in diamond_types]
    if min_price:
        filtered_diamonds = [d for d in filtered_diamonds if d['price'] >= min_price]
    if max_price:
        filtered_diamonds = [d for d in filtered_diamonds if d['price'] <= max_price]
    if min_carat:
        filtered_diamonds = [d for d in filtered_diamonds if d['carat'] >= min_carat]
    if max_carat:
        filtered_diamonds = [d for d in filtered_diamonds if d['carat'] <= max_carat]

    # Sort the diamonds
    if sort == 'price_asc':
        filtered_diamonds.sort(key=lambda x: x['price'])
    elif sort == 'price_desc':
        filtered_diamonds.sort(key=lambda x: x['price'], reverse=True)
    elif sort == 'carat_desc':
        filtered_diamonds.sort(key=lambda x: x['carat'], reverse=True)
    elif sort == 'newest':
        filtered_diamonds.reverse()  # Assuming newest are at the end of the list

    # Get unique values for filters
    unique_values = {
        'shapes': sorted({d['shape'].strip() for d in diamonds_data if d['shape']}),
        'colors': sorted({d['color'].strip() for d in diamonds_data if d['color']}),
        'clarities': sorted({d['clarity'].strip() for d in diamonds_data if d['clarity']}),
        'diamond_types': sorted({d['diamond_type'].strip() for d in diamonds_data if d['diamond_type']}),
        'max_price': max(d['price'] for d in diamonds_data),
        'min_price': min(d['price'] for d in diamonds_data),
        'max_carat': max(d['carat'] for d in diamonds_data),
        'min_carat': min(d['carat'] for d in diamonds_data)
    }

    # Pagination
    total_diamonds = len(filtered_diamonds)
    start_idx = (page - 1) * per_page
    end_idx = start_idx + per_page

    paginated_diamonds = Pagination(
        filtered_diamonds[start_idx:end_idx],
        page,
        per_page,
        total_diamonds
    )

    return render_template(
        'diamonds.html',
        diamonds=paginated_diamonds,
        filters=unique_values,
        current_filters={
            'search': search_query,
            'shape': shapes,
            'color': colors,
            'clarity': clarities,
            'diamond_type': diamond_types,
            'min_price': min_price,
            'max_price': max_price,
            'min_carat': min_carat,
            'max_carat': max_carat,
            'sort': sort
        }
    )

@app.route('/diamond/<diamond_id>')
def diamond(diamond_id):
    # Match the diamond by its string ID
    diamond = next((d for d in diamonds_data if d['id'] == diamond_id), None)
    if diamond is None:
        abort(404)
    return render_template('diamond.html', diamond=diamond)

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/contact', methods=['GET', 'POST'])
def contact():
    if request.method == 'POST':
        name = request.form.get('name')
        email = request.form.get('email')
        phone = request.form.get('phone')
        subject = request.form.get('subject')
        message = request.form.get('message')

        if not name or not email or not message or not subject:
            flash('Please fill out all required fields.', 'danger')
            return redirect(url_for('contact'))

        try:
            msg = Message(
                subject=f"New Contact Form Submission: {subject}",
                sender=app.config['MAIL_DEFAULT_SENDER'],
                recipients=[app.config['MAIL_RECEIVER_ADDRESS']],
            )
            msg.body = f"""
                Name: {name}
                Email: {email}
                Phone: {phone}
                Subject: {subject}

                Message:
                {message}
                """
            msg.html = render_template("email_template.html", name=name, email=email, phone=phone, subject=subject, message=message)
            mail.send(msg)
            flash('Your message has been sent successfully!', 'success')
        except Exception as e:
            flash('An error occurred while sending your message. Please try again later.', 'danger')
        
        return redirect(url_for('contact'))

    return render_template('contact.html')

@app.template_filter('currency')
def currency_filter(value):
    try:
        return "{:,.2f}".format(float(value))
    except (ValueError, TypeError):
        return "0.00"
