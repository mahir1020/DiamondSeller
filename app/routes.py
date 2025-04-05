from flask import render_template, url_for, flash, redirect, request, jsonify, abort
from app import app, db
from app.models import Diamond
import json
import os

def load_diamonds_data():
    try:
        json_path = os.path.join('instance', 'IGI HPHT CVD STOCKLIST.json')
        with open(json_path, 'r', encoding='utf-8') as file:
            data = json.load(file)
            # Map each diamond item from the JSON data to our internal format
            mapped_diamonds = []
            for item in data['Sheet']:
                try:
                    # Skip any diamonds that are not available (marked as 'N' in Available field)
                    if item.get('Available', '').upper() == 'N':
                        continue
                        
                    mapped_diamond = map_diamond_data(item)
                    # Only add valid diamonds with required fields
                    if mapped_diamond['shape'] and mapped_diamond['carat'] > 0 and mapped_diamond['price'] > 0:
                        mapped_diamonds.append(mapped_diamond)
                except Exception as e:
                    print(f"Error mapping diamond data: {e}")
                    continue
                    
            return mapped_diamonds
    except Exception as e:
        print(f"Error reading JSON file: {e}")
        return []

def map_diamond_data(json_data):
    try:
        return {
            'id': json_data['SR.NO.'],
            'shape': json_data['Shape '].strip() if 'Shape ' in json_data else '',
            'carat': float(json_data['Weight']),
            'cut': json_data.get('Cut', 'N/A'),
            'color': json_data['Col'],
            'clarity': json_data['Clr'],
            'polish': json_data['Pol'],
            'symmetry': json_data['Sym'],
            'fluorescence': json_data['Flur'],
            'price': float(json_data['Net Rate']),
            'original_price': float(json_data['Rate']),
            'discount': float(json_data['Disc%']),
            'certificate': json_data['Certi No'],
            'measurements': json_data.get('Measurements', 'N/A'),
            'table': json_data.get('Table Prct', 0),
            'depth': json_data.get('Depth Prct', 0),
            'diamond_type': json_data['Diamon Type'],
            'image_url': json_data.get('image Link', ''),
            'video_url': json_data.get('Video Link', ''),
            'lab': json_data['Lab'],
            'location': json_data['branch Name']
        }
    except Exception as e:
        print(f"Error mapping diamond: {e}")
        raise

# Load diamonds data when the application starts
diamonds_data = load_diamonds_data()
# print(diamonds_data)

# After loading diamonds_data
print(f"\nLoaded {len(diamonds_data)} diamonds")

@app.route('/')
def home():
    featured_diamonds = diamonds_data[:9] if diamonds_data else []
    return render_template('index.html', featured_diamonds=featured_diamonds)

@app.route('/diamonds')
def diamonds():
    if not diamonds_data:
        print("No diamonds data loaded!")
        flash('No diamonds data available.', 'error')
        return render_template('diamonds.html', diamonds=None, filters={}, current_filters={})

    # Debug prints
    print("\nFirst diamond data:", diamonds_data[0])
    print("\nShape values:", set(d['shape'] for d in diamonds_data))
    print("\nColor values:", set(d['color'] for d in diamonds_data))
    print("\nClarity values:", set(d['clarity'] for d in diamonds_data))
    print("\nDiamond type values:", set(d['diamond_type'] for d in diamonds_data))

    page = request.args.get('page', 1, type=int)
    per_page = 9
    search_query = request.args.get('search', '')
    
    # Filter parameters
    shape = request.args.get('shape', '')
    color = request.args.get('color', '')
    clarity = request.args.get('clarity', '')
    min_price = request.args.get('min_price', type=float)
    max_price = request.args.get('max_price', type=float)
    min_carat = request.args.get('min_carat', type=float)
    max_carat = request.args.get('max_carat', type=float)
    diamond_type = request.args.get('diamond_type', '')

    # Debug print
    print("Available shapes:", set(d['shape'] for d in diamonds_data))
    print("Selected shape:", shape)

    # Filter the diamonds
    filtered_diamonds = diamonds_data.copy()
    
    if search_query:
        filtered_diamonds = [
            d for d in filtered_diamonds 
            if search_query.lower() in str(d).lower()
        ]
    
    if shape:
        filtered_diamonds = [d for d in filtered_diamonds if d['shape'].strip().lower() == shape.strip().lower()]
    if color:
        filtered_diamonds = [d for d in filtered_diamonds if d['color'].strip().lower() == color.strip().lower()]
    if clarity:
        filtered_diamonds = [d for d in filtered_diamonds if d['clarity'].strip().lower() == clarity.strip().lower()]
    if diamond_type:
        filtered_diamonds = [d for d in filtered_diamonds if d['diamond_type'].strip().lower() == diamond_type.strip().lower()]
    if min_price:
        filtered_diamonds = [d for d in filtered_diamonds if d['price'] >= min_price]
    if max_price:
        filtered_diamonds = [d for d in filtered_diamonds if d['price'] <= max_price]
    if min_carat:
        filtered_diamonds = [d for d in filtered_diamonds if d['carat'] >= min_carat]
    if max_carat:
        filtered_diamonds = [d for d in filtered_diamonds if d['carat'] <= max_carat]

    # Get unique values for filters (before pagination)
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

    # Debug print
    print("Unique values:", unique_values)
    print("Number of filtered diamonds:", len(filtered_diamonds))

    # Pagination
    total_diamonds = len(filtered_diamonds)
    start_idx = (page - 1) * per_page
    end_idx = start_idx + per_page
    
    class Pagination:
        def __init__(self, items, page, per_page, total):
            self.items = items
            self.page = page
            self.per_page = per_page
            self.total = total
            
        def iter_pages(self):
            total_pages = (self.total + self.per_page - 1) // self.per_page
            return range(1, total_pages + 1)

        @property
        def total_pages(self):
            return (self.total + self.per_page - 1) // self.per_page

        @property
        def has_prev(self):
            return self.page > 1

        @property
        def has_next(self):
            return self.page < self.total_pages

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
            'shape': shape,
            'color': color,
            'clarity': clarity,
            'diamond_type': diamond_type,
            'min_price': min_price,
            'max_price': max_price,
            'min_carat': min_carat,
            'max_carat': max_carat
        }
    )

@app.route('/diamond/<int:diamond_id>')
def diamond(diamond_id):
    diamond = next((d for d in diamonds_data if d['id'] == diamond_id), None)
    if diamond is None:
        abort(404)
    return render_template('diamond.html', diamond=diamond)

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/contact')
def contact():
    return render_template('contact.html')

@app.template_filter('currency')
def currency_filter(value):
    try:
        return "{:,.2f}".format(float(value))
    except (ValueError, TypeError):
        return "0.00"
