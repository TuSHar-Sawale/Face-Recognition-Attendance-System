"""
FastAPI Server for OpenCV & Face Recognition Service
Serves endpoints for embedding extraction, face matching, and real-time MJPEG camera stream.
"""

import os
import time
import asyncio
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import cv2
import numpy as np

from face_processor import FaceProcessor

app = FastAPI(
    title="OpenCV Face Recognition Service",
    description="Microservice providing real-time facial feature extraction and matching.",
    version="1.0.0"
)

# Enable CORS for frontend and Node.js backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

processor = FaceProcessor(tolerance=0.52)

# Global video capture instance for streaming
camera_lock = asyncio.Lock()
video_capture: Optional[cv2.VideoCapture] = None


def get_camera() -> Optional[cv2.VideoCapture]:
    global video_capture
    if video_capture is None or not video_capture.isOpened():
        video_capture = cv2.VideoCapture(0, cv2.CAP_DSHOW)
        if not video_capture.isOpened():
            # Try default backend if DSHOW fails
            video_capture = cv2.VideoCapture(0)
        if video_capture.isOpened():
            video_capture.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
            video_capture.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
            video_capture.set(cv2.CAP_PROP_FPS, 30)
    return video_capture


class ExtractEmbeddingRequest(BaseModel):
    image_base64: str

class RecognizeRequest(BaseModel):
    image_base64: str
    tolerance: Optional[float] = None
    members: Optional[List[Dict[str, Any]]] = None

class SyncCacheRequest(BaseModel):
    members: List[Dict[str, Any]]
    tolerance: Optional[float] = None

class SettingsRequest(BaseModel):
    tolerance: float


@app.get("/health")
def health_check():
    global video_capture
    if video_capture is not None:
        try:
            video_capture.release()
        except Exception:
            pass
        video_capture = None

    return {
        "status": "online",
        "service": "Face Recognition Python Engine",
        "tolerance": processor.tolerance,
        "cached_members_count": len(processor.enrolled_cache),
        "camera_available": True
    }


@app.post("/api/extract-embedding")
async def extract_embedding(payload: ExtractEmbeddingRequest):
    """
    Extract 128D embedding vector from a single base64 image (for new enrollment).
    """
    try:
        bgr_img = processor.decode_image_from_base64(payload.image_base64)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image format: {str(e)}")

    result = processor.extract_single_face_embedding(bgr_img)
    if not result["success"]:
        return result
    return result


@app.post("/api/extract-embedding-file")
async def extract_embedding_file(file: UploadFile = File(...)):
    """
    Extract 128D embedding vector from uploaded file (multipart/form-data).
    """
    try:
        content = await file.read()
        bgr_img = processor.decode_image_from_bytes(content)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read image file: {str(e)}")

    result = processor.extract_single_face_embedding(bgr_img)
    return result


@app.post("/api/recognize-frame")
async def recognize_frame(payload: RecognizeRequest):
    """
    Recognize faces in a single frame base64 string against enrolled members.
    """
    try:
        bgr_img = processor.decode_image_from_base64(payload.image_base64)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image: {str(e)}")

    tol = payload.tolerance if payload.tolerance is not None else processor.tolerance
    result = processor.recognize_faces_in_image(
        bgr_img=bgr_img,
        known_members=payload.members,
        custom_tolerance=tol
    )
    return result


@app.post("/api/sync-cache")
def sync_cache(payload: SyncCacheRequest):
    """
    Sync in-memory vector cache with the latest list of registered members.
    """
    if payload.tolerance is not None:
        processor.tolerance = payload.tolerance
    count = processor.update_cache(payload.members)
    return {
        "success": True,
        "synced_count": count,
        "tolerance": processor.tolerance
    }


@app.post("/api/set-tolerance")
def set_tolerance(payload: SettingsRequest):
    """
    Adjust recognition tolerance (0.35 - 0.70).
    """
    processor.tolerance = max(0.35, min(0.70, payload.tolerance))
    return {
        "success": True,
        "tolerance": processor.tolerance
    }


def generate_mjpeg_stream():
    """Generator for streaming live MJPEG camera feed with real-time OpenCV annotations."""
    cam = get_camera()
    if not cam or not cam.isOpened():
        # Generate placeholder frame if camera unavailable
        placeholder = np.zeros((480, 640, 3), dtype=np.uint8)
        cv2.putText(placeholder, "Camera not accessible", (120, 240), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 0, 255), 2)
        _, jpeg = cv2.imencode('.jpg', placeholder)
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + jpeg.tobytes() + b'\r\n')
        return

    frame_skip = 0
    cached_results = []
    fps_start_time = time.time()
    fps_frame_count = 0
    fps = 0.0

    while True:
        success, frame = cam.read()
        if not success:
            time.sleep(0.05)
            continue

        fps_frame_count += 1
        elapsed = time.time() - fps_start_time
        if elapsed >= 1.0:
            fps = round(fps_frame_count / elapsed, 1)
            fps_frame_count = 0
            fps_start_time = time.time()

        # Run face recognition every 3 frames to maintain high 30 FPS video fluidity
        frame_skip += 1
        if frame_skip % 3 == 0:
            rec = processor.recognize_faces_in_image(frame)
            if rec.get("detected"):
                cached_results = rec.get("results", [])
            else:
                cached_results = []

        # Annotate bounding boxes and tags
        annotated = processor.annotate_frame(frame, cached_results)

        # Draw FPS and Status badge
        cv2.putText(annotated, f"FPS: {fps} | Enrolled: {len(processor.enrolled_cache)}", 
                    (15, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2, cv2.LINE_AA)

        # Encode as JPEG
        ret, jpeg = cv2.imencode('.jpg', annotated, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
        if not ret:
            continue

        frame_bytes = jpeg.tobytes()
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
        time.sleep(0.01)


@app.get("/api/stream")
def video_stream():
    """
    Live MJPEG stream of the OpenCV camera with real-time detection overlay.
    Usable in <img src="http://localhost:5001/api/stream" />
    """
    return StreamingResponse(
        generate_mjpeg_stream(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 5001))
    print(f"Starting OpenCV Face Recognition Server on http://0.0.0.0:{port} ...")
    uvicorn.run("server:app", host="0.0.0.0", port=port, reload=False)
