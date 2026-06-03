#!/usr/bin/env bash
# PRIZM shared cloud-agent install helper (Node repos).
set -euo pipefail

BUILD=false
SUBDIR="."

while [[ $# -gt 0 ]]; do
  case "$1" in
    --build) BUILD=true; shift ;;
    --subdir) SUBDIR="${2:?}"; shift 2 ;;
    *) echo "Unknown arg: $1" >&2; exit 1 ;;
  esac
done

if command -v apt-get >/dev/null 2>&1; then
  sudo apt-get update -qq
  sudo apt-get install -y -qq build-essential python3 curl ca-certificates
fi

ROOT="$(pwd)"
TARGET="${ROOT}/${SUBDIR}"
cd "$TARGET"

if [[ -f package-lock.json ]]; then
  npm ci
else
  npm install
fi

if [[ "$BUILD" == true ]]; then
  npm run build
fi
