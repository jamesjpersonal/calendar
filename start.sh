#!/bin/sh
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/server"

if ! command -v npm >/dev/null 2>&1; then
  printf '%s\n' "Error: npm is required but not found on PATH." >&2
  exit 1
fi

if [ ! -d node_modules ]; then
  if [ -f package-lock.json ]; then
    npm ci --omit=dev --no-audit --no-fund
  else
    npm install --omit=dev --no-audit --no-fund
  fi
fi

PORT="${PORT:-4000}"
export PORT
exec npm start
