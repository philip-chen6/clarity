from flask import Flask, request, jsonify
from flask_cors import CORS
import base64
from io import BytesIO
from PIL import Image
import google.generativeai as genai
import os
from dotenv import load_dotenv

# --- Initialization ---
load_dotenv()
app = Flask(__name__)
CORS(app, resources={r"/classify": {"origins": "http://localhost:5173"}})

# --- Gemini Setup ---
api_key = os.getenv("GOOGLE_API_KEY")
if not api_key:
    raise ValueError("GOOGLE_API_KEY environment variable not set.")
genai.configure(api_key=api_key)

def classify_pill_images(front_image_bytes, back_image_bytes):
    try:
        model = genai.GenerativeModel('models/gemini-2.5-flash-image')
        img_front = Image.open(BytesIO(front_image_bytes))
        img_back = Image.open(BytesIO(back_image_bytes))
        prompt = [
            "Analyze the following two images of the same pill (front and back). ",
            "Describe the pill's physical characteristics (shape, color). ",
            "What text or numbers are imprinted on it? ",
            "Based *only* on the visual information from both images, what medication does the imprint suggest this might be? ",
            "Frame the response as a visual analysis, not medical advice.",
            img_front,
            img_back
        ]
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        print(f"Error during classification: {e}")
        return "An error occurred during classification."

# --- API Route ---
@app.route('/classify', methods=['POST'])
def classify():
    data = request.get_json()
    if not data or 'front_image' not in data or 'back_image' not in data:
        return jsonify({'error': 'Missing front_image or back_image data'}), 400

    try:
        front_image_bytes = base64.b64decode(data['front_image'])
        back_image_bytes = base64.b64decode(data['back_image'])
        result_text = classify_pill_images(front_image_bytes, back_image_bytes)
        return jsonify({'classification': result_text})
    except Exception as e:
        print(f"An error occurred: {e}")
        return jsonify({'error': 'An internal server error occurred'}), 500

if __name__ == '__main__':
    # This will run on a different port from the video server
    app.run(host='127.0.0.1', port=5001, debug=True)
