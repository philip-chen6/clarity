from flask import Flask, Response, jsonify, request
from flask_cors import CORS
import cv2
import mediapipe as mp
import threading
import base64
import numpy as np
from PIL import Image
from io import BytesIO
import google.generativeai as genai
import os
from dotenv import load_dotenv

# --- Initialization ---
load_dotenv()
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "http://localhost:5173"}})

# --- Global variables ---
frame_lock = threading.Lock()
latest_capture_data = {"image_bytes": None, "boxes": []}

# --- Gemini Setup ---
api_key = os.getenv("GOOGLE_API_KEY")
if not api_key:
    raise ValueError("GOOGLE_API_KEY environment variable not set.")
genai.configure(api_key=api_key)

# --- Video Processing and Streaming Logic ---
def generate_frames():
    global latest_capture_data, frame_lock
    cap = cv2.VideoCapture(0)
    mp_hands = mp.solutions.hands
    hands = mp_hands.Hands(static_image_mode=False, max_num_hands=2, min_detection_confidence=0.5)
    mp_drawing = mp.solutions.drawing_utils

    while True:
        success, frame = cap.read()
        if not success: break
        frame = cv2.flip(frame, 1)
        
        with frame_lock:
            _, buffer = cv2.imencode('.jpg', frame)
            latest_capture_data["image_bytes"] = buffer.tobytes()

        frame_height, frame_width, _ = frame.shape
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = hands.process(rgb_frame)

        current_boxes = []
        if results.multi_hand_landmarks:
            for hand_landmarks in results.multi_hand_landmarks:
                mp_drawing.draw_landmarks(frame, hand_landmarks, mp_hands.HAND_CONNECTIONS)
                x_coords = [landmark.x for landmark in hand_landmarks.landmark]
                y_coords = [landmark.y for landmark in hand_landmarks.landmark]
                x_min, x_max = min(x_coords), max(x_coords)
                y_min, y_max = min(y_coords), max(y_coords)
                
                padding = 0.05 # Padding in relative coordinates
                x_min = int((x_min - padding) * frame_width)
                x_max = int((x_max + padding) * frame_width)
                y_min = int((y_min - padding) * frame_height)
                y_max = int((y_max + padding) * frame_height)

                x_min, y_min = max(0, x_min), max(0, y_min)
                x_max, y_max = min(frame_width, x_max), min(frame_height, y_max)
                
                cv2.rectangle(frame, (x_min, y_min), (x_max, y_max), (0, 255, 0), 2)
                current_boxes.append({'x_min': x_min, 'y_min': y_min, 'x_max': x_max, 'y_max': y_max})
        
        with frame_lock:
            latest_capture_data["boxes"] = current_boxes

        ret, buffer = cv2.imencode('.jpg', frame)
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
    cap.release()
    hands.close()

# --- Classification Logic ---
def classify_pill_images(front_image_bytes, back_image_bytes):
    try:
        model = genai.GenerativeModel('models/gemini-2.5-flash-image')
        img_front = Image.open(BytesIO(front_image_bytes))
        img_back = Image.open(BytesIO(back_image_bytes))
        prompt = [
            "Analyze the following two images of the same pill (front and back)...", # Abridged for brevity
            img_front, img_back
        ]
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        print(f"Error during classification: {e}")
        return "An error occurred during classification."

# --- API Routes ---
@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/capture', methods=['GET'])
def capture_frame():
    with frame_lock:
        frame_bytes = latest_capture_data["image_bytes"]
        boxes = latest_capture_data["boxes"]
    if frame_bytes and boxes:
        frame_base64 = base64.b64encode(frame_bytes).decode('utf-8')
        return jsonify({'image': frame_base64, 'boxes': boxes})
    else:
        return jsonify({'error': 'No frame or hand detected'}), 404

@app.route('/classify', methods=['POST'])
def classify():
    data = request.get_json()
    if not data or 'front_image' not in data or 'back_image' not in data:
        return jsonify({'error': 'Missing image data'}), 400
    try:
        front_bytes = base64.b64decode(data['front_image'])
        back_bytes = base64.b64decode(data['back_image'])
        result_text = classify_pill_images(front_bytes, back_bytes)
        return jsonify({'classification': result_text})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # The key is threaded=True, which makes our server a "multi-lane bridge"
    app.run(host='127.0.0.1', port=5000, debug=True, threaded=True)