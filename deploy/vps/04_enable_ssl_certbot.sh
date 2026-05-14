#!/usr/bin/env bash
set -euo pipefail

# Usage:
# sudo DOMAIN=api.yourdomain.com EMAIL=you@example.com bash deploy/vps/04_enable_ssl_certbot.sh

if [ "${EUID}" -ne 0 ]; then
  echo "Please run as root."
  exit 1
fi

DOMAIN="${DOMAIN:-}"
EMAIL="${EMAIL:-}"

if [ -z "${DOMAIN}" ] || [ "${DOMAIN}" = "_" ]; then
  echo "DOMAIN is required for SSL, e.g. DOMAIN=api.yourdomain.com"
  exit 1
fi

if [ -z "${EMAIL}" ]; then
  echo "EMAIL is required for Let's Encrypt notices, e.g. EMAIL=you@example.com"
  exit 1
fi

apt-get update
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos -m "${EMAIL}" --redirect
systemctl reload nginx

echo "SSL enabled. Test: https://${DOMAIN}/health"
