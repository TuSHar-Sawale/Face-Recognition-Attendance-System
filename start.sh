#!/bin/sh
set -e

echo "=========================================================="
echo " [1/2] Launching Python Face Recognition Engine (Port 5001)... "
echo "=========================================================="
cd /app/python-engine
PYTHON_PORT=5001 python server.py &

echo "=========================================================="
echo " [2/2] Launching Node.js Server & React Web UI (Port ${PORT:-5000})... "
echo "=========================================================="
cd /app/server
exec node src/server.js
