#!/bin/sh
set -eu

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/server"

if [ ! -d node_modules ]; then
  npm install --production
fi

PORT="${PORT:-4000}"
export PORT
exec npm start
