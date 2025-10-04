import cv2
import mediapipe as mp
from classify import classify_pill
import os

# --- MediaPipe Setup ---
mp_drawing = mp.solutions.drawing_utils
mp_hands = mp.solutions.hands

# Use the high-level "solutions" API for hand tracking
hands = mp_hands.Hands(
    static_image_mode=False,
    max_num_hands=1, # Focus on one hand for a clearer bounding box
    min_detection_confidence=0.5)

# --- OpenCV Setup ---
cap = cv2.VideoCapture(0)
if not cap.isOpened():
    print("Error: Could not open camera.")
    exit()

print("Camera opened. Press 'c' to capture and classify, 'q' to quit.")

while True:
    success, frame = cap.read()
    if not success:
        print("Error: Failed to capture frame.")
        break

    # Flip for a mirror view and get frame dimensions
    frame = cv2.flip(frame, 1)
    frame_height, frame_width, _ = frame.shape
    
    # Convert to RGB for MediaPipe
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    rgb_frame.flags.writeable = False

    # --- Hand Detection ---
    results = hands.process(rgb_frame)

    # --- Drawing ---
    rgb_frame.flags.writeable = True
    frame = cv2.cvtColor(rgb_frame, cv2.COLOR_RGB2BGR)

    if results.multi_hand_landmarks:
        # We'll process only the first hand detected
        hand_landmarks = results.multi_hand_landmarks[0]
        
        # 1. Draw the hand landmarks (the "dots")
        mp_drawing.draw_landmarks(
            frame,
            hand_landmarks,
            mp_hands.HAND_CONNECTIONS)

        # 2. Calculate and draw the bounding box around the hand
        x_min, y_min = frame_width, frame_height
        x_max, y_max = 0, 0
        for landmark in hand_landmarks.landmark:
            x, y = int(landmark.x * frame_width), int(landmark.y * frame_height)
            if x < x_min: x_min = x
            if x > x_max: x_max = x
            if y < y_min: y_min = y
            if y > y_max: y_max = y
        
        # Add some padding to the box
        padding = 20
        x_min -= padding
        y_min -= padding
        x_max += padding
        y_max += padding

        # Draw the bounding box
        cv2.rectangle(frame, (x_min, y_min), (x_max, y_max), (0, 255, 0), 2)

    cv2.imshow('Hand and Pill Detector', frame)

    key = cv2.waitKey(1) & 0xFF

    if key == ord('c'):
        capture_path = 'images/capture.jpg'
        # We'll save the original frame without the drawings for a cleaner classification
        clean_frame_to_save = cv2.flip(cap.read()[1], 1)
        cv2.imwrite(capture_path, clean_frame_to_save)
        print(f"Image captured and saved to {capture_path}")
        
        print("Classifying pill... please wait.")
        result = classify_pill(capture_path)
        print("\n--- Classification Result ---")
        print(result)
        print("---------------------------\n")

    elif key == ord('q'):
        break

# Clean up
hands.close()
cap.release()
cv2.destroyAllWindows()
