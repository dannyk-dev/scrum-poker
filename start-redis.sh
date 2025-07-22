#!/usr/bin/env bash
# Use this script to start a docker container for a local development Redis server
#
# TO RUN ON WINDOWS:
# 1. Install WSL (Windows Subsystem for Linux) - https://learn.microsoft.com/windows/wsl/install
# 2. Install Docker Desktop or Podman Desktop
# 3. Open WSL - `wsl`
# 4. Run this script - `./start-redis.sh`
#
# On Linux and macOS you can run this script directly - `./start-redis.sh`

set -a
source .env

# Parse Redis connection info from REDIS_URL (e.g. redis://:pass@host:port/db)
REDIS_PASSWORD=$(echo "$REDIS_URL" | awk -F: '{print $3}' | awk -F@ '{print $1}')
REDIS_PORT=$(echo "$REDIS_URL" | awk -F: '{print $4}' | awk -F/ '{print $1}')
REDIS_DB=$(echo "$REDIS_URL" | awk -F/ '{print $4}')
REDIS_DB=${REDIS_DB:-0}

# Allow override via .env, default container name is "redis"
CONTAINER_NAME=${REDIS_CONTAINER_NAME:-redis}

# Check for Docker or Podman
if ! [ -x "$(command -v docker)" ] && ! [ -x "$(command -v podman)" ]; then
  echo -e "Docker or Podman is not installed. Please install one and try again.\nDocker: https://docs.docker.com/engine/install/\nPodman: https://podman.io/getting-started/installation"
  exit 1
fi
if [ -x "$(command -v docker)" ]; then
  DOCKER_CMD="docker"
else
  DOCKER_CMD="podman"
fi

# Ensure daemon is running
if ! $DOCKER_CMD info > /dev/null 2>&1; then
  echo "$DOCKER_CMD daemon is not running. Please start it and try again."
  exit 1
fi

# Check if port is in use
if command -v nc >/dev/null 2>&1; then
  if nc -z localhost "$REDIS_PORT" 2>/dev/null; then
    echo "Port $REDIS_PORT is already in use."
    exit 1
  fi
else
  echo "Warning: netcat (nc) not installed; cannot check port $REDIS_PORT."
  read -p "Continue anyway? [y/N]: " -r REPLY
  if ! [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborting."
    exit 1
  fi
fi

# If container is already running, exit
if [ "$($DOCKER_CMD ps -q -f name=^/${CONTAINER_NAME}$)" ]; then
  echo "Redis container '$CONTAINER_NAME' already running"
  exit 0
fi

# If container exists but stopped, start it
if [ "$($DOCKER_CMD ps -a -q -f name=^/${CONTAINER_NAME}$)" ]; then
  $DOCKER_CMD start "$CONTAINER_NAME"
  echo "Existing Redis container '$CONTAINER_NAME' started"
  exit 0
fi

# Handle missing or default password
if [ -z "$REDIS_PASSWORD" ]; then
  echo "No password specified in REDIS_URL; launching without authentication."
  AUTH_CMD=""
else
  if [ "$REDIS_PASSWORD" = "password" ]; then
    echo "You are using the default Redis password."
    read -p "Generate a random password instead? [y/N]: " -r REPLY
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      REDIS_PASSWORD=$(openssl rand -base64 12 | tr '+/' '-_')
      # update .env (macOS-style; adjust for Linux if needed)
      sed -i '' "s#redis://:password@#redis://:$REDIS_PASSWORD@#" .env
      echo "Updated .env with new password."
    else
      echo "Please change the default password in .env and rerun."
      exit 1
    fi
  fi
  # tell Redis to require a password
  AUTH_CMD="redis-server --requirepass '$REDIS_PASSWORD'"
fi

# Finally, run the container
if [ -z "$AUTH_CMD" ]; then
  $DOCKER_CMD run -d \
    --name "$CONTAINER_NAME" \
    -p "$REDIS_PORT":6379 \
    docker.io/redis:latest \
    && echo "Redis container '$CONTAINER_NAME' started without auth."
else
  $DOCKER_CMD run -d \
    --name "$CONTAINER_NAME" \
    -p "$REDIS_PORT":6379 \
    docker.io/redis:latest \
    sh -c "$AUTH_CMD" \
    && echo "Redis container '$CONTAINER_NAME' created with authentication."
fi
