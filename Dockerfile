# ==============================================================================
# Multi-Stage All-in-One Container: React Client + Node.js API + Python OpenCV AI
# Designed for Render.com Free Tier, Railway, Fly.io, and Docker Compose
# ==============================================================================

# --- Stage 1: Build Frontend React Application ---
FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# --- Stage 2: Production Multi-Service Runner ---
FROM python:3.10-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV NODE_ENV=production
ENV PORT=5000
ENV PYTHON_ENGINE_URL=http://127.0.0.1:5001

# Install system dependencies for OpenCV, curl, and Node.js
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install pre-compiled Python binaries (zero C++ compilation, uses <150MB build RAM)
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

# Install Node.js backend dependencies
COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm install --omit=dev
WORKDIR /app

# Copy application source code
COPY python-engine ./python-engine
COPY server ./server

# Copy built React frontend assets for static SPA serving
COPY --from=client-builder /app/client/dist ./client/dist

# Copy container entrypoint script
COPY start.sh ./start.sh
RUN chmod +x ./start.sh

EXPOSE 5000 10000

CMD ["./start.sh"]
