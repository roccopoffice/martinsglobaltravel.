import { dollarsToCents } from './http.js';
import { sendGiftCardEmail } from './gift-card-email.js';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const encoder = new TextEncoder();
const decoder = new TextDecoder();

export const PRESET_AMOUNTS_CENTS = [2500, 5000, 10000, 25000, 50000, 100000];

const DEFAULT_SETTINGS = {
  min_amount_cents: 2500,
  max_amount_cents: 1000000,
  allow_custom_amount: 1,
  purchased_expires_days: null,
  promotional_expires_days: null,
  allow_combine: 1,
  transferable: 1,
  currency: 'usd',
};

export function normalizeCode(code) {
  return String(code || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .replace(/^TRVL/, 'TRVL');
}

export function formatCode(raw) {
  const n = normalizeCode(raw).replace(/^TRVL/, '');
  const a = n.slice(0, 4);
  const b = n.slice(4, 8);
  if (!a || !b) return String(raw || '').toUpperCase();
  return `TRVL-${a}-${b}`;
}

export function lastFourFromCode(code) {
  const n = normalizeCode(code).replace(/^TRVL/, '');
  return n.slice(-4);
}

export function generateCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let out = '';
  for (let i = 0; i < bytes.length && out.length < 8; i++) {
    const b = bytes[i];
    if (b >= 256 - (256 % ALPHABET.length)) continue;
    out += ALPHABET[b % ALPHABET.length];
  }
  while (out.length < 8) {
    const b = crypto.getRandomValues(new Uint8Array(1))[0];
    if (b >= 256 - (256 % ALPHABET.length)) continue;
    out += ALPHABET[b % ALPHABET.length];
  }
  return `TRVL-${out.slice(0, 4)}-${out.slice(4)}`;
}

function b64url(bytes) {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64url(str) {
  const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4));
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/') + pad;
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmacKey(secret) {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
}

export async function hashCode(code, secret) {
  const key = await hmacKey(secret);
  const data = encoder.encode(normalizeCode(code));
  const sig = await crypto.subtle.sign('HMAC', key, data);
  return b64url(new Uint8Array(sig));
}

async function aesKey(secret) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(`mgt-gift-card:${secret}`));
  return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function encryptCode(code, secret) {
  const key = await aesKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(code));
  return `${b64url(iv)}.${b64url(new Uint8Array(ct))}`;
}

export async function decryptCode(payload, secret) {
  if (!payload || !payload.includes('.')) return null;
  try {
    const [ivPart, ctPart] = payload.split('.');
    const key = await aesKey(secret);
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromB64url(ivPart) },
      key,
      fromB64url(ctPart)
    );
    return decoder.decode(plain);
  } catch {
    return null;
  }
}

function pepper(env) {
  return env.AUTH_SECRET || '';
}

export async function getSettings(db) {
  const row = await db.prepare('SELECT * FROM gift_card_settings WHERE id = 1').first();
  return { ...DEFAULT_SETTINGS, ...(row || {}) };
}

function expiresAtFor(settings, type, explicitIso) {
  if (explicitIso) return explicitIso;
  const days =
    type === 'PROMOTIONAL_CREDIT'
      ? settings.promotional_expires_days
      : settings.purchased_expires_days;
  if (!days || Number(days) <= 0) return null;
  const d = new Date(Date.now() + Number(days) * 86400000);
  return d.toISOString();
}

function isExpired(row) {
  if (!row?.expires_at) return false;
  return Date.parse(row.expires_at) <= Date.now();
}

export function publicConfig(settings) {
  return {
    presetsCents: PRESET_AMOUNTS_CENTS,
    minAmountCents: settings.min_amount_cents,
    maxAmountCents: settings.max_amount_cents,
    allowCustomAmount: Number(settings.allow_custom_amount) === 1,
    allowCombine: Number(settings.allow_combine) === 1,
    transferable: Number(settings.transferable) === 1,
    purchasedExpiresDays: settings.purchased_expires_days,
    promotionalExpiresDays: settings.promotional_expires_days,
    currency: settings.currency || 'usd',
  };
}

export function toPublicCard(row) {
  if (!row) return null;
  return {
    id: row.id,
    type: row.type,
    originalAmountCents: row.original_amount_cents,
    currentBalanceCents: row.current_balance_cents,
    usedAmountCents: Math.max(0, (row.original_amount_cents || 0) - (row.current_balance_cents || 0)),
    currency: row.currency,
    status: isExpired(row) && row.status === 'active' ? 'expired' : row.status,
    codeLastFour: row.code_last_four,
    recipientName: row.recipient_name,
    recipientEmail: row.recipient_email,
    purchaserName: row.purchaser_name,
    giftMessage: row.gift_message,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    deliveredAt: row.delivered_at,
    scheduledDeliveryAt: row.scheduled_delivery_at,
  };
}

export function toAdminCard(row) {
  return {
    ...toPublicCard(row),
    purchaserEmail: row.purchaser_email,
    issuedToCustomerId: row.issued_to_customer_id,
    paymentId: row.payment_id,
    stripeSessionId: row.stripe_session_id,
    issuedByAdmin: row.issued_by_admin,
    source: row.source,
    emailStatus: row.email_status,
    updatedAt: row.updated_at,
  };
}

async function uniqueCode(env) {
  const secret = pepper(env);
  if (!secret) return { error: 'Server auth is not configured.' };
  for (let i = 0; i < 8; i++) {
    const code = generateCode();
    const codeHash = await hashCode(code, secret);
    const existing = await env.DB.prepare('SELECT id FROM gift_cards WHERE code_hash = ? LIMIT 1')
      .bind(codeHash)
      .first();
    if (!existing) {
      return {
        code,
        codeHash,
        codeEncrypted: await encryptCode(code, secret),
        lastFour: lastFourFromCode(code),
      };
    }
  }
  return { error: 'Could not generate a unique gift card code. Please try again.' };
}

async function assignCode(env, cardId) {
  const generated = await uniqueCode(env);
  if (generated.error) return generated;
  await env.DB.prepare(
    `UPDATE gift_cards
     SET code_hash = ?, code_encrypted = ?, code_last_four = ?, updated_at = datetime('now')
     WHERE id = ?`
  )
    .bind(generated.codeHash, generated.codeEncrypted, generated.lastFour, cardId)
    .run();
  return generated;
}

function cleanEmail(value) {
  const email = String(value || '')
    .trim()
    .toLowerCase();
  if (!email || !email.includes('@') || email.length > 254) return '';
  return email;
}

function cleanName(value) {
  return String(value || '').trim().slice(0, 120);
}

function cleanMessage(value) {
  return String(value || '').trim().slice(0, 500);
}

function parseDeliveryAt(value) {
  if (!value) return null;
  const t = Date.parse(value);
  if (!Number.isFinite(t)) return null;
  return new Date(t).toISOString();
}

export async function validatePurchaseAmount(db, amountCents) {
  const settings = await getSettings(db);
  if (!amountCents || amountCents <= 0) return { error: 'Enter a valid gift card amount.' };
  if (amountCents < settings.min_amount_cents) {
    return {
      error: `The minimum e-gift card is $${(settings.min_amount_cents / 100).toFixed(2)}.`,
    };
  }
  if (amountCents > settings.max_amount_cents) {
    return {
      error: `The maximum e-gift card is $${(settings.max_amount_cents / 100).toFixed(2)}.`,
    };
  }
  const isPreset = PRESET_AMOUNTS_CENTS.includes(amountCents);
  if (!isPreset && Number(settings.allow_custom_amount) !== 1) {
    return { error: 'Please choose one of the listed amounts.' };
  }
  return { settings };
}

export async function createPendingPurchase(env, input) {
  const amountCents =
    typeof input.amountCents === 'number' ? input.amountCents : dollarsToCents(input.amountDollars);
  const amountCheck = await validatePurchaseAmount(env.DB, amountCents);
  if (amountCheck.error) return amountCheck;

  const recipientName = cleanName(input.recipientName);
  const recipientEmail = cleanEmail(input.recipientEmail);
  const purchaserName = cleanName(input.purchaserName);
  const purchaserEmail = cleanEmail(input.purchaserEmail) || recipientEmail;
  const giftMessage = cleanMessage(input.giftMessage);
  const forSelf = !!input.forSelf;

  if (!purchaserName) return { error: 'Enter the purchaser name.' };
  if (!recipientName) return { error: 'Enter the recipient name.' };
  if (!recipientEmail) return { error: 'Enter a valid recipient email.' };

  const settings = amountCheck.settings;
  const nowIso = new Date().toISOString();
  const scheduled = parseDeliveryAt(input.deliveryDate);
  const deliverNow = !scheduled || Date.parse(scheduled) <= Date.now() + 60_000;
  const id = crypto.randomUUID();

  await env.DB.prepare(
    `INSERT INTO gift_cards (
       id, type, original_amount_cents, current_balance_cents, currency, status,
       recipient_name, recipient_email, purchaser_name, purchaser_email, gift_message,
       source, scheduled_delivery_at, expires_at
     ) VALUES (?, 'PURCHASED_GIFT_CARD', ?, 0, ?, 'pending', ?, ?, ?, ?, ?, 'stripe_checkout', ?, ?)`
  )
    .bind(
      id,
      amountCents,
      settings.currency || 'usd',
      recipientName,
      forSelf ? purchaserEmail || recipientEmail : recipientEmail,
      purchaserName,
      purchaserEmail,
      giftMessage,
      deliverNow ? null : scheduled,
      expiresAtFor(settings, 'PURCHASED_GIFT_CARD', null)
    )
    .run();

  return {
    giftCard: {
      id,
      amountCents,
      recipientName,
      recipientEmail: forSelf ? purchaserEmail || recipientEmail : recipientEmail,
      purchaserName,
      scheduledDeliveryAt: deliverNow ? nowIso : scheduled,
    },
  };
}

async function markDelivered(env, card, code) {
  const sent = await sendGiftCardEmail(env, card, code);
  await env.DB.prepare(
    `UPDATE gift_cards
     SET delivered_at = datetime('now'), email_status = ?, updated_at = datetime('now')
     WHERE id = ?`
  )
    .bind(sent.ok ? 'sent' : `failed:${String(sent.reason || 'unknown').slice(0, 180)}`, card.id)
    .run();
  return sent;
}

export async function activatePurchasedGiftCard(env, session) {
  if (!session?.id) return { ok: false, error: 'Invalid session' };
  if (session.payment_status && session.payment_status !== 'paid') {
    return { ok: false, error: 'Payment not completed yet' };
  }

  const giftCardId = session.metadata?.gift_card_id;
  if (!giftCardId) return { ok: false, error: 'Missing gift card on payment' };

  const card = await env.DB.prepare('SELECT * FROM gift_cards WHERE id = ? LIMIT 1')
    .bind(giftCardId)
    .first();
  if (!card) return { ok: false, error: 'Gift card not found' };
  if (card.status === 'active' || card.status === 'scheduled' || card.status === 'exhausted') {
    return { ok: true, giftCardId, duplicate: true };
  }
  if (card.status !== 'pending') {
    return { ok: false, error: 'Gift card cannot be activated from this state.' };
  }

  const generated = await assignCode(env, card.id);
  if (generated.error) return { ok: false, error: generated.error };

  const deliverLater = card.scheduled_delivery_at && Date.parse(card.scheduled_delivery_at) > Date.now();
  const nextStatus = deliverLater ? 'scheduled' : 'active';
  const txId = crypto.randomUUID();
  const paymentId = crypto.randomUUID();

  await env.DB.batch([
    env.DB.prepare(
      `UPDATE gift_cards
       SET current_balance_cents = original_amount_cents,
           status = ?,
           payment_id = ?,
           stripe_session_id = ?,
           updated_at = datetime('now')
       WHERE id = ? AND status = 'pending'`
    ).bind(nextStatus, paymentId, session.id, card.id),
    env.DB.prepare(
      `INSERT INTO gift_card_transactions (
         id, gift_card_id, transaction_type, amount_cents, balance_before_cents, balance_after_cents,
         reason, created_by, payment_id
       ) VALUES (?, ?, 'issue', ?, 0, ?, 'Purchased e-gift card', 'system:stripe', ?)`
    ).bind(txId, card.id, card.original_amount_cents, card.original_amount_cents, paymentId),
  ]);

  const updated = await env.DB.prepare('SELECT * FROM gift_cards WHERE id = ?').bind(card.id).first();
  if (!deliverLater) {
    await markDelivered(env, { ...updated, recipient_email: updated.recipient_email }, generated.code);
  }

  return { ok: true, giftCardId: card.id, status: nextStatus, codeLastFour: generated.lastFour };
}

export async function issuePromotional(env, input, adminLabel) {
  const amountCents =
    typeof input.amountCents === 'number' ? input.amountCents : dollarsToCents(input.amountDollars);
  if (!amountCents || amountCents <= 0) return { error: 'Enter a valid credit amount.' };

  const settings = await getSettings(env.DB);
  const recipientName = cleanName(input.recipientName) || 'Guest';
  const recipientEmail = cleanEmail(input.recipientEmail);
  if (!recipientEmail) return { error: 'Enter a valid recipient email.' };

  const generated = await uniqueCode(env);
  if (generated.error) return generated;

  const id = crypto.randomUUID();
  const txId = crypto.randomUUID();
  const existingUser = await env.DB.prepare('SELECT id FROM users WHERE email = ? LIMIT 1')
    .bind(recipientEmail)
    .first();

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO gift_cards (
         id, code_hash, code_encrypted, code_last_four, type,
         original_amount_cents, current_balance_cents, currency, status,
         recipient_name, recipient_email, purchaser_name, purchaser_email, gift_message,
         issued_to_customer_id, issued_by_admin, source, expires_at, delivered_at, email_status
       ) VALUES (?, ?, ?, ?, 'PROMOTIONAL_CREDIT', ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?, 'admin', ?, NULL, 'pending')`
    ).bind(
      id,
      generated.codeHash,
      generated.codeEncrypted,
      generated.lastFour,
      amountCents,
      amountCents,
      settings.currency || 'usd',
      recipientName,
      recipientEmail,
      'Martins Global Travels',
      null,
      cleanMessage(input.giftMessage) || 'Promotional travel credit',
      existingUser?.id || null,
      adminLabel || 'admin',
      expiresAtFor(settings, 'PROMOTIONAL_CREDIT', parseDeliveryAt(input.expiresAt))
    ),
    env.DB.prepare(
      `INSERT INTO gift_card_transactions (
         id, gift_card_id, customer_id, transaction_type, amount_cents,
         balance_before_cents, balance_after_cents, reason, created_by
       ) VALUES (?, ?, ?, 'issue', ?, 0, ?, ?, ?)`
    ).bind(
      txId,
      id,
      existingUser?.id || null,
      amountCents,
      amountCents,
      cleanMessage(input.reason) || 'Promotional travel credit',
      `admin:${adminLabel || 'staff'}`
    ),
  ]);

  const card = await env.DB.prepare('SELECT * FROM gift_cards WHERE id = ?').bind(id).first();
  if (input.sendEmail !== false) {
    await markDelivered(env, card, generated.code);
  }

  return { giftCard: toAdminCard(card), code: generated.code, codeLastFour: generated.lastFour };
}

async function logAttempt(env, { ip, customerId, lastFour, success, reason }) {
  await env.DB.prepare(
    `INSERT INTO gift_card_redemption_attempts (id, code_last_four, ip, customer_id, success, reason)
     VALUES (?, ?, ?, ?, ?, ?)`
  )
    .bind(crypto.randomUUID(), lastFour || null, ip || null, customerId || null, success ? 1 : 0, reason || null)
    .run();
}

export async function isRateLimited(env, { ip, customerId }) {
  const byIp = ip
    ? await env.DB.prepare(
        `SELECT COUNT(*) AS n FROM gift_card_redemption_attempts
         WHERE success = 0 AND ip = ? AND created_at > datetime('now', '-15 minutes')`
      )
        .bind(ip)
        .first()
    : { n: 0 };
  const byUser = customerId
    ? await env.DB.prepare(
        `SELECT COUNT(*) AS n FROM gift_card_redemption_attempts
         WHERE success = 0 AND customer_id = ? AND created_at > datetime('now', '-60 minutes')`
      )
        .bind(customerId)
        .first()
    : { n: 0 };
  return Number(byIp?.n || 0) >= 5 || Number(byUser?.n || 0) >= 10;
}

async function findByCode(env, code) {
  const secret = pepper(env);
  if (!secret) return { error: 'Server auth is not configured.' };
  const formatted = formatCode(code);
  const hash = await hashCode(formatted, secret);
  const row = await env.DB.prepare('SELECT * FROM gift_cards WHERE code_hash = ? LIMIT 1')
    .bind(hash)
    .first();
  return { row, formatted };
}

function cardUsableError(card, settings, user) {
  if (!card) return 'That gift card code was not found.';
  if (card.status === 'pending') return 'This gift card is not active yet. Payment may still be processing.';
  if (card.status === 'scheduled') return 'This gift card has not been delivered yet.';
  if (card.status === 'disabled') return 'This gift card has been disabled.';
  if (card.status === 'exhausted' || (card.current_balance_cents || 0) <= 0) {
    return 'This gift card has no remaining balance.';
  }
  if (card.status === 'expired' || isExpired(card)) return 'This gift card has expired.';
  if (card.status !== 'active') return 'This gift card cannot be used.';
  if (Number(settings.transferable) !== 1) {
    const email = (user?.email || '').toLowerCase();
    if (card.recipient_email && card.recipient_email !== email) {
      return 'This gift card can only be used by the original recipient.';
    }
  }
  if (card.issued_to_customer_id && card.issued_to_customer_id !== user?.id) {
    return 'This gift card is already linked to another account.';
  }
  return null;
}

async function maybeExpire(env, card) {
  if (card && isExpired(card) && card.status === 'active') {
    await env.DB.prepare(
      `UPDATE gift_cards SET status = 'expired', updated_at = datetime('now') WHERE id = ? AND status = 'active'`
    )
      .bind(card.id)
      .run();
    card.status = 'expired';
  }
}

export async function claimCode(env, { code, user, ip }) {
  if (await isRateLimited(env, { ip, customerId: user.id })) {
    return { error: 'Too many attempts. Please wait a few minutes and try again.', status: 429 };
  }
  const found = await findByCode(env, code);
  if (found.error) return found;
  await maybeExpire(env, found.row);
  const settings = await getSettings(env.DB);
  const err = cardUsableError(found.row, settings, user);
  const lastFour = found.formatted ? lastFourFromCode(found.formatted) : null;
  if (err) {
    await logAttempt(env, { ip, customerId: user.id, lastFour, success: false, reason: err });
    return { error: err, status: 400 };
  }

  if (!found.row.issued_to_customer_id) {
    await env.DB.prepare(
      `UPDATE gift_cards SET issued_to_customer_id = ?, updated_at = datetime('now')
       WHERE id = ? AND issued_to_customer_id IS NULL`
    )
      .bind(user.id, found.row.id)
      .run();
  }

  await logAttempt(env, { ip, customerId: user.id, lastFour, success: true, reason: 'claimed' });
  const updated = await env.DB.prepare('SELECT * FROM gift_cards WHERE id = ?').bind(found.row.id).first();
  return { giftCard: toPublicCard(updated) };
}

async function applyOneCard(env, { card, user, tripBalanceCents }) {
  const usable = Math.min(card.current_balance_cents || 0, tripBalanceCents);
  if (usable <= 0) return { appliedCents: 0, tripBalanceCents };

  const appId = crypto.randomUUID();
  const txId = crypto.randomUUID();
  const newCardBalance = card.current_balance_cents - usable;
  const newStatus = newCardBalance <= 0 ? 'exhausted' : card.status;
  const newTrip = tripBalanceCents - usable;

  const hold = await env.DB.prepare(
    `UPDATE gift_cards
     SET current_balance_cents = current_balance_cents - ?,
         status = CASE WHEN current_balance_cents - ? <= 0 THEN 'exhausted' ELSE status END,
         issued_to_customer_id = COALESCE(issued_to_customer_id, ?),
         updated_at = datetime('now')
     WHERE id = ?
       AND status = 'active'
       AND current_balance_cents >= ?
       AND (expires_at IS NULL OR expires_at > datetime('now'))`
  )
    .bind(usable, usable, user.id, card.id, usable)
    .run();

  if ((hold.meta?.changes ?? 0) !== 1) {
    return { error: 'This gift card could not be applied. Please try again.', status: 409 };
  }

  try {
    await env.DB.batch([
      env.DB.prepare(
        `UPDATE client_accounts
         SET balance_cents = CASE WHEN balance_cents - ? < 0 THEN 0 ELSE balance_cents - ? END,
             updated_at = datetime('now')
         WHERE id = ?`
      ).bind(usable, usable, user.id),
      env.DB.prepare(
        `INSERT INTO gift_card_transactions (
           id, gift_card_id, customer_id, application_id, transaction_type, amount_cents,
           balance_before_cents, balance_after_cents, reason, created_by, booking_id
         ) VALUES (?, ?, ?, ?, 'redeem', ?, ?, ?, ?, ?, ?)`
      ).bind(
        txId,
        card.id,
        user.id,
        appId,
        -usable,
        card.current_balance_cents,
        newCardBalance,
        'Applied to trip balance',
        `customer:${user.id}`,
        user.id
      ),
      env.DB.prepare(
        `INSERT INTO gift_card_applications (
           id, gift_card_id, customer_id, amount_cents, trip_balance_before_cents, trip_balance_after_cents,
           status, ledger_tx_id
         ) VALUES (?, ?, ?, ?, ?, ?, 'applied', ?)`
      ).bind(appId, card.id, user.id, usable, tripBalanceCents, newTrip, txId),
    ]);
  } catch (err) {
    await env.DB.prepare(
      `UPDATE gift_cards
       SET current_balance_cents = current_balance_cents + ?,
           status = CASE WHEN current_balance_cents + ? > 0 AND status = 'exhausted' THEN 'active' ELSE status END,
           updated_at = datetime('now')
       WHERE id = ?`
    )
      .bind(usable, usable, card.id)
      .run();
    throw err;
  }

  return { appliedCents: usable, tripBalanceCents: newTrip, applicationId: appId, giftCardId: card.id };
}

export async function quoteAndApply(env, { user, code, giftCardId, applyAvailable, apply: doApply }) {
  const account = await env.DB.prepare(
    `SELECT id, balance_cents, currency FROM client_accounts WHERE id = ? LIMIT 1`
  )
    .bind(user.id)
    .first();
  if (!account) return { error: 'Account not found', status: 404 };

  const settings = await getSettings(env.DB);
  const tripTotalCents = account.balance_cents || 0;
  let remaining = tripTotalCents;
  const selected = [];

  if (code || giftCardId) {
    let card = null;
    if (giftCardId) {
      card = await env.DB.prepare('SELECT * FROM gift_cards WHERE id = ? LIMIT 1').bind(giftCardId).first();
    } else {
      const found = await findByCode(env, code);
      if (found.error) return found;
      card = found.row;
      await maybeExpire(env, card);
      const err = cardUsableError(card, settings, user);
      if (err) {
        if (await isRateLimited(env, { ip: user.ip, customerId: user.id })) {
          return { error: 'Too many attempts. Please wait a few minutes and try again.', status: 429 };
        }
        await logAttempt(env, {
          ip: user.ip,
          customerId: user.id,
          lastFour: found.formatted ? lastFourFromCode(found.formatted) : null,
          success: false,
          reason: err,
        });
        return { error: err, status: 400 };
      }
    }
    if (!card) return { error: 'Gift card not found.', status: 404 };
    await maybeExpire(env, card);
    const err = cardUsableError(card, settings, user);
    if (err) return { error: err, status: 400 };
    selected.push(card);
  } else if (applyAvailable) {
    const { results } = await env.DB.prepare(
      `SELECT * FROM gift_cards
       WHERE issued_to_customer_id = ?
         AND status = 'active'
         AND current_balance_cents > 0
         AND (expires_at IS NULL OR expires_at > datetime('now'))
       ORDER BY created_at ASC`
    )
      .bind(user.id)
      .all();
    for (const row of results || []) selected.push(row);
    if (!selected.length) {
      return { error: 'You do not have any travel credit to apply.', status: 400 };
    }
    if (selected.length > 1 && Number(settings.allow_combine) !== 1) {
      selected.splice(1);
    }
  } else {
    return { error: 'Enter a gift card code or apply available credit.', status: 400 };
  }

  if (tripTotalCents <= 0) {
    return {
      error: 'There is no trip balance due.',
      status: 400,
      quote: {
        tripTotalCents,
        creditAppliedCents: 0,
        remainingBalanceCents: 0,
        cards: [],
      },
    };
  }

  const plan = [];
  for (const card of selected) {
    if (remaining <= 0) break;
    const usable = Math.min(card.current_balance_cents || 0, remaining);
    if (usable <= 0) continue;
    plan.push({ card, usable });
    remaining -= usable;
    if (Number(settings.allow_combine) !== 1) break;
  }

  const quote = {
    tripTotalCents,
    creditAppliedCents: tripTotalCents - remaining,
    remainingBalanceCents: remaining,
    cards: plan.map((p) => ({
      id: p.card.id,
      type: p.card.type,
      codeLastFour: p.card.code_last_four,
      appliedCents: p.usable,
      remainingAfterCents: p.card.current_balance_cents - p.usable,
    })),
  };

  if (!doApply) return { quote };

  const applications = [];
  let liveTrip = tripTotalCents;
  for (const step of plan) {
    const result = await applyOneCard(env, { card: step.card, user, tripBalanceCents: liveTrip });
    if (result.error) return result;
    liveTrip = result.tripBalanceCents;
    applications.push(result);
  }

  const updatedAccount = await env.DB.prepare(
    `SELECT balance_cents, currency FROM client_accounts WHERE id = ?`
  )
    .bind(user.id)
    .first();

  return {
    quote: {
      tripTotalCents,
      creditAppliedCents: tripTotalCents - (updatedAccount?.balance_cents || 0),
      remainingBalanceCents: updatedAccount?.balance_cents || 0,
      cards: quote.cards,
    },
    applications,
    account: updatedAccount,
  };
}

export async function listMyCards(env, userId, userEmail) {
  const { results } = await env.DB.prepare(
    `SELECT * FROM gift_cards
     WHERE issued_to_customer_id = ?
        OR (recipient_email = ? AND status IN ('active', 'scheduled', 'exhausted', 'expired') AND issued_to_customer_id IS NULL)
     ORDER BY created_at DESC`
  )
    .bind(userId, (userEmail || '').toLowerCase())
    .all();

  const cards = (results || []).map((row) => {
    if (isExpired(row) && row.status === 'active') row.status = 'expired';
    return toPublicCard(row);
  });
  const availableCents = cards
    .filter((c) => c.status === 'active')
    .reduce((sum, c) => sum + (c.currentBalanceCents || 0), 0);
  return { cards, availableCents };
}

export async function listCardTransactions(env, giftCardId, { userId, admin } = {}) {
  const card = await env.DB.prepare('SELECT * FROM gift_cards WHERE id = ? LIMIT 1')
    .bind(giftCardId)
    .first();
  if (!card) return { error: 'Gift card not found.', status: 404 };
  if (!admin && card.issued_to_customer_id && card.issued_to_customer_id !== userId) {
    return { error: 'Not found.', status: 404 };
  }
  if (!admin && !card.issued_to_customer_id && userId) {
    const user = await env.DB.prepare('SELECT email FROM users WHERE id = ?').bind(userId).first();
    if ((user?.email || '').toLowerCase() !== (card.recipient_email || '')) {
      return { error: 'Not found.', status: 404 };
    }
  }
  const { results } = await env.DB.prepare(
    `SELECT id, gift_card_id, customer_id, booking_id, application_id, transaction_type,
            amount_cents, balance_before_cents, balance_after_cents, reason, created_by, created_at
     FROM gift_card_transactions WHERE gift_card_id = ? ORDER BY created_at ASC, rowid ASC`
  )
    .bind(giftCardId)
    .all();
  return { card: admin ? toAdminCard(card) : toPublicCard(card), transactions: results || [] };
}

export async function adminListCards(env, { q, status, type } = {}) {
  let sql = 'SELECT * FROM gift_cards WHERE 1=1';
  const binds = [];
  if (status) {
    sql += ' AND status = ?';
    binds.push(status);
  }
  if (type) {
    sql += ' AND type = ?';
    binds.push(type);
  }
  if (q) {
    const term = `%${String(q).trim().toLowerCase()}%`;
    sql += ` AND (
      lower(recipient_email) LIKE ? OR lower(recipient_name) LIKE ?
      OR lower(purchaser_email) LIKE ? OR lower(code_last_four) LIKE ?
      OR lower(id) LIKE ?
    )`;
    binds.push(term, term, term, `%${String(q).trim().toUpperCase().slice(-4)}%`, term);
  }
  sql += ' ORDER BY created_at DESC LIMIT 200';
  const stmt = env.DB.prepare(sql);
  const { results } = binds.length ? await stmt.bind(...binds).all() : await stmt.all();
  return { giftCards: (results || []).map(toAdminCard), count: (results || []).length };
}

export async function adminGetCard(env, id) {
  const card = await env.DB.prepare('SELECT * FROM gift_cards WHERE id = ?').bind(id).first();
  if (!card) return { error: 'Gift card not found.', status: 404 };
  const tx = await listCardTransactions(env, id, { admin: true });
  const { results: apps } = await env.DB.prepare(
    `SELECT * FROM gift_card_applications WHERE gift_card_id = ? ORDER BY created_at DESC`
  )
    .bind(id)
    .all();
  return { giftCard: toAdminCard(card), transactions: tx.transactions || [], applications: apps || [] };
}

export async function adminAdjust(env, { id, amountCents, reason, adminLabel }) {
  if (!reason || String(reason).trim().length < 3) {
    return { error: 'A reason is required for every balance adjustment.', status: 400 };
  }
  if (!amountCents || amountCents === 0) return { error: 'Enter a non-zero adjustment amount.', status: 400 };

  const card = await env.DB.prepare('SELECT * FROM gift_cards WHERE id = ?').bind(id).first();
  if (!card) return { error: 'Gift card not found.', status: 404 };
  if (card.status === 'pending') return { error: 'Cannot adjust a card that has not been paid for.', status: 400 };

  const next = card.current_balance_cents + amountCents;
  if (next < 0) return { error: 'That adjustment would make the balance negative.', status: 400 };

  let nextStatus = card.status;
  if (card.status === 'disabled') {
    /* keep disabled */
  } else if (next === 0) nextStatus = 'exhausted';
  else if (card.status === 'exhausted' && next > 0) nextStatus = 'active';

  const txId = crypto.randomUUID();
  await env.DB.batch([
    env.DB.prepare(
      `UPDATE gift_cards
       SET current_balance_cents = ?, status = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(next, nextStatus, id),
    env.DB.prepare(
      `INSERT INTO gift_card_transactions (
         id, gift_card_id, customer_id, transaction_type, amount_cents,
         balance_before_cents, balance_after_cents, reason, created_by
       ) VALUES (?, ?, ?, 'admin_adjust', ?, ?, ?, ?, ?)`
    ).bind(
      txId,
      id,
      card.issued_to_customer_id,
      amountCents,
      card.current_balance_cents,
      next,
      String(reason).trim().slice(0, 400),
      `admin:${adminLabel || 'staff'}`
    ),
  ]);

  const updated = await env.DB.prepare('SELECT * FROM gift_cards WHERE id = ?').bind(id).first();
  return { giftCard: toAdminCard(updated) };
}

export async function adminSetStatus(env, { id, status, reason, adminLabel }) {
  if (!['disabled', 'active'].includes(status)) {
    return { error: 'Status must be active or disabled.', status: 400 };
  }
  const card = await env.DB.prepare('SELECT * FROM gift_cards WHERE id = ?').bind(id).first();
  if (!card) return { error: 'Gift card not found.', status: 404 };
  if (card.status === 'pending') return { error: 'This card is not issued yet.', status: 400 };

  let next = status;
  if (status === 'active') {
    if (isExpired(card)) next = 'expired';
    else if ((card.current_balance_cents || 0) <= 0) next = 'exhausted';
  }

  const txId = crypto.randomUUID();
  await env.DB.batch([
    env.DB.prepare(`UPDATE gift_cards SET status = ?, updated_at = datetime('now') WHERE id = ?`).bind(
      next,
      id
    ),
    env.DB.prepare(
      `INSERT INTO gift_card_transactions (
         id, gift_card_id, customer_id, transaction_type, amount_cents,
         balance_before_cents, balance_after_cents, reason, created_by
       ) VALUES (?, ?, ?, 'admin_adjust', 0, ?, ?, ?, ?)`
    ).bind(
      txId,
      id,
      card.issued_to_customer_id,
      card.current_balance_cents,
      card.current_balance_cents,
      String(reason || (status === 'disabled' ? 'Disabled by admin' : 'Re-enabled by admin')).slice(0, 400),
      `admin:${adminLabel || 'staff'}`
    ),
  ]);
  const updated = await env.DB.prepare('SELECT * FROM gift_cards WHERE id = ?').bind(id).first();
  return { giftCard: toAdminCard(updated) };
}

export async function adminResend(env, id) {
  const card = await env.DB.prepare('SELECT * FROM gift_cards WHERE id = ?').bind(id).first();
  if (!card) return { error: 'Gift card not found.', status: 404 };
  if (!card.code_encrypted) return { error: 'This card has no code to send yet.', status: 400 };
  const secret = pepper(env);
  const code = await decryptCode(card.code_encrypted, secret);
  if (!code) return { error: 'Could not unlock the stored code. Check AUTH_SECRET.', status: 500 };
  const sent = await markDelivered(env, card, code);
  return { ok: true, emailStatus: sent.ok ? 'sent' : sent.reason, recipientEmail: card.recipient_email };
}

export async function restoreApplication(env, { applicationId, reason, adminLabel }) {
  const app = await env.DB.prepare('SELECT * FROM gift_card_applications WHERE id = ?')
    .bind(applicationId)
    .first();
  if (!app) return { error: 'Application not found.', status: 404 };
  if (app.status === 'restored') return { error: 'That credit was already restored.', status: 400 };

  const card = await env.DB.prepare('SELECT * FROM gift_cards WHERE id = ?').bind(app.gift_card_id).first();
  if (!card) return { error: 'Gift card not found.', status: 404 };

  const txId = crypto.randomUUID();
  const nextBalance = card.current_balance_cents + app.amount_cents;
  let nextStatus = card.status;
  if (card.status === 'exhausted' && nextBalance > 0) nextStatus = 'active';
  if (card.status === 'disabled') nextStatus = 'disabled';

  await env.DB.batch([
    env.DB.prepare(
      `UPDATE gift_cards
       SET current_balance_cents = current_balance_cents + ?, status = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(app.amount_cents, nextStatus, card.id),
    env.DB.prepare(
      `UPDATE client_accounts
       SET balance_cents = balance_cents + ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(app.amount_cents, app.customer_id),
    env.DB.prepare(
      `UPDATE gift_card_applications
       SET status = 'restored', restore_tx_id = ?, restored_at = datetime('now')
       WHERE id = ? AND status = 'applied'`
    ).bind(txId, app.id),
    env.DB.prepare(
      `INSERT INTO gift_card_transactions (
         id, gift_card_id, customer_id, application_id, transaction_type, amount_cents,
         balance_before_cents, balance_after_cents, reason, created_by, booking_id
       ) VALUES (?, ?, ?, ?, 'refund_restore', ?, ?, ?, ?, ?, ?)`
    ).bind(
      txId,
      card.id,
      app.customer_id,
      app.id,
      app.amount_cents,
      card.current_balance_cents,
      nextBalance,
      String(reason || 'Restored after booking cancellation/refund').slice(0, 400),
      `admin:${adminLabel || 'staff'}`,
      app.customer_id
    ),
  ]);

  return { ok: true, restoredCents: app.amount_cents };
}

export async function updateSettings(env, patch, adminLabel) {
  const current = await getSettings(env.DB);
  const next = { ...current };
  const intKeys = [
    'min_amount_cents',
    'max_amount_cents',
    'allow_custom_amount',
    'purchased_expires_days',
    'promotional_expires_days',
    'allow_combine',
    'transferable',
  ];
  for (const key of intKeys) {
    if (patch[key] !== undefined && patch[key] !== '') {
      const n = parseInt(patch[key], 10);
      next[key] = Number.isFinite(n) ? n : null;
    }
  }
  await env.DB.prepare(
    `UPDATE gift_card_settings SET
       min_amount_cents = ?, max_amount_cents = ?, allow_custom_amount = ?,
       purchased_expires_days = ?, promotional_expires_days = ?,
       allow_combine = ?, transferable = ?, updated_at = datetime('now')
     WHERE id = 1`
  )
    .bind(
      next.min_amount_cents,
      next.max_amount_cents,
      next.allow_custom_amount ? 1 : 0,
      next.purchased_expires_days,
      next.promotional_expires_days,
      next.allow_combine ? 1 : 0,
      next.transferable ? 1 : 0
    )
    .run();
  return { settings: publicConfig(await getSettings(env.DB)), updatedBy: adminLabel || 'admin' };
}

export async function deliverDueCards(env) {
  const { results } = await env.DB.prepare(
    `SELECT * FROM gift_cards
     WHERE status = 'scheduled'
       AND scheduled_delivery_at IS NOT NULL
       AND scheduled_delivery_at <= datetime('now')
     LIMIT 25`
  ).all();

  const delivered = [];
  for (const card of results || []) {
    const secret = pepper(env);
    const code = card.code_encrypted ? await decryptCode(card.code_encrypted, secret) : null;
    await env.DB.prepare(
      `UPDATE gift_cards SET status = 'active', updated_at = datetime('now') WHERE id = ? AND status = 'scheduled'`
    )
      .bind(card.id)
      .run();
    if (code) await markDelivered(env, { ...card, status: 'active' }, code);
    delivered.push(card.id);
  }
  return { delivered: delivered.length };
}

export function clientIp(request) {
  return (
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
    ''
  );
}
