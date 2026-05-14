#!/usr/bin/env bash
set -euo pipefail

# Run from project root on the VPS:
# sudo bash deploy/vps/02_deploy_backend.sh

if [ "${EUID}" -ne 0 ]; then
  echo "Please run as root: sudo bash deploy/vps/02_deploy_backend.sh"
  exit 1
fi

APP_USER="${APP_USER:-scoremenu}"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SRC_DIR="${PROJECT_ROOT}/backend/scoremenu-server"
APP_DIR="/opt/scoremenu/backend/scoremenu-server"

if [ ! -f "${SRC_DIR}/server.js" ]; then
  echo "Cannot find backend/scoremenu-server/server.js. Run this from the project root."
  exit 1
fi

mkdir -p "${APP_DIR}" /var/lib/scoremenu/uploads /var/log/scoremenu
rsync -a --delete \
  --exclude 'node_modules' \
  --exclude 'data/db.json' \
  --exclude 'data/uploads' \
  "${SRC_DIR}/" "${APP_DIR}/"

cp "${PROJECT_ROOT}/deploy/vps/ecosystem.config.cjs" /opt/scoremenu/ecosystem.config.cjs

chown -R "${APP_USER}:${APP_USER}" /opt/scoremenu /var/lib/scoremenu /var/log/scoremenu

if [ ! -f /etc/scoremenu/scoremenu.env ]; then
  mkdir -p /etc/scoremenu
  cp "${PROJECT_ROOT}/deploy/vps/scoremenu.env.example" /etc/scoremenu/scoremenu.env
  SECRET="$(openssl rand -hex 32)"
  sed -i "s/CHANGE_ME_GENERATE_WITH_OPENSSL_RAND_HEX_32/${SECRET}/" /etc/scoremenu/scoremenu.env
  chmod 640 /etc/scoremenu/scoremenu.env
  chown root:"${APP_USER}" /etc/scoremenu/scoremenu.env
fi

# scoremenu-server currently has no dependencies, but npm install is harmless if dependencies are added later.
sudo -u "${APP_USER}" bash -lc "cd '${APP_DIR}' && npm install --omit=dev"

sudo -u "${APP_USER}" pm2 startOrReload /opt/scoremenu/ecosystem.config.cjs --update-env
sudo -u "${APP_USER}" pm2 save
pm2 startup systemd -u "${APP_USER}" --hp "/home/${APP_USER}" >/tmp/scoremenu_pm2_startup.txt 2>&1 || true
cat /tmp/scoremenu_pm2_startup.txt || true

sleep 1
curl -fsS http://127.0.0.1:4012/health || {
  echo "Backend did not answer on 127.0.0.1:4012. Check: sudo -u ${APP_USER} pm2 logs scoremenu-api"
  exit 1
}

echo "Backend deployed and healthy on 127.0.0.1:4012."
