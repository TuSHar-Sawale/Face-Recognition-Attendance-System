#!/bin/sh
set -e

echo "=========================================================="
echo " Starting Python AI Face Recognition Engine on port 5001 "
echo "=========================================================="
cd /app/python-engine
PORT=5001 python server.py &
PYTHON_PID=$!

echo "=========================================================="
echo " Starting Node.js API Gateway & React Web Server on port ${PORT:-5000} "
echo "=========================================================="
cd /app/server
node src/server.js &
NODE_PID=$!

# Handle graceful shutdown
trap "kill -TERM $PYTHON_PID $NODE_PID 2>/dev/null" INT TERM

wait -n
exit $?
