#!/bin/bash
# ============================================================================
# Cloudflare Cache Purge — Post-deploy script
# 
# Purges the entire Cloudflare cache after each deploy to prevent stale HTML
# from referencing deleted JS bundles (Next.js content-hashed chunks).
#
# CONFIGURATION:
#   1. Set CF_ZONE_ID in Coolify environment variables
#   2. Set CF_API_TOKEN in Coolify environment variables (secret!)
#   3. Add this script to Coolify's "Post Deployment Command":
#      bash scripts/purge-cloudflare-cache.sh
#
# REQUIRED ENV VARS:
#   CF_ZONE_ID    — Your Cloudflare zone ID (find in Cloudflare dashboard)
#   CF_API_TOKEN  — Cloudflare API token with "Zone.Cache Purge" permission
# ============================================================================

set -euo pipefail

if [ -z "${CF_ZONE_ID:-}" ] || [ -z "${CF_API_TOKEN:-}" ]; then
  echo "[cache-purge] CF_ZONE_ID or CF_API_TOKEN not set — skipping cache purge"
  echo "[cache-purge] Set these in Coolify environment variables to enable auto-purge"
  exit 0
fi

echo "[cache-purge] Purging Cloudflare cache for zone: $CF_ZONE_ID"

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/purge_cache" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}')

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
  SUCCESS=$(echo "$BODY" | grep -o '"success":\s*true')
  if [ -n "$SUCCESS" ]; then
    echo "[cache-purge] ✅ Cloudflare cache purged successfully"
  else
    echo "[cache-purge] ⚠️ API returned 200 but success=false: $BODY"
  fi
else
  echo "[cache-purge] ❌ Failed to purge cache (HTTP $HTTP_CODE): $BODY"
  exit 1
fi
