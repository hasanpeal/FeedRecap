#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLIENT_PORT="${CLIENT_PORT:-3000}"
SERVER_PORT="${SERVER_PORT:-3001}"

kill_port() {
  local port="$1"
  local pids

  pids="$(lsof -ti :"$port" || true)"
  if [[ -n "$pids" ]]; then
    echo "Killing process(es) on port $port: $pids"
    kill $pids || true
    sleep 1

    pids="$(lsof -ti :"$port" || true)"
    if [[ -n "$pids" ]]; then
      echo "Force killing process(es) on port $port: $pids"
      kill -9 $pids || true
    fi
  else
    echo "Port $port is free"
  fi
}

cleanup() {
  echo
  echo "Stopping FeedRecap dev processes..."
  [[ -n "${SERVER_PID:-}" ]] && kill "$SERVER_PID" 2>/dev/null || true
  [[ -n "${CLIENT_PID:-}" ]] && kill "$CLIENT_PID" 2>/dev/null || true
}

trap cleanup EXIT INT TERM

kill_port "$CLIENT_PORT"
kill_port "$SERVER_PORT"

echo "Starting server on port $SERVER_PORT..."
(
  cd "$ROOT_DIR/server"
  PORT="$SERVER_PORT" npm start
) &
SERVER_PID=$!

echo "Starting client on port $CLIENT_PORT..."
(
  cd "$ROOT_DIR/client"
  npm run dev -- -p "$CLIENT_PORT"
) &
CLIENT_PID=$!

echo
echo "FeedRecap is starting:"
echo "  Client: http://localhost:$CLIENT_PORT"
echo "  Server: http://localhost:$SERVER_PORT"
echo
echo "Press Ctrl+C to stop both."

wait "$SERVER_PID" "$CLIENT_PID"
