#!/bin/bash
# Installe le serveur Gouvance sur un VPS Ubuntu 24.04. À lancer en root depuis le dossier backend.
set -e
[ "$(id -u)" = 0 ] || { echo "Lancez ce script en root"; exit 1; }
SRC="$(pwd)"
read -p "Email admin [orpasuisse@gmail.com] : " ADMIN; ADMIN=${ADMIN:-orpasuisse@gmail.com}
read -s -p "Mot de passe d'application Gmail (16 lettres, sans espaces ; rien ne s'affiche) : " SMTP; echo; SMTP=${SMTP// /}
# 1 Go de swap : le VPS n'a que 512 Mo de mémoire
# Swap : ignoré si le serveur est un conteneur (swapon interdit)
if ! swapon --show | grep -q swapfile; then (fallocate -l 1G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile && echo '/swapfile none swap sw 0 0' >> /etc/fstab) || { rm -f /swapfile; echo 'Swap non disponible : on continue sans.'; }; fi
export DEBIAN_FRONTEND=noninteractive
apt-get update -y && apt-get install -y postgresql ufw curl xz-utils ca-certificates
# Node.js 20 (Ubuntu 22.04 n'a qu'une version trop ancienne) : binaire officiel
if ! command -v node >/dev/null 2>&1 || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 18 ]; then
  case "$(uname -m)" in x86_64) A=x64;; aarch64) A=arm64;; *) echo "Architecture non supportée"; exit 1;; esac
  curl -fsSL "https://nodejs.org/dist/v20.18.0/node-v20.18.0-linux-$A.tar.xz" -o /tmp/node.tar.xz
  tar -xJf /tmp/node.tar.xz -C /usr/local --strip-components=1
fi
node -v
systemctl enable --now postgresql
DBPASS=$(head -c 24 /dev/urandom | base64 | tr -d '/+=')
sudo -u postgres psql -c "CREATE USER gouvance WITH PASSWORD '$DBPASS'" 2>/dev/null || sudo -u postgres psql -c "ALTER USER gouvance WITH PASSWORD '$DBPASS'"
sudo -u postgres createdb -O gouvance gouvance 2>/dev/null || true
export PGPASSWORD=$DBPASS
# Les tables sont créées automatiquement par le serveur au premier démarrage (src/migrate.js).
id gouvance >/dev/null 2>&1 || useradd -r -m -d /opt/gouvance gouvance
mkdir -p /opt/gouvance/backend && rm -rf /opt/gouvance/backend/src /opt/gouvance/backend/db
cp -r "$SRC"/src "$SRC"/db "$SRC"/package.json /opt/gouvance/backend/
cat > /opt/gouvance/backend/.env <<EOF
PORT=80
DATABASE_URL=postgres://gouvance:$DBPASS@localhost:5432/gouvance
JWT_SECRET=$(head -c 32 /dev/urandom | base64 | tr -d '/+=')
ADMIN_EMAILS=$ADMIN
SMTP_HOST=smtp.gmail.com
SMTP_USER=$ADMIN
SMTP_PASS=$SMTP
CENSUS_FEE_CDF=2000
EOF
chown -R gouvance:gouvance /opt/gouvance
cd /opt/gouvance/backend && sudo -u gouvance npm install --omit=dev
cat > /etc/systemd/system/gouvance.service <<EOF
[Unit]
Description=Gouvance API
After=network.target postgresql.service
[Service]
User=gouvance
WorkingDirectory=/opt/gouvance/backend
ExecStart=/usr/local/bin/node src/index.js
Restart=always
AmbientCapabilities=CAP_NET_BIND_SERVICE
[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload && systemctl enable --now gouvance
ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp && ufw --force enable
sleep 4; curl -s http://localhost/health; echo
IP6=$(ip -6 addr show scope global | awk '/inet6/{print $2}' | cut -d/ -f1 | head -1)
echo "Serveur prêt. Adresse pour l'application : http://[$IP6]"
