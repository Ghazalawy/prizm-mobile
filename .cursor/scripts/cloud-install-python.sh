#!/usr/bin/env bash
# PRIZM shared cloud-agent install helper (Python repos).
set -euo pipefail

REQ="requirements.txt"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --requirements) REQ="${2:?}"; shift 2 ;;
    *) echo "Unknown arg: $1" >&2; exit 1 ;;
  esac
done

python3 -m pip install --upgrade pip
python3 -m pip install -r "$REQ"
