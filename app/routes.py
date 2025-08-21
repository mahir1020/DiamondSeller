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


@app.route('/api/diamonds')
def api_diamonds():
    # Get filter parameters from request
    page = request.args.get('page', 1, type=int)
    per_page = 12

    # Filter parameters
    carat_min = request.args.get('carat_min', type=float)
    carat_max = request.args.get('carat_max', type=float)
    price_min = request.args.get('price_min', type=float)
    price_max = request.args.get('price_max', type=float)
    color_min = request.args.get('color_min', type=int)
    color_max = request.args.get('color_max', type=int)
    cut_min = request.args.get('cut_min', type=int)
    cut_max = request.args.get('cut_max', type=int)
    clarity_min = request.args.get('clarity_min', type=int)
    clarity_max = request.args.get('clarity_max', type=int)

    # New filters for diamond type and shape
    diamond_type = request.args.get('diamond_type')
    diamond_shape = request.args.get('diamond_shape')

    print(f"Received filters: carat_min={carat_min}, carat_max={carat_max}, price_min={price_min}, price_max={price_max}, "
          f"color_min={color_min}, color_max={color_max}, cut_min={cut_min}, cut_max={cut_max}, "
          f"clarity_min={clarity_min}, clarity_max={clarity_max}, diamond_type={diamond_type}, diamond_shape={diamond_shape}")

    shape_map = {
        "round": "RD",
        "princess": "PR",
        "cushion": "CU",
        "oval": "OV",
        "radiant": "RAD",
        "emerald": "EM",
        "asscher": "AC",
        "pear": "PB",
        "heart": "HT",
        "marquise": "MQ",
        "baguette": "BAG",
        "square-emerald": "SQEM",
        "square": "SQ",
        "octagon": "OT"
    }

    # Filter the diamonds
    filtered_diamonds = diamonds_data.copy()

    # Apply existing filters
    if carat_min is not None:
        filtered_diamonds = [d for d in filtered_diamonds if d['carat'] >= carat_min]
    if carat_max is not None:
        filtered_diamonds = [d for d in filtered_diamonds if d['carat'] <= carat_max]
    if price_min is not None:
        filtered_diamonds = [d for d in filtered_diamonds if d['price'] >= price_min]
    if price_max is not None:
        filtered_diamonds = [d for d in filtered_diamonds if d['price'] <= price_max]

    # Color filtering
    color_values = ['D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L-Z']
    if color_min is not None and color_max is not None and color_min <= color_max:
        selected_colors = color_values[color_min:color_max+1]
        print(f"Filtering by colors: {selected_colors}")
        filtered_diamonds = [d for d in filtered_diamonds if d['color'] in selected_colors]

    # Cut filtering
    cut_values = ['I', 'EX', 'VG', 'G', 'F', 'None', 'N/A']
    if cut_min is not None and cut_max is not None and cut_min <= cut_max:
        selected_cuts = cut_values[cut_min:cut_max+1]
        print(f"Filtering by cuts: {selected_cuts}")
        filtered_diamonds = [d for d in filtered_diamonds if d['cut'] in selected_cuts]

    # Clarity filtering
    clarity_values = ['IF', 'VVS1', 'VVS2', 'VS1', 'VS2', 'SI1', 'SI2', 'I1-I3']
    if clarity_min is not None and clarity_max is not None and clarity_min <= clarity_max:
        selected_clarities = clarity_values[clarity_min:clarity_max+1]
        print(f"Filtering by clarities: {selected_clarities}")
        filtered_diamonds = [d for d in filtered_diamonds if d['clarity'] in selected_clarities]

    # New filters for diamond type
    if diamond_type:
        print(f"Filtering by diamond type: {diamond_type}")
        filtered_diamonds = [d for d in filtered_diamonds if d['diamond_type'].lower() == diamond_type.lower()]

    # New filters for diamond shape
    if diamond_shape:
        api_shape = shape_map.get(diamond_shape.lower())
        if api_shape:
            filtered_diamonds = [d for d in filtered_diamonds if d['shape'].upper() == api_shape]


    print(f"Filtered diamonds count: {len(filtered_diamonds)}")

    # Pagination
    total_diamonds = len(filtered_diamonds)
    start_idx = (page - 1) * per_page
    end_idx = start_idx + per_page
    paginated_diamonds = filtered_diamonds[start_idx:end_idx]

    # Format diamonds for response
    formatted_diamonds = []
    for diamond in paginated_diamonds:
        formatted_diamonds.append({
            'id': diamond['id'],
            'shape': diamond['shape'],
            'carat': diamond['carat'],
            'color': diamond['color'],
            'clarity': diamond['clarity'],
            'cut': diamond['cut'],
            'price': diamond['price'],
            'diamond_type': diamond['diamond_type'],
            'image_url': diamond['image_url'],
            'video_url': diamond['video_url']
        })

    print(f"Returning {len(formatted_diamonds)} diamonds")
    return jsonify({
        'diamonds': formatted_diamonds,
        'total': total_diamonds,
        'page': page,
        'per_page': per_page,
        'total_pages': (total_diamonds + per_page - 1) // per_page
    })



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



@app.route('/diamond-request', methods=['GET', 'POST'])
def diamond_request():
    if request.method == 'POST':
        # --- Retrieve personal info ---
        full_name = request.form.get('full_name')
        email = request.form.get('email')
        phone = request.form.get('phone')

        # --- Retrieve diamond info ---
        diamond_type = request.form.get('diamond_type')
        shape = request.form.get('shape')
        carat = request.form.get('carat')
        color = request.form.get('color')
        clarity = request.form.get('clarity')
        price = request.form.get('price')
        image = request.files.get('image')

        # --- Basic validation ---
        required_fields = [full_name, email, diamond_type, shape, carat, color, clarity]
        if not all(required_fields):
            return jsonify({"message": "Please fill out all required fields."}), 400

        # --- Handle image upload ---
        image = request.files.get('image')  # Uploaded file


        # --- Prepare email ---
        try:
            msg_body = f"""
            Personal Information:
            Full Name: {full_name}
            Email: {email}
            Phone: {phone or 'N/A'}

            Diamond Request:
            Type: {diamond_type}
            Shape: {shape}
            Carat: {carat}
            Color: {color}
            Clarity: {clarity}
            Price: {price or 'N/A'}
            Image: {image or 'No image'}
            """

            msg = Message(
                subject=f"New Diamond Request: {diamond_type}",
                sender=app.config['MAIL_DEFAULT_SENDER'],
                recipients=[app.config['MAIL_RECEIVER_ADDRESS']],
                body=msg_body
            )
            # Attach image directly if present
            if image:
            # image.read() gets the file bytes
                msg.attach(
                    filename=image.filename,
                    content_type=image.content_type,
                    data=image.read()
                )

            mail.send(msg)
            return jsonify({"message": "Your diamond request has been received!"}), 200
        except Exception as e:
            print("Error sending email:", e)
            return jsonify({"message": "An error occurred while processing your request."}), 500

    # GET request
    return render_template('diamonds.html')



@app.template_filter('currency')
def currency_filter(value):
    try:
        return "{:,.2f}".format(float(value))
    except (ValueError, TypeError):
        return "0.00"
