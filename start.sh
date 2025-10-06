#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/server"

if [ ! -d node_modules ]; then
  npm install --production
fi

export PORT="${PORT:-4000}"
exec npm start
