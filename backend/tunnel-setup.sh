#!/bin/bash
# Rend le serveur accessible à tout le monde en HTTPS, gratuitement (Cloudflare Quick Tunnel). À lancer en root sur le VPS, après vps-setup.sh.
set -e
[ "$(id -u)" = 0 ] || { echo "Lancez ce script en root"; exit 1; }
if ! command -v cloudflared >/dev/null 2>&1; then
  mkdir -p --mode=0755 /usr/share/keyrings
  curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg -o /usr/share/keyrings/cloudflare-main.gpg
  echo 'deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared any main' > /etc/apt/sources.list.d/cloudflared.list
  apt-get update -y && apt-get install -y cloudflared
fi
cat > /etc/systemd/system/gouvance-tunnel.service <<EOF
[Unit]
Description=Gouvance tunnel Cloudflare
After=network-online.target gouvance.service
[Service]
ExecStart=/usr/bin/cloudflared tunnel --no-autoupdate --url http://localhost:80
Restart=always
RestartSec=5
[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload && systemctl enable --now gouvance-tunnel
for i in $(seq 1 30); do
  URL=$(journalctl -u gouvance-tunnel --no-pager 2>/dev/null | grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' | tail -1)
  [ -n "$URL" ] && break; sleep 2
done
echo "ADRESSE PUBLIQUE : ${URL:-introuvable, tapez : journalctl -u gouvance-tunnel | tail -30}"
echo "Mettez-la dans server.json du dépôt gouvance-config : {\"api\":\"$URL\"}"
