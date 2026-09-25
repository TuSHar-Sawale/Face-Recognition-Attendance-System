"""
Standalone Desktop OpenCV Attendance Kiosk
Runs a native high-performance OpenCV GUI window directly on the desktop.
Recognizes registered students and employees in real-time,
and automatically logs attendance to the Node.js Express REST API.
"""

import sys
import time
import requests
import cv2
import numpy as np
from face_processor import FaceProcessor

# Optional Windows audio chime
try:
    import winsound
    def play_chime(success=True):
        if success:
            winsound.Beep(1200, 150)
            winsound.Beep(1600, 200)
        else:
            winsound.Beep(400, 250)
except Exception:
    def play_chime(success=True):
        pass

NODE_API_URL = "http://localhost:5000/api"
TOLERANCE = 0.52
COOLDOWN_SECONDS = 60 # Prevent re-logging the same face within 60s in the desktop loop

def fetch_enrolled_members():
    try:
        res = requests.get(f"{NODE_API_URL}/members", timeout=4)
        if res.status_code == 200:
            data = res.json()
            members = data.get("members", [])
            print(f"[INFO] Fetched {len(members)} enrolled members from Node.js backend.")
            return members
    except Exception as e:
        print(f"[WARN] Could not connect to Node.js backend at {NODE_API_URL}: {e}")
    return []

def mark_attendance(member_id: str, confidence: float):
    try:
        payload = {
            "member_id": member_id,
            "confidence": confidence,
            "verification_mode": "desktop_opencv_kiosk"
        }
        res = requests.post(f"{NODE_API_URL}/attendance/mark", json=payload, timeout=3)
        if res.status_code in (200, 201):
            data = res.json()
            return True, data.get("message", "Attendance logged!")
        else:
            data = res.json()
            return False, data.get("error", "Error logging attendance")
    except Exception as e:
        return False, str(e)

def main():
    print("=" * 60)
    print("   AI FACE RECOGNITION ATTENDANCE KIOSK (OPENCV)")
    print("=" * 60)
    print("Controls:")
    print("  'q' / ESC : Quit kiosk")
    print("  'r'       : Reload registered members from database")
    print("  's'       : Capture snapshot")
    print("=" * 60)

    processor = FaceProcessor(tolerance=TOLERANCE)
    members = fetch_enrolled_members()
    processor.update_cache(members)

    cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
    if not cap.isOpened():
        cap = cv2.VideoCapture(0)
    
    if not cap.isOpened():
        print("[ERROR] Cannot access webcam. Please check connections.")
        sys.exit(1)

    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

    recent_logs = {}  # {member_id: last_logged_timestamp}
    status_message = "Kiosk Ready - Looking for faces..."
    status_color = (255, 255, 255)
    status_expiry = 0

    frame_count = 0
    cached_results = []
    fps_start = time.time()
    fps = 0.0

    cv2.namedWindow("Face Recognition Attendance Kiosk", cv2.WINDOW_NORMAL)

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        frame_count += 1
        now = time.time()
        
        # Calculate FPS
        if now - fps_start >= 1.0:
            fps = frame_count / (now - fps_start)
            frame_count = 0
            fps_start = now

        # Detect and recognize every 4 frames
        if frame_count % 4 == 0:
            rec = processor.recognize_faces_in_image(frame)
            if rec.get("detected"):
                cached_results = rec.get("results", [])
                for match in cached_results:
                    if match["matched"] and match["member_id"]:
                        mid = match["member_id"]
                        last_log = recent_logs.get(mid, 0)
                        if (now - last_log) > COOLDOWN_SECONDS:
                            recent_logs[mid] = now
                            conf = match.get("confidence", 90.0)
                            success, msg = mark_attendance(mid, conf)
                            if success:
                                play_chime(True)
                                status_message = f"VERIFIED: {match['name']} ({match['role'].upper()}) - {msg}"
                                status_color = (0, 255, 0)
                            else:
                                status_message = f"INFO: {match['name']} - {msg}"
                                status_color = (0, 215, 255)
                            status_expiry = now + 4.0
            else:
                cached_results = []

        # Annotate
        display_frame = processor.annotate_frame(frame, cached_results)

        # Top HUD Banner
        h, w = display_frame.shape[:2]
        overlay = display_frame.copy()
        cv2.rectangle(overlay, (0, 0), (w, 60), (20, 20, 25), -1)
        cv2.addWeighted(overlay, 0.75, display_frame, 0.25, 0, display_frame)

        # Title and stats
        cv2.putText(display_frame, "SMART ATTENDANCE KIOSK", (20, 38), 
                    cv2.FONT_HERSHEY_DUPLEX, 0.8, (255, 255, 255), 2, cv2.LINE_AA)
        
        stats_text = f"FPS: {fps:.1f} | Enrolled: {len(processor.enrolled_cache)}"
        cv2.putText(display_frame, stats_text, (w - 280, 38), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (180, 220, 255), 1, cv2.LINE_AA)

        # Bottom Status Notification Bar
        if now < status_expiry:
            cv2.rectangle(display_frame, (0, h - 50), (w, h), (15, 15, 20), -1)
            cv2.putText(display_frame, status_message, (30, h - 18), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, status_color, 2, cv2.LINE_AA)

        cv2.imshow("Face Recognition Attendance Kiosk", display_frame)

        key = cv2.waitKey(1) & 0xFF
        if key == ord('q') or key == 27:
            break
        elif key == ord('r'):
            status_message = "Reloading member database..."
            status_color = (0, 255, 255)
            status_expiry = now + 2.0
            members = fetch_enrolled_members()
            count = processor.update_cache(members)
            status_message = f"Loaded {count} registered face embeddings."
            status_expiry = now + 3.0
        elif key == ord('s'):
            filename = f"snapshot_{int(time.time())}.jpg"
            cv2.imwrite(filename, frame)
            status_message = f"Saved snapshot to {filename}"
            status_color = (255, 200, 0)
            status_expiry = now + 3.0

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
