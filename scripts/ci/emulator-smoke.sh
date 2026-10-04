#!/usr/bin/env bash
# Emulator smoke for the exact release APK: installs, cold-starts, opens the
# production App Links staff tap most often, and fails on any native crash.
# It cannot sign in (no credentials on the device), so it proves the binary
# boots and claims ERP links; data correctness is the live API smoke's job.
set -euo pipefail

APK="${1:?usage: emulator-smoke.sh <apk>}"
PKG="com.prizmenergy.mobile"
LOG="emulator-logcat.txt"
SITE="https://ms.prizm-energy.com/MS"

alive() { adb shell pidof "$PKG" >/dev/null 2>&1; }
fail() { echo "::error::$1"; adb logcat -d > "$LOG" || true; exit 1; }

adb wait-for-device
adb shell 'while [ "$(getprop sys.boot_completed)" != "1" ]; do sleep 2; done'
adb install -r -g "$APK" || fail "APK did not install"
adb logcat -c

# The signing certificate was already matched against assetlinks.json in the
# build job; approve the host for this test device so Android routes the links
# without waiting on online domain verification.
adb shell pm set-app-links-user-selection --user cur --package "$PKG" true all || true

adb shell monkey -p "$PKG" -c android.intent.category.LAUNCHER 1 >/dev/null
sleep 20
alive || fail "App is not running 20s after a cold start (crash on launch)"

for path in \
  "przpurchase/Payment_Request/view_payment_request/1211" \
  "admin/timesheets/requisition_detail/1" \
  "admin/przpurchase/Delivery_Notes/view_delivery_note/1" \
  "admin/przpurchase/ag_view_purchase_request/1" \
  "admin/tasks/view/1"; do
  out="$(adb shell am start -W -a android.intent.action.VIEW -d "$SITE/$path" 2>&1 || true)"
  echo "$out"
  echo "$out" | grep -q "$PKG" || fail "App Link $SITE/$path was not routed to $PKG"
  sleep 6
  alive || fail "App crashed after opening $SITE/$path"
done

adb logcat -d > "$LOG"
if grep -E "FATAL EXCEPTION|Process: $PKG" "$LOG" | grep -q .; then
  grep -n -A20 "FATAL EXCEPTION" "$LOG" | head -60 || true
  fail "Native crash recorded in logcat"
fi
echo "Emulator smoke passed: install, cold start, 5 App Links, no crash."
