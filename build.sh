#!/usr/bin/env sh
# Vercel buildCommand: substitute the key from the env (Doppler-injected) into config.js.
# Falls back to an empty key so the build never fails hard; the app shows a clear notice.
set -e
# Accept either name — Doppler currently has GOOGLE_MAPS; GOOGLE_MAPS_API_KEY is the convention.
KEY="${GOOGLE_MAPS_API_KEY:-${GOOGLE_MAPS:-}}"
sed "s|__GOOGLE_MAPS_API_KEY__|${KEY}|g" config.js.template > config.js
echo "config.js generated (key ${KEY:+present}${KEY:+}${KEY:-MISSING})."
