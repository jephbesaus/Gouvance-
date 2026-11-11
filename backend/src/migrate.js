// Applique automatiquement les fichiers db/schema*.sql au démarrage (une seule fois chacun).
const fs = require('fs'), path = require('path'); const db = require('./db');
module.exports = async () => {
  await db.query('CREATE TABLE IF NOT EXISTS schema_migrations(name text PRIMARY KEY, applied_at timestamptz DEFAULT now())');
  const dir = path.join(__dirname, '../db'); const num = f => (f === 'schema.sql' ? 0 : parseInt(f.match(/\d+/)[0], 10));
  const files = fs.readdirSync(dir).filter(f => /^schema(_v\d+)?\.sql$/.test(f)).sort((a, b) => num(a) - num(b));
  const done = (await db.query('SELECT count(*)::int AS n FROM schema_migrations')).rows[0].n;
  if (!done && (await db.query("SELECT to_regclass('public.users') AS t")).rows[0].t) { for (const f of files) await db.query('INSERT INTO schema_migrations(name) VALUES($1) ON CONFLICT DO NOTHING', [f]); return; }
  for (const f of files) {
    if ((await db.query('SELECT 1 FROM schema_migrations WHERE name=$1', [f])).rowCount) continue;
    const c = await db.connect();
    try { await c.query('BEGIN'); await c.query(fs.readFileSync(path.join(dir, f), 'utf8')); await c.query('INSERT INTO schema_migrations(name) VALUES($1)', [f]); await c.query('COMMIT'); console.log('Migration appliquée :', f); }
    catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
  }
};
