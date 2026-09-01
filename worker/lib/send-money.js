const TOKEN_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

export function sendMoneyLimits(env) {
  const minCents = parseInt(env.SEND_MONEY_MIN_CENTS || '2000', 10);
  const maxCents = parseInt(env.SEND_MONEY_MAX_CENTS || '1000000', 10);
  return {
    minCents: Number.isFinite(minCents) && minCents > 0 ? minCents : 2000,
    maxCents: Number.isFinite(maxCents) && maxCents > 0 ? maxCents : 1000000,
  };
}

export function generateSendToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let out = '';
  for (let i = 0; i < bytes.length && out.length < 16; i++) {
    const b = bytes[i];
    if (b >= 256 - (256 % TOKEN_ALPHABET.length)) continue;
    out += TOKEN_ALPHABET[b % TOKEN_ALPHABET.length];
  }
  while (out.length < 12) {
    const b = crypto.getRandomValues(new Uint8Array(1))[0];
    if (b >= 256 - (256 % TOKEN_ALPHABET.length)) continue;
    out += TOKEN_ALPHABET[b % TOKEN_ALPHABET.length];
  }
  return out;
}

export function normalizeToken(value) {
  const token = String(value || '').trim();
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(token)) return '';
  return token;
}

export async function findActiveLink(db, token) {
  const normalized = normalizeToken(token);
  if (!normalized) return null;
  return db
    .prepare(
      `SELECT l.token, l.status, l.user_id, a.first_name, a.full_name, a.currency
       FROM send_money_links l
       JOIN client_accounts a ON a.id = l.user_id
       WHERE l.token = ? LIMIT 1`
    )
    .bind(normalized)
    .first();
}

export async function ensureLink(db, userId) {
  const existing = await db
    .prepare('SELECT token, status FROM send_money_links WHERE user_id = ? LIMIT 1')
    .bind(userId)
    .first();
  if (existing) return existing;
  for (let i = 0; i < 6; i++) {
    const token = generateSendToken();
    try {
      await db
        .prepare(`INSERT INTO send_money_links (token, user_id, status) VALUES (?, ?, 'active')`)
        .bind(token, userId)
        .run();
      return { token, status: 'active' };
    } catch {
      /* retry unique token */
    }
  }
  return null;
}

export async function rotateLink(db, userId) {
  const token = generateSendToken();
  const existing = await db
    .prepare('SELECT token FROM send_money_links WHERE user_id = ? LIMIT 1')
    .bind(userId)
    .first();
  if (existing) {
    await db
      .prepare(
        `UPDATE send_money_links SET token = ?, status = 'active', updated_at = datetime('now') WHERE user_id = ?`
      )
      .bind(token, userId)
      .run();
  } else {
    await db
      .prepare(`INSERT INTO send_money_links (token, user_id, status) VALUES (?, ?, 'active')`)
      .bind(token, userId)
      .run();
  }
  return { token, status: 'active' };
}

export async function setLinkStatus(db, userId, status) {
  const row = await db
    .prepare('SELECT token FROM send_money_links WHERE user_id = ? LIMIT 1')
    .bind(userId)
    .first();
  if (!row) return null;
  await db
    .prepare(`UPDATE send_money_links SET status = ?, updated_at = datetime('now') WHERE user_id = ?`)
    .bind(status, userId)
    .run();
  return { token: row.token, status };
}

export async function receivedCents(db, userId) {
  const row = await db
    .prepare(
      `SELECT COALESCE(SUM(amount_cents), 0) AS total
       FROM payments WHERE user_id = ? AND source = 'send_money' AND status = 'completed'`
    )
    .bind(userId)
    .first();
  return Number(row?.total || 0);
}

export function publicFirstName(row) {
  const first = String(row?.first_name || '').trim();
  if (first) return first;
  const full = String(row?.full_name || '').trim();
  return full.split(/\s+/)[0] || 'a traveler';
}
