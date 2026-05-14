#!/usr/bin/env bash
set -euo pipefail

if [ "${EUID}" -ne 0 ]; then
  echo "Please run as root: sudo bash deploy/vps/01_prepare_vps_ubuntu.sh"
  exit 1
fi

APP_USER="${APP_USER:-scoremenu}"
NODE_MAJOR="${NODE_MAJOR:-20}"

apt-get update
apt-get install -y ca-certificates curl gnupg nginx ufw rsync git build-essential openssl

if ! command -v node >/dev/null 2>&1 || ! node -v | grep -q "^v${NODE_MAJOR}\."; then
  mkdir -p /etc/apt/keyrings
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
  echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_${NODE_MAJOR}.x nodistro main" > /etc/apt/sources.list.d/nodesource.list
  apt-get update
  apt-get install -y nodejs
fi

npm install -g pm2

id -u "${APP_USER}" >/dev/null 2>&1 || useradd --system --create-home --shell /bin/bash "${APP_USER}"

mkdir -p /opt/scoremenu/backend /etc/scoremenu /var/lib/scoremenu/uploads /var/log/scoremenu
chown -R "${APP_USER}:${APP_USER}" /opt/scoremenu /var/lib/scoremenu /var/log/scoremenu
chmod 750 /etc/scoremenu

if [ ! -f /etc/scoremenu/scoremenu.env ]; then
  cp "$(dirname "$0")/scoremenu.env.example" /etc/scoremenu/scoremenu.env
  SECRET="$(openssl rand -hex 32)"
  sed -i "s/CHANGE_ME_GENERATE_WITH_OPENSSL_RAND_HEX_32/${SECRET}/" /etc/scoremenu/scoremenu.env
  chmod 640 /etc/scoremenu/scoremenu.env
  chown root:"${APP_USER}" /etc/scoremenu/scoremenu.env
  echo "Created /etc/scoremenu/scoremenu.env with a generated token secret."
fi

ufw allow OpenSSH || true
ufw allow 'Nginx Full' || true
systemctl enable nginx
systemctl restart nginx

echo "VPS runtime is ready. Next: run 02_deploy_backend.sh from the project folder."
