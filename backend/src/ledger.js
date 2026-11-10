// Toutes les opérations d'argent passent ici, dans une transaction SQL (montants entiers en FC).
const { txCode, fail } = require('./util');
async function lock(c, ids) { await c.query('SELECT 1 FROM wallets WHERE user_id = ANY($1::uuid[]) ORDER BY user_id FOR UPDATE', [ids.filter(Boolean)]); }
async function debit(c, uid, amount) {
  const r = await c.query('UPDATE wallets SET balance=balance-$1 WHERE user_id=$2 AND balance>=$1 RETURNING balance', [amount, uid]);
  if (!r.rowCount) throw fail(400, 'Solde insuffisant');
}
const credit = (c, uid, amount) => c.query('UPDATE wallets SET balance=balance+$1 WHERE user_id=$2', [amount, uid]);
async function record(c, kind, from, to, amount, family) {
  const code = txCode();
  await c.query('INSERT INTO transactions(code,kind,from_user,to_user,amount,family_id) VALUES($1,$2,$3,$4,$5,$6)', [code, kind, from, to, amount, family || null]);
  return code;
}
exports.transfer = async (c, from, to, amount) => { await lock(c, [from, to]); await debit(c, from, amount); await credit(c, to, amount); return record(c, 'transfer', from, to, amount); };
exports.mint = async (c, to, amount) => { await lock(c, [to]); await credit(c, to, amount); return record(c, 'admin_credit', null, to, amount); };
exports.pay = async (c, from, amount, kind, family) => { await lock(c, [from]); await debit(c, from, amount); return record(c, kind, from, null, amount, family); };
