from flask import Flask, Response, jsonify
from flask_cors import CORS
import cv2
import mediapipe as mp
import threading
import base64
import numpy as np

# --- Initialization ---
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "http://localhost:5173"}})

# --- Global variables to share the latest data ---
frame_lock = threading.Lock()
latest_capture_data = {
    "image_bytes": None,
    "boxes": []
}

# --- Video Generation and Processing ---
def generate_frames():
    global latest_capture_data, frame_lock

    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("Error: Could not open camera.")
        return

    mp_hands = mp.solutions.hands
    hands = mp_hands.Hands(
        static_image_mode=False,
        max_num_hands=2,
        min_detection_confidence=0.5)
    mp_drawing = mp.solutions.drawing_utils

    while True:
        success, frame = cap.read()
        if not success:
            break

        frame = cv2.flip(frame, 1)
        
        # Store a clean version for the capture endpoint
        with frame_lock:
            _, buffer = cv2.imencode('.jpg', frame)
            latest_capture_data["image_bytes"] = buffer.tobytes()

        # Process for annotations
        frame_height, frame_width, _ = frame.shape
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = hands.process(rgb_frame)

        current_boxes = []
        if results.multi_hand_landmarks:
            for hand_landmarks in results.multi_hand_landmarks:
                mp_drawing.draw_landmarks(frame, hand_landmarks, mp_hands.HAND_CONNECTIONS)
                
                x_min, y_min = frame_width, frame_height
                x_max, y_max = 0, 0
                for landmark in hand_landmarks.landmark:
                    x, y = int(landmark.x * frame_width), int(landmark.y * frame_height)
                    if x < x_min: x_min = x
                    if x > x_max: x_max = x
                    if y < y_min: y_min = y
                    if y > y_max: y_max = y
                
                padding = 40
                x_min, y_min = max(0, x_min - padding), max(0, y_min - padding)
                x_max, y_max = min(frame_width, x_max + padding), min(frame_height, y_max + padding)
                
                cv2.rectangle(frame, (x_min, y_min), (x_max, y_max), (0, 255, 0), 2)
                current_boxes.append({'x_min': x_min, 'y_min': y_min, 'x_max': x_max, 'y_max': y_max})
        
        with frame_lock:
            latest_capture_data["boxes"] = current_boxes

        ret, buffer = cv2.imencode('.jpg', frame)
        frame_bytes = buffer.tobytes()
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

    cap.release()
    hands.close()

# --- API Routes ---
@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

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

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=True, threaded=True)
