FROM python:3.10-slim

WORKDIR /app

# Install runtime dependencies for OpenCV
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Install pre-compiled Python binaries (zero C++ compilation)
RUN pip install --no-cache-dir \
    fastapi>=0.110.0 \
    uvicorn>=0.28.0 \
    dlib-bin \
    face_recognition_models \
    opencv-python-headless>=4.9.0 \
    numpy>=1.26.0 \
    python-multipart>=0.0.9 \
    pillow>=10.2.0 \
    requests>=2.31.0 \
    && pip install --no-cache-dir --no-deps face-recognition>=1.3.0

# Copy application source code
COPY . .

# Cloud hosts (Render, Railway, Fly, Heroku) inject the PORT environment variable
ENV PORT=5001
EXPOSE 5001

CMD ["python", "server.py"]
