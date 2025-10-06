#!/bin/sh
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/server"

if ! command -v node >/dev/null 2>&1; then
  printf '%s\n' "Error: node is required but not found on PATH." >&2
  exit 1
fi

NEED_INSTALL=0
if [ ! -d node_modules ] && [ -f package.json ]; then
  if grep -q '"dependencies"' package.json || grep -q '"optionalDependencies"' package.json; then
    NEED_INSTALL=1
  fi
fi

if [ "$NEED_INSTALL" -eq 1 ]; then
  if command -v npm >/dev/null 2>&1; then
    if [ -f package-lock.json ]; then
      npm ci --omit=dev --no-audit --no-fund
    else
      npm install --omit=dev --no-audit --no-fund
    fi
  else
    printf '%s\n' "Warning: Dependencies detected but npm is unavailable; skipping installation." >&2
  fi
fi

PORT="${PORT:-4000}"
export PORT
exec node index.js
