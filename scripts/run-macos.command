#!/bin/sh
set -u

SCRIPT_DIRECTORY=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 26 or newer is required but was not found in PATH." >&2
  exit 1
fi

if ! node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 26 ? 0 : 1)' >/dev/null 2>&1; then
  echo "Node.js 26 or newer is required. Installed version: $(node --version)" >&2
  exit 1
fi

exec node "$SCRIPT_DIRECTORY/defftra-router.mjs" "$@"
