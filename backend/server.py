"""
JMT Travel & Tourism - Python Local Companion Server
Provides identical HTTP API & static file serving for local preview
using Python standard library (no third-party pip dependencies required).
"""

import http.server
import socketserver
import os
import json
import mimetypes
import time
from datetime import datetime

PORT = 3000
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PUBLIC_DIR = os.path.abspath(os.path.join(BASE_DIR, '..', 'frontend', 'public'))
DATA_DIR = os.path.join(BASE_DIR, 'data')
REVIEWS_FILE = os.path.join(DATA_DIR, 'reviews.json')
FEEDBACK_FILE = os.path.join(DATA_DIR, 'feedback.json')
VISA_APPLICATIONS_FILE = os.path.join(DATA_DIR, 'visa-applications.json')
BOOKINGS_FILE = os.path.join(DATA_DIR, 'bookings.json')
PACKAGES = [
    {'id': 'dubai-desert', 'title': 'Dubai Desert Escape', 'destination': 'Dubai', 'duration': '4 nights', 'price': 189, 'currency': 'OMR', 'rating': 4.8, 'image': '/assets/destinations/dubai_1.jpg', 'tag': 'Best seller'},
    {'id': 'salalah-khareef', 'title': 'Salalah Khareef Retreat', 'destination': 'Salalah', 'duration': '3 nights', 'price': 129, 'currency': 'OMR', 'rating': 4.9, 'image': '/assets/destinations/salalah_1.jpg', 'tag': 'Seasonal'},
    {'id': 'umrah-serene', 'title': 'Umrah, Made Serene', 'destination': 'Makkah & Madinah', 'duration': '7 nights', 'price': 249, 'currency': 'OMR', 'rating': 4.9, 'image': '/assets/destinations/umrah_1.jpg', 'tag': 'Guided'}
]

# Ensure data files exist
os.makedirs(DATA_DIR, exist_ok=True)
if not os.path.exists(REVIEWS_FILE):
    seed_reviews = [
        {
            "id": "rev-seed-1",
            "name": "Ahmed Al-Balushi",
            "rating": 5,
            "message": "JMT has been our family's trusted agency for over 10 years in Oman. They processed our family Saudi tourist and Umrah visas in less than 24 hours without any hassle. Highly recommended!",
            "created_at": "2024-05-10T08:30:00.000Z"
        },
        {
            "id": "rev-seed-2",
            "name": "Mohammed Razak",
            "rating": 5,
            "message": "Got the best rates for our annual Muscat to Dubai & Doha group flights. Their office staff near Mazda roundabout is always welcoming and very professional.",
            "created_at": "2024-05-24T14:15:00.000Z"
        },
        {
            "id": "rev-seed-3",
            "name": "Sarah Jenkins",
            "rating": 5,
            "message": "Booked the Khareef Salalah holiday package through JMT Travel. Seamless airport transfers, great hotel booking, and transparent pricing. 20+ years of experience really shows in their service quality.",
            "created_at": "2024-06-02T11:45:00.000Z"
        },
        {
            "id": "rev-seed-4",
            "name": "Rashid Al-Kindi",
            "rating": 5,
            "message": "Excellent GCC visa support. Whenever we need urgent UAE or Qatar visas for our corporate staff, JMT handles it swiftly and accurately.",
            "created_at": "2024-06-18T16:20:00.000Z"
        }
    ]
    with open(REVIEWS_FILE, 'w', encoding='utf-8') as f:
        json.dump(seed_reviews, f, indent=2)

if not os.path.exists(FEEDBACK_FILE):
    with open(FEEDBACK_FILE, 'w', encoding='utf-8') as f:
        json.dump([], f, indent=2)
if not os.path.exists(VISA_APPLICATIONS_FILE):
    with open(VISA_APPLICATIONS_FILE, 'w', encoding='utf-8') as f:
        json.dump([], f, indent=2)
if not os.path.exists(BOOKINGS_FILE):
    with open(BOOKINGS_FILE, 'w', encoding='utf-8') as f:
        json.dump([], f, indent=2)

def load_records(path):
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return []

def save_records(path, records):
    temp_path = path + '.tmp'
    with open(temp_path, 'w', encoding='utf-8') as f:
        json.dump(records, f, indent=2)
    os.replace(temp_path, path)

class JMTRequestHandler(http.server.BaseHTTPRequestHandler):
    def _send_json(self, status_code, data):
        response_bytes = json.dumps(data).encode('utf-8')
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(response_bytes)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self.wfile.write(response_bytes)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        path = self.path.split('?')[0]

        # API Routes
        if path == '/api/reviews':
            try:
                with open(REVIEWS_FILE, 'r', encoding='utf-8') as f:
                    reviews = json.load(f)
            except Exception:
                reviews = []

            count = len(reviews)
            total = sum(r.get('rating', 5) for r in reviews)
            avg = round(total / count, 1) if count > 0 else 5.0
            self._send_json(200, {
                'success': True,
                'reviews': reviews,
                'count': count,
                'average': avg
            })
            return

        if path == '/api/health':
            self._send_json(200, {
                'status': 'ok',
                'service': 'JMT Travel & Tourism (Python Server)',
                'timestamp': datetime.utcnow().isoformat() + 'Z'
            })
            return

        if path == '/api/packages':
            self._send_json(200, {'success': True, 'packages': PACKAGES})
            return

        if path.startswith('/api/track/'):
            reference = path.rsplit('/', 1)[-1].strip().upper()
            record = next((item for item in load_records(VISA_APPLICATIONS_FILE) if item.get('id') == reference), None)
            record_type = 'visa'
            if not record:
                record = next((item for item in load_records(BOOKINGS_FILE) if item.get('id') == reference), None)
                record_type = 'booking'
            if not record:
                self._send_json(404, {'success': False, 'error': 'We could not find that JMT reference.'})
                return
            title = f"{record.get('destination')} {record.get('visaType')} visa" if record_type == 'visa' else record.get('packageTitle')
            self._send_json(200, {'success': True, 'type': record_type, 'reference': record['id'], 'status': record['status'], 'created_at': record['created_at'], 'title': title})
            return

        # Serve static files from public/
        clean_path = path.lstrip('/')
        if not clean_path or clean_path == '':
            clean_path = 'index.html'

        file_path = os.path.join(PUBLIC_DIR, clean_path)

        # Fallback to index.html if file doesn't exist (SPA routing)
        if not os.path.exists(file_path) or os.path.isdir(file_path):
            file_path = os.path.join(PUBLIC_DIR, 'index.html')

        if os.path.exists(file_path) and not os.path.isdir(file_path):
            mime_type, _ = mimetypes.guess_type(file_path)
            if not mime_type:
                mime_type = 'application/octet-stream'

            try:
                with open(file_path, 'rb') as f:
                    content = f.read()

                self.send_response(200)
                self.send_header('Content-Type', mime_type)
                self.send_header('Content-Length', str(len(content)))
                self.send_header('Cache-Control', 'no-cache')
                self.end_headers()
                self.wfile.write(content)
            except Exception as e:
                self.send_error(500, f"Error reading file: {e}")
        else:
            self.send_error(404, "File Not Found")

    def do_POST(self):
        path = self.path.split('?')[0]
        content_length = int(self.headers.get('Content-Length', 0))
        post_body = self.rfile.read(content_length).decode('utf-8')

        try:
            payload = json.loads(post_body) if post_body else {}
        except Exception:
            payload = {}

        if path == '/api/reviews':
            website = payload.get('website', '')
            if website and website.strip():
                # Honeypot triggered
                self._send_json(200, {'success': True, 'message': 'Thank you for your review!'})
                return

            name = (payload.get('name') or '').strip()
            rating = payload.get('rating')
            message = (payload.get('message') or '').strip()

            try:
                rating = int(rating)
            except (TypeError, ValueError):
                rating = 5

            if not name or len(name) < 2:
                self._send_json(400, {'success': False, 'error': 'Name is required (at least 2 characters).'})
                return

            if not message or len(message) < 5:
                self._send_json(400, {'success': False, 'error': 'Review message is required.'})
                return

            new_review = {
                'id': f"rev-{int(time.time()*1000)}",
                'name': name,
                'rating': max(1, min(5, rating)),
                'message': message,
                'created_at': datetime.utcnow().isoformat() + 'Z'
            }

            try:
                with open(REVIEWS_FILE, 'r', encoding='utf-8') as f:
                    reviews = json.load(f)
            except Exception:
                reviews = []

            reviews.insert(0, new_review)
            with open(REVIEWS_FILE, 'w', encoding='utf-8') as f:
                json.dump(reviews, f, indent=2)

            self._send_json(201, {
                'success': True,
                'message': 'Your review has been published successfully!',
                'review': new_review
            })
            return

        if path == '/api/feedback':
            website = payload.get('website', '')
            if website and website.strip():
                # Honeypot triggered
                self._send_json(200, {'success': True, 'message': 'Your submission has been received.'})
                return

            name = (payload.get('name') or '').strip()
            contact = (payload.get('contact') or '').strip()
            fb_type = (payload.get('type') or 'feedback').strip().lower()
            message = (payload.get('message') or '').strip()

            if not name:
                self._send_json(400, {'success': False, 'error': 'Name is required.'})
                return
            if not contact:
                self._send_json(400, {'success': False, 'error': 'Contact detail is required.'})
                return
            if not message:
                self._send_json(400, {'success': False, 'error': 'Message is required.'})
                return

            new_fb = {
                'id': f"fb-{int(time.time()*1000)}",
                'name': name,
                'contact': contact,
                'type': fb_type,
                'message': message,
                'created_at': datetime.utcnow().isoformat() + 'Z'
            }

            try:
                with open(FEEDBACK_FILE, 'r', encoding='utf-8') as f:
                    fb_list = json.load(f)
            except Exception:
                fb_list = []

            fb_list.insert(0, new_fb)
            with open(FEEDBACK_FILE, 'w', encoding='utf-8') as f:
                json.dump(fb_list, f, indent=2)

            print(f"[{fb_type.upper()} RECEIVED] from {name} ({contact}): {message[:60]}...")
            self._send_json(200, {
                'success': True,
                'message': 'Thank you! Your feedback has been received and our team will review it shortly.'
            })
            return

        if path == '/api/visa-applications':
            if payload.get('website'):
                self._send_json(200, {'success': True, 'message': 'Application received.'})
                return
            fields = {key: (payload.get(key) or '').strip() for key in ('destination', 'visaType', 'nationality', 'fullName', 'email', 'phone')}
            if any(len(value) < 2 for value in fields.values()) or len(fields['fullName']) > 80 or len(fields['email']) > 120 or len(fields['phone']) > 30:
                self._send_json(400, {'success': False, 'error': 'Please complete all required application fields.'})
                return
            reference = f"JMT-V-{str(int(time.time() * 1000))[-7:]}"
            application = {'id': reference, **fields, 'status': 'Documents required', 'created_at': datetime.utcnow().isoformat() + 'Z'}
            applications = load_records(VISA_APPLICATIONS_FILE)
            applications.insert(0, application)
            save_records(VISA_APPLICATIONS_FILE, applications)
            self._send_json(201, {'success': True, 'reference': reference, 'status': application['status'], 'message': 'Your application has been started. Our visa desk will send your secure document checklist.'})
            return

        if path == '/api/bookings':
            if payload.get('website'):
                self._send_json(200, {'success': True, 'message': 'Booking received.'})
                return
            selected = next((item for item in PACKAGES if item['id'] == payload.get('packageId')), None)
            name, email, phone = [(payload.get(key) or '').strip() for key in ('travellerName', 'email', 'phone')]
            try:
                travellers = int(payload.get('travellers'))
            except (TypeError, ValueError):
                travellers = 0
            if not selected or len(name) < 2 or len(email) < 5 or len(phone) < 3 or not 1 <= travellers <= 12:
                self._send_json(400, {'success': False, 'error': 'Please complete the traveller details and select a package.'})
                return
            reference = f"JMT-B-{str(int(time.time() * 1000))[-7:]}"
            booking = {'id': reference, 'packageId': selected['id'], 'packageTitle': selected['title'], 'travellerName': name, 'email': email, 'phone': phone, 'travellers': travellers, 'amount': selected['price'] * travellers, 'currency': selected['currency'], 'status': 'Payment link pending', 'created_at': datetime.utcnow().isoformat() + 'Z'}
            bookings = load_records(BOOKINGS_FILE)
            bookings.insert(0, booking)
            save_records(BOOKINGS_FILE, bookings)
            self._send_json(201, {'success': True, 'reference': reference, 'status': booking['status'], 'amount': booking['amount'], 'currency': booking['currency'], 'message': 'Your reservation request is held. JMT will send a secure payment link after confirming availability.'})
            return

        self._send_json(404, {'success': False, 'error': 'Endpoint not found'})

def run_server():
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), JMTRequestHandler) as httpd:
        print("=======================================================")
        print("[JMT TRAVEL & TOURISM SERVER RUNNING]")
        print(f"Localhost URL: http://localhost:{PORT}")
        print(f"Serving files from: {PUBLIC_DIR}")
        print("=======================================================")
        httpd.serve_forever()

if __name__ == '__main__':
    run_server()
