#!/data/data/com.termux/files/usr/bin/bash
# Lance le serveur Gouvance directement dans Termux (test sur le même téléphone).
set -e
pkg update -y && pkg install -y nodejs postgresql
export PGDATA=$PREFIX/var/lib/postgresql
[ -d "$PGDATA" ] || initdb "$PGDATA"
pg_ctl -D "$PGDATA" -l "$PREFIX/var/log/pg.log" start || true
sleep 3
createdb gouvance 2>/dev/null || true
for f in db/schema.sql db/schema_v2.sql db/schema_v3.sql db/schema_v4.sql db/schema_v5.sql db/schema_v6.sql; do psql gouvance -f $f; done
[ -f .env ] || cp .env.example .env
npm install
echo "Modifiez .env (DATABASE_URL=postgres://localhost:5432/gouvance, JWT_SECRET, ADMIN_EMAILS, SMTP_USER, SMTP_PASS) puis lancez : node src/index.js"
