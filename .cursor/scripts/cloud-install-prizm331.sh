#!/usr/bin/env bash
# prizm331 (Perfex CRM) — PHP composer + frontend npm deps.
set -euo pipefail

cd application
composer install --no-interaction --prefer-dist
cd ..

if [[ -f package-lock.json ]]; then
  npm ci
else
  npm install
fi
