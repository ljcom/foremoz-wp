#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

pm2 start "$SCRIPT_DIR/pm2.foremoz-api.config.cjs"
pm2 save
