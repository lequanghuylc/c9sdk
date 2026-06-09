#!/bin/bash
set -e

# Default sub path to "ide" if not set
SUB_PATH="${C9_SUB_PATH:-ide}"

echo "Starting c9sdk with C9_SUB_PATH=$SUB_PATH"
echo "Access the IDE at: http://localhost:8080/$SUB_PATH/"

# Build the Docker image with C9_SUB_PATH
cd c9sdk-pm2-nginx
docker build --build-arg C9_SUB_PATH="$SUB_PATH" -t lequanghuylc/c9sdk-pm2-ubuntu:latest .

# Run the container
docker run --platform linux/amd64 --rm -p 8080:8080 -p 3399:3399 lequanghuylc/c9sdk-pm2-ubuntu:latest
