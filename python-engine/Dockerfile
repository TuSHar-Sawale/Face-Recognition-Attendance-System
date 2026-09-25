FROM python:3.10-slim

WORKDIR /app

# Install system build dependencies required by dlib, cmake, and OpenCV
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    cmake \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY . .

# Cloud hosts (Render, Railway, Fly, Heroku) inject the PORT environment variable
ENV PORT=5001
EXPOSE 5001

CMD ["python", "server.py"]
