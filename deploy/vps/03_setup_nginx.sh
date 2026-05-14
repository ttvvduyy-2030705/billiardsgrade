#!/usr/bin/env bash
set -euo pipefail

# Usage:
# sudo DOMAIN=api.yourdomain.com bash deploy/vps/03_setup_nginx.sh
# Or for IP-only HTTP test:
# sudo DOMAIN=_ bash deploy/vps/03_setup_nginx.sh

if [ "${EUID}" -ne 0 ]; then
  echo "Please run as root: sudo DOMAIN=api.yourdomain.com bash deploy/vps/03_setup_nginx.sh"
  exit 1
fi

DOMAIN="${DOMAIN:-_}"
API_PORT="${API_PORT:-4012}"
CONF_PATH="/etc/nginx/sites-available/scoremenu-api"

cat > "${CONF_PATH}" <<NGINX
server {
    listen 80;
    server_name ${DOMAIN};

    client_max_body_size 16m;

    location / {
        proxy_pass http://127.0.0.1:${API_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 90s;
        proxy_connect_timeout 10s;
        proxy_send_timeout 90s;
    }

    location /health {
        proxy_pass http://127.0.0.1:${API_PORT}/health;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINX

ln -sf "${CONF_PATH}" /etc/nginx/sites-enabled/scoremenu-api
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

echo "Nginx is ready. Test: curl http://${DOMAIN}/health"
if [ "${DOMAIN}" = "_" ]; then
  echo "Using DOMAIN=_. Test with your VPS IP: http://YOUR_VPS_IP/health"
fi
