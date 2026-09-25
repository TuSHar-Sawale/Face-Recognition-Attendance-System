"""
Face Recognition & OpenCV Processing Engine
Real-time face detection, 128D embedding extraction, and matching.
"""

import base64
import io
import time
from typing import List, Dict, Any, Optional, Tuple
import cv2
import numpy as np
import face_recognition
from PIL import Image


class FaceProcessor:
    def __init__(self, tolerance: float = 0.52):
        """
        :param tolerance: Distance threshold for face matching (default 0.52).
                          Lower = stricter (less false positives).
                          Higher = more lenient.
        """
        self.tolerance = tolerance
        # In-memory member cache: {member_id: {"name": str, "role": str, "department": str, "embedding": np.ndarray}}
        self.enrolled_cache: Dict[str, Dict[str, Any]] = {}

    def decode_image_from_base64(self, base64_str: str) -> np.ndarray:
        """Decode base64 string (including data URL header) into OpenCV BGR numpy array."""
        if "," in base64_str:
            base64_str = base64_str.split(",", 1)[1]
        img_bytes = base64.b64decode(base64_str)
        pil_img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        # Convert RGB PIL to BGR OpenCV format
        rgb_arr = np.array(pil_img)
        bgr_img = cv2.cvtColor(rgb_arr, cv2.COLOR_RGB2BGR)
        return bgr_img

    def decode_image_from_bytes(self, image_bytes: bytes) -> np.ndarray:
        """Decode raw image bytes into OpenCV BGR numpy array."""
        pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        rgb_arr = np.array(pil_img)
        bgr_img = cv2.cvtColor(rgb_arr, cv2.COLOR_RGB2BGR)
        return bgr_img

    def calculate_sharpness(self, bgr_img: np.ndarray) -> float:
        """Calculate image sharpness using Laplacian variance."""
        gray = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2GRAY)
        return float(cv2.Laplacian(gray, cv2.CV_64F).var())

    def distance_to_confidence(self, distance: float, threshold: float = 0.52) -> float:
        """
        Convert Euclidean face distance into an intuitive confidence percentage (0% - 100%).
        When distance is close to 0 -> ~99% confidence.
        When distance equals threshold -> ~80% confidence.
        When distance exceeds threshold -> drops below 60%.
        """
        if distance <= 0.0:
            return 99.9
        if distance >= 1.0:
            return 20.0
        
        # Linear piecewise conversion calibrated to dlib Euclidean metric
        if distance <= threshold:
            linear_factor = (1.0 - (distance / (threshold * 2.0)))
            confidence = linear_factor * 100.0
        else:
            # Steep drop off when distance > threshold
            over_margin = (distance - threshold) / (1.0 - threshold)
            confidence = max(10.0, 75.0 - (over_margin * 60.0))
            
        return round(float(confidence), 2)

    def extract_single_face_embedding(self, bgr_img: np.ndarray) -> Dict[str, Any]:
        """
        Detects face and extracts 128D embedding from an enrollment photo.
        Requires exactly one clear face for reliable registration.
        """
        rgb_img = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2RGB)
        sharpness = self.calculate_sharpness(bgr_img)
        is_blurry = sharpness < 40.0

        # Detect face locations
        face_locations = face_recognition.face_locations(rgb_img, model="hog")
        
        if len(face_locations) == 0:
            return {
                "success": False,
                "error": "No face detected. Please ensure good lighting and face directly into camera.",
                "sharpness": sharpness,
                "is_blurry": is_blurry,
                "face_count": 0
            }
        
        if len(face_locations) > 1:
            return {
                "success": False,
                "error": f"Multiple faces ({len(face_locations)}) detected. Registration requires a single person in frame.",
                "sharpness": sharpness,
                "is_blurry": is_blurry,
                "face_count": len(face_locations)
            }

        top, right, bottom, left = face_locations[0]
        encodings = face_recognition.face_encodings(rgb_img, known_face_locations=[face_locations[0]])
        
        if len(encodings) == 0:
            return {
                "success": False,
                "error": "Could not compute facial landmarks and embedding. Please retry.",
                "sharpness": sharpness,
                "is_blurry": is_blurry,
                "face_count": 1
            }

        embedding = encodings[0].tolist()

        return {
            "success": True,
            "face_count": 1,
            "embedding": embedding,
            "bounding_box": {
                "top": int(top),
                "right": int(right),
                "bottom": int(bottom),
                "left": int(left),
                "width": int(right - left),
                "height": int(bottom - top)
            },
            "sharpness": round(sharpness, 2),
            "is_blurry": is_blurry,
            "image_dimensions": {
                "width": bgr_img.shape[1],
                "height": bgr_img.shape[0]
            }
        }

    def update_cache(self, members_list: List[Dict[str, Any]]):
        """Update local in-memory registry of enrolled member face embeddings."""
        self.enrolled_cache.clear()
        count = 0
        for m in members_list:
            mid = m.get("member_id") or str(m.get("id"))
            emb = m.get("face_embedding")
            if mid and emb and isinstance(emb, list) and len(emb) == 128:
                self.enrolled_cache[mid] = {
                    "member_id": mid,
                    "name": m.get("name", "Unknown"),
                    "role": m.get("role", "student"),
                    "department": m.get("department", "General"),
                    "avatar_url": m.get("avatar_url", ""),
                    "embedding": np.array(emb, dtype=np.float64)
                }
                count += 1
        return count

    def recognize_faces_in_image(
        self, 
        bgr_img: np.ndarray, 
        known_members: Optional[List[Dict[str, Any]]] = None,
        custom_tolerance: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Detect all faces in frame and compare against enrolled member embeddings.
        """
        tol = custom_tolerance if custom_tolerance is not None else self.tolerance
        
        # Prepare known registry
        registry = {}
        if known_members:
            for m in known_members:
                mid = m.get("member_id") or str(m.get("id"))
                emb = m.get("face_embedding")
                if mid and emb and isinstance(emb, list) and len(emb) == 128:
                    registry[mid] = {
                        "member_id": mid,
                        "name": m.get("name", "Unknown"),
                        "role": m.get("role", "student"),
                        "department": m.get("department", "General"),
                        "avatar_url": m.get("avatar_url", ""),
                        "embedding": np.array(emb, dtype=np.float64)
                    }
        else:
            registry = self.enrolled_cache

        rgb_img = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2RGB)
        
        # Resize frame slightly for real-time acceleration if larger than 720p
        h, w = bgr_img.shape[:2]
        scale = 1.0
        if w > 960:
            scale = 960.0 / w
            resized_rgb = cv2.resize(rgb_img, (0, 0), fx=scale, fy=scale)
        else:
            resized_rgb = rgb_img

        face_locations = face_recognition.face_locations(resized_rgb, model="hog")
        if len(face_locations) == 0:
            return {
                "detected": False,
                "faces_count": 0,
                "results": []
            }

        face_encodings = face_recognition.face_encodings(resized_rgb, face_locations)

        results = []
        known_ids = list(registry.keys())
        known_vectors = [registry[mid]["embedding"] for mid in known_ids]

        for i, face_encoding in enumerate(face_encodings):
            # Scale coordinates back up to original image resolution
            top, right, bottom, left = face_locations[i]
            if scale != 1.0:
                top = int(top / scale)
                right = int(right / scale)
                bottom = int(bottom / scale)
                left = int(left / scale)

            box_dict = {
                "top": int(top),
                "right": int(right),
                "bottom": int(bottom),
                "left": int(left),
                "width": int(right - left),
                "height": int(bottom - top)
            }

            if not known_vectors:
                # No enrolled members in system yet
                results.append({
                    "matched": False,
                    "member_id": None,
                    "name": "Unregistered Face",
                    "role": None,
                    "department": None,
                    "distance": 1.0,
                    "confidence": 0.0,
                    "bounding_box": box_dict
                })
                continue

            # Compute Euclidean distances to all enrolled vectors
            distances = face_recognition.face_distance(known_vectors, face_encoding)
            best_match_idx = int(np.argmin(distances))
            best_distance = float(distances[best_match_idx])

            if best_distance <= tol:
                matched_id = known_ids[best_match_idx]
                info = registry[matched_id]
                confidence = self.distance_to_confidence(best_distance, tol)
                results.append({
                    "matched": True,
                    "member_id": matched_id,
                    "name": info["name"],
                    "role": info["role"],
                    "department": info["department"],
                    "avatar_url": info.get("avatar_url", ""),
                    "distance": round(best_distance, 4),
                    "confidence": confidence,
                    "bounding_box": box_dict
                })
            else:
                confidence = self.distance_to_confidence(best_distance, tol)
                results.append({
                    "matched": False,
                    "member_id": None,
                    "name": "Unknown",
                    "role": None,
                    "department": None,
                    "distance": round(best_distance, 4),
                    "confidence": confidence,
                    "bounding_box": box_dict
                })

        return {
            "detected": True,
            "faces_count": len(results),
            "results": results
        }

    def annotate_frame(self, frame: np.ndarray, recognition_results: List[Dict[str, Any]]) -> np.ndarray:
        """
        Draw clean bounding boxes and HUD name/confidence badges on OpenCV frame.
        """
        annotated = frame.copy()
        for res in recognition_results:
            box = res["bounding_box"]
            top, right, bottom, left = box["top"], box["right"], box["bottom"], box["left"]
            matched = res["matched"]
            name = res["name"]
            conf = res.get("confidence", 0)

            # Colors: Green for verified match, Red for unknown
            color = (0, 210, 80) if matched else (40, 50, 230) # BGR
            corner_color = (255, 255, 255)

            # Bounding box
            cv2.rectangle(annotated, (left, top), (right, bottom), color, 2)

            # Corner accents
            line_len = max(10, int((right - left) * 0.15))
            thick = 3
            # Top-left
            cv2.line(annotated, (left, top), (left + line_len, top), corner_color, thick)
            cv2.line(annotated, (left, top), (left, top + line_len), corner_color, thick)
            # Top-right
            cv2.line(annotated, (right, top), (right - line_len, top), corner_color, thick)
            cv2.line(annotated, (right, top), (right, top + line_len), corner_color, thick)
            # Bottom-left
            cv2.line(annotated, (left, bottom), (left + line_len, bottom), corner_color, thick)
            cv2.line(annotated, (left, bottom), (left, bottom - line_len), corner_color, thick)
            # Bottom-right
            cv2.line(annotated, (right, bottom), (right - line_len, bottom), corner_color, thick)
            cv2.line(annotated, (right, bottom), (right, bottom - line_len), corner_color, thick)

            # Label text & background
            label = f"{name} ({conf:.0f}%)" if matched else "Unknown"
            (text_w, text_h), baseline = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.55, 2)
            
            badge_top = max(0, top - text_h - 10)
            cv2.rectangle(annotated, (left, badge_top), (left + text_w + 12, badge_top + text_h + 8), color, cv2.FILLED)
            cv2.putText(annotated, label, (left + 6, badge_top + text_h + 3), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 2, cv2.LINE_AA)

        return annotated
