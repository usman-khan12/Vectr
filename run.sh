#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$ROOT_DIR/.vectr-dev-pids"

stop_existing() {
  if [[ -f "$PID_FILE" ]]; then
    echo "Stopping existing dev processes..."
    while read -r pid desc; do
      if [[ -n "${pid:-}" ]] && kill -0 "$pid" 2>/dev/null; then
        echo "  Killing $desc (pid $pid)"
        kill "$pid" 2>/dev/null || true
      fi
    done < "$PID_FILE"
    rm -f "$PID_FILE"
  fi
}

start_new() {
  cd "$ROOT_DIR"

  echo "Starting backend API (uvicorn)..."
  (cd backend && uvicorn voice:app --reload --port 8000) &
  BACKEND_PID=$!

  echo "Starting agent worker..."
  (cd backend && python agent.py dev) &
  AGENT_PID=$!

  echo "Starting frontend (Vite dev server)..."
  (cd frontend && npm run dev) &
  FRONTEND_PID=$!

  {
    echo "$BACKEND_PID backend-api"
    echo "$AGENT_PID agent-worker"
    echo "$FRONTEND_PID frontend-dev"
  } > "$PID_FILE"

  echo
  echo "Dev stack running. PIDs stored in $PID_FILE"
  echo "Press Ctrl+C to stop."
}

trap 'echo "Stopping dev stack..."; stop_existing; exit 0' INT TERM

stop_existing
start_new

wait

