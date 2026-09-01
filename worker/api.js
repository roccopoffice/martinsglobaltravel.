import Stripe from 'stripe';
import { json, empty, readJson, verifyAdmin, dollarsToCents, siteUrl } from './lib/http.js';
import { hashPassword, verifyPassword, signToken, verifyToken, requireUser } from './lib/auth.js';
import { applyCheckoutSession, sessionBelongsToUser } from './lib/payments.js';
import { amadeusFetch, normalizeFlightOffers } from './lib/amadeus.js';
import { computeFlightPricing } from './lib/flight-pricing.js';
import {
  sendMoneyInfo,
  sendMoneyCheckout,
  sendMoneyConfirm,
  mySendMoneyLink,
  adminSendMoney,
} from './send-money-api.js';


const TICKET_PACKAGES = {
  'evt-single': { name: 'Single event package', cents: 250000 },
  'evt-weekend': { name: 'Weekend getaway package', cents: 485000 },
  'evt-premium': { name: 'VIP experience package', cents: 1250000 },
};

function stripeClient(env) {
  return env.STRIPE_SECRET_KEY ? new Stripe(env.STRIPE_SECRET_KEY) : null;
}

function apiPath(pathname) {
  if (pathname.startsWith('/.netlify/functions/')) {
    return pathname.slice('/.netlify/functions/'.length);
  }
  if (pathname.startsWith('/api/')) {
    return pathname.slice('/api/'.length);
  }
  return null;
}

async function authLogin(request, env) {
  if (!env.AUTH_SECRET) return json(503, { error: 'Portal auth is not configured on the server.' });
  const body = await readJson(request);
  if (!body) return json(400, { error: 'Invalid request' });

  const email = String(body.email || '')
    .trim()
    .toLowerCase();
  const password = String(body.password || '');
  if (!email || !password) return json(400, { error: 'Email and password are required.' });

  const user = await env.DB.prepare('SELECT * FROM users WHERE email = ? LIMIT 1').bind(email).first();
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return json(401, { error: 'Invalid email or password.' });
  }

  const token = await signToken({ sub: user.id, email: user.email }, env.AUTH_SECRET);
  return json(200, {
    token,
    user: {
      id: user.id,
      email: user.email,
      must_change_password: user.must_change_password === 1,
    },
  });
}

async function authSession(request, env) {
  const auth = await requireUser(request, env);
  if (auth.error) return json(401, { error: auth.error });

  const user = await env.DB.prepare('SELECT id, email, must_change_password FROM users WHERE id = ?')
    .bind(auth.userId)
    .first();
  if (!user) return json(401, { error: 'Invalid session' });

  return json(200, {
    user: {
      id: user.id,
      email: user.email,
      must_change_password: user.must_change_password === 1,
    },
  });
}

async function authBalance(request, env) {
  const auth = await requireUser(request, env);
  if (auth.error) return json(401, { error: auth.error });

  const row = await env.DB.prepare(
    `SELECT balance_cents, currency, full_name, first_name, last_name
     FROM client_accounts WHERE id = ? LIMIT 1`
  )
    .bind(auth.userId)
    .first();

  if (!row) return json(404, { error: 'Account not found' });
  return json(200, { account: row });
}

async function authChangePassword(request, env) {
  const auth = await requireUser(request, env);
  if (auth.error) return json(401, { error: auth.error });

  const body = await readJson(request);
  if (!body) return json(400, { error: 'Invalid request' });

  const newPassword = String(body.newPassword || body.password || '');
  if (newPassword.length < 6) return json(400, { error: 'Password must be at least 6 characters.' });

  const user = await env.DB.prepare('SELECT password_hash FROM users WHERE id = ?').bind(auth.userId).first();
  if (!user) return json(401, { error: 'Invalid session' });

  const current = String(body.currentPassword || '');
  if (current && !(await verifyPassword(current, user.password_hash))) {
    return json(401, { error: 'Current password is incorrect.' });
  }

  const passwordHash = await hashPassword(newPassword);
  await env.DB.prepare(
    `UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?`
  )
    .bind(passwordHash, auth.userId)
    .run();

  return json(200, { ok: true });
}

const MIN_WITHDRAWAL_CENTS = 100;

async function getWalletAccount(env, userId) {
  return env.DB.prepare(
    `SELECT id, email, first_name, last_name, full_name, credit_cents, currency, stripe_connect_id
     FROM client_accounts WHERE id = ? LIMIT 1`
  )
    .bind(userId)
    .first();
}

async function walletInfo(request, env) {
  const auth = await requireUser(request, env);
  if (auth.error) return json(401, { error: auth.error });

  const account = await getWalletAccount(env, auth.userId);
  if (!account) return json(404, { error: 'Account not found' });

  const stripe = stripeClient(env);
  let payout = { connected: false, payoutsEnabled: false, onboardingComplete: false };
  if (account.stripe_connect_id && stripe) {
    try {
      const acct = await stripe.accounts.retrieve(account.stripe_connect_id);
      payout = {
        connected: true,
        payoutsEnabled: !!acct.payouts_enabled,
        onboardingComplete: !!acct.details_submitted,
      };
    } catch (err) {
      console.error('wallet account retrieve', err);
      payout.connected = true;
    }
  }

  const { results } = await env.DB.prepare(
    `SELECT type, amount_cents, status, note, created_at
     FROM credit_transactions WHERE user_id = ?
     ORDER BY created_at DESC, rowid DESC LIMIT 20`
  )
    .bind(auth.userId)
    .all();

  return json(200, {
    creditCents: account.credit_cents || 0,
    currency: account.currency || 'usd',
    payout,
    payoutsConfigured: !!stripe,
    transactions: results || [],
  });
}

async function walletConnectOnboarding(request, env) {
  const stripe = stripeClient(env);
  if (!stripe) {
    return json(503, { error: 'Bank withdrawals are not set up yet. Call (508) 232-3003 for help.' });
  }

  const auth = await requireUser(request, env);
  if (auth.error) return json(401, { error: auth.error });

  const account = await getWalletAccount(env, auth.userId);
  if (!account) return json(404, { error: 'Account not found' });

  try {
    let connectId = account.stripe_connect_id;
    if (!connectId) {
      const created = await stripe.accounts.create({
        type: 'express',
        email: account.email || auth.email,
        business_type: 'individual',
        capabilities: { transfers: { requested: true } },
        metadata: { user_id: auth.userId },
      });
      connectId = created.id;
      await env.DB.prepare(
        `UPDATE client_accounts SET stripe_connect_id = ?, updated_at = datetime('now') WHERE id = ?`
      )
        .bind(connectId, auth.userId)
        .run();
    }

    const base = siteUrl(request, env);
    const link = await stripe.accountLinks.create({
      account: connectId,
      refresh_url: `${base}/portal.html?connect=refresh`,
      return_url: `${base}/portal.html?connect=done`,
      type: 'account_onboarding',
    });

    return json(200, { url: link.url });
  } catch (err) {
    console.error('wallet connect', err);
    return json(502, {
      error:
        'Bank setup could not start. Please try again in a moment or call (508) 232-3003.',
    });
  }
}

async function walletWithdraw(request, env) {
  const stripe = stripeClient(env);
  if (!stripe) {
    return json(503, { error: 'Bank withdrawals are not set up yet. Call (508) 232-3003 for help.' });
  }

  const auth = await requireUser(request, env);
  if (auth.error) return json(401, { error: auth.error });

  const body = await readJson(request);
  const amountCents = dollarsToCents(body?.amountDollars);
  if (amountCents === null || amountCents < MIN_WITHDRAWAL_CENTS) {
    return json(400, { error: 'Enter an amount of at least $1.00.' });
  }

  const account = await getWalletAccount(env, auth.userId);
  if (!account) return json(404, { error: 'Account not found' });
  if ((account.credit_cents || 0) < amountCents) {
    return json(400, { error: 'That is more than your available credit.' });
  }
  if (!account.stripe_connect_id) {
    return json(400, { error: 'Set up your bank account first.' });
  }

  let connectAccount;
  try {
    connectAccount = await stripe.accounts.retrieve(account.stripe_connect_id);
  } catch (err) {
    console.error('wallet withdraw retrieve', err);
    return json(502, { error: 'Could not verify your bank setup. Please try again.' });
  }
  if (!connectAccount.payouts_enabled) {
    return json(400, {
      error: 'Your bank setup is not finished yet. Use "Set up bank account" to complete it.',
    });
  }

  // Reserve the credit first so the same dollars can't be withdrawn twice.
  const hold = await env.DB.prepare(
    `UPDATE client_accounts SET credit_cents = credit_cents - ?, updated_at = datetime('now')
     WHERE id = ? AND credit_cents >= ?`
  )
    .bind(amountCents, auth.userId, amountCents)
    .run();
  if ((hold.meta?.changes ?? 1) !== 1) {
    return json(400, { error: 'That is more than your available credit.' });
  }

  let transfer;
  try {
    transfer = await stripe.transfers.create({
      amount: amountCents,
      currency: (account.currency || 'usd').toLowerCase(),
      destination: account.stripe_connect_id,
      description: 'Martins Global Travels credit withdrawal',
      metadata: { user_id: auth.userId },
    });
  } catch (err) {
    // Give the credit back if the money never moved.
    await env.DB.prepare(`UPDATE client_accounts SET credit_cents = credit_cents + ? WHERE id = ?`)
      .bind(amountCents, auth.userId)
      .run();
    console.error('wallet withdraw transfer', err);
    const msg = String(err?.raw?.message || err?.message || '').toLowerCase();
    if (msg.includes('insufficient')) {
      return json(503, {
        error:
          'Withdrawals are temporarily unavailable. Please try again later or call (508) 232-3003.',
      });
    }
    return json(502, { error: 'The withdrawal could not be completed. Please try again or contact us.' });
  }

  await env.DB.prepare(
    `INSERT INTO credit_transactions (id, user_id, type, amount_cents, status, note, stripe_transfer_id)
     VALUES (?, ?, 'withdrawal', ?, 'completed', 'Withdrawal to your bank', ?)`
  )
    .bind(crypto.randomUUID(), auth.userId, amountCents, transfer.id)
    .run();

  const updated = await getWalletAccount(env, auth.userId);
  return json(200, {
    ok: true,
    creditCents: updated?.credit_cents || 0,
    message: `$${(amountCents / 100).toFixed(2)} is on its way to your bank. It usually arrives within 1–2 business days.`,
  });
}

async function createCheckout(request, env) {
  const stripe = stripeClient(env);
  if (!stripe) {
    return json(503, {
      error: 'Card payments are not set up yet. Add STRIPE_SECRET_KEY in Cloudflare and redeploy.',
    });
  }

  const auth = await requireUser(request, env);
  if (auth.error) return json(401, { error: auth.error });

  const account = await env.DB.prepare(
    `SELECT balance_cents, currency, full_name, first_name, last_name, email
     FROM client_accounts WHERE id = ? LIMIT 1`
  )
    .bind(auth.userId)
    .first();

  if (!account) return json(404, { error: 'No account found. Contact Martins Global Travels.' });
  if (account.balance_cents <= 0) return json(400, { error: 'No balance due' });

  const base = siteUrl(request, env);
  const currency = (account.currency || 'usd').toLowerCase();
  const clientName =
    [account.first_name, account.last_name].filter(Boolean).join(' ').trim() || account.full_name;

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: account.email || auth.email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency,
          unit_amount: account.balance_cents,
          product_data: {
            name: 'Travel balance — Martins Global Travels',
            description: clientName ? `Balance for ${clientName}` : 'Outstanding travel balance',
          },
        },
      },
    ],
    metadata: {
      user_id: auth.userId,
      amount_cents: String(account.balance_cents),
    },
    success_url: `${base}/portal.html?paid=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/portal.html?canceled=1`,
  });

  return json(200, { url: session.url });
}

async function confirmPayment(request, env) {
  const stripe = stripeClient(env);
  if (!stripe) return json(503, { error: 'Payments not configured' });

  const auth = await requireUser(request, env);
  if (auth.error) return json(401, { error: auth.error });

  const body = await readJson(request);
  const sessionId = String(body?.sessionId || '').trim();
  if (!sessionId.startsWith('cs_')) return json(400, { error: 'Missing payment session' });

  const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);
  if (!sessionBelongsToUser(checkoutSession, auth.userId, auth.email)) {
    return json(403, { error: 'Payment does not match this account' });
  }

  const result = await applyCheckoutSession(env.DB, checkoutSession);
  if (!result.ok) return json(500, { error: result.error });
  return json(200, { ok: true, balanceUpdated: true });
}

async function stripeWebhook(request, env) {
  const stripe = stripeClient(env);
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET;
  const sig = request.headers.get('stripe-signature') || request.headers.get('Stripe-Signature');

  if (!stripe || !webhookSecret) return new Response('Stripe webhook not configured', { status: 503 });
  if (!sig) return new Response('Missing stripe-signature', { status: 400 });

  const rawBody = await request.text();
  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (stripeEvent.type === 'checkout.session.completed') {
    const result = await applyCheckoutSession(env.DB, stripeEvent.data.object);
    if (!result.ok) return new Response(result.error || 'Database update failed', { status: 500 });
  }

  return json(200, { received: true });
}

async function adminVerify(request, env) {
  const body = await readJson(request);
  if (!body) return json(400, { error: 'Invalid request' });
  const auth = verifyAdmin(body, env);
  if (!auth.ok) return json(401, { error: auth.error });
  return json(200, { ok: true });
}

async function adminListClients(request, env) {
  const body = await readJson(request);
  if (!body) return json(400, { error: 'Invalid request' });
  const auth = verifyAdmin(body, env);
  if (!auth.ok) return json(401, { error: auth.error });

  const { results } = await env.DB.prepare(
    `SELECT a.id, a.first_name, a.last_name, a.full_name, a.email, a.balance_cents, a.credit_cents,
            a.notes, a.updated_at, l.token AS send_token, l.status AS send_link_status,
            (SELECT COALESCE(SUM(p.amount_cents), 0) FROM payments p
              WHERE p.user_id = a.id AND p.source = 'send_money' AND p.status = 'completed') AS send_received_cents
     FROM client_accounts a
     LEFT JOIN send_money_links l ON l.user_id = a.id
     ORDER BY a.last_name ASC, a.first_name ASC`
  ).all();

  const { results: sendPays } = await env.DB.prepare(
    `SELECT user_id, amount_cents, status, created_at
     FROM payments WHERE source = 'send_money'
     ORDER BY created_at DESC LIMIT 200`
  ).all();
  const sendPaymentsByUser = {};
  for (const pay of sendPays || []) {
    (sendPaymentsByUser[pay.user_id] ||= []).push({
      amountCents: pay.amount_cents,
      status: pay.status,
      createdAt: pay.created_at,
    });
  }

  const clients = (results || []).map((row) => {
    const name =
      [row.first_name, row.last_name].filter(Boolean).join(' ').trim() ||
      row.full_name?.trim() ||
      row.email;
    return {
      id: row.id,
      name,
      email: row.email,
      balanceCents: row.balance_cents,
      balanceDollars: ((row.balance_cents || 0) / 100).toFixed(2),
      creditCents: row.credit_cents || 0,
      creditDollars: ((row.credit_cents || 0) / 100).toFixed(2),
      notes: row.notes || '',
      updatedAt: row.updated_at,
      sendToken: row.send_token || null,
      sendLinkStatus: row.send_link_status || null,
      sendReceivedCents: row.send_received_cents || 0,
      sendPayments: sendPaymentsByUser[row.id] || [],
    };
  });

  return json(200, { ok: true, clients, count: clients.length });
}

async function adminCreateClient(request, env) {
  if (!env.AUTH_SECRET) return json(503, { error: 'Server auth is not configured.' });
  const body = await readJson(request);
  if (!body) return json(400, { error: 'Invalid request' });
  const auth = verifyAdmin(body, env);
  if (!auth.ok) return json(401, { error: auth.error });

  const firstName = String(body.firstName || '').trim();
  const lastName = String(body.lastName || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const balanceCents = dollarsToCents(body.balanceDollars);

  if (!firstName || !lastName) return json(400, { error: 'First and last name are required.' });
  if (!email || !email.includes('@')) return json(400, { error: 'A valid email is required.' });
  if (password.length < 6) return json(400, { error: 'Password must be at least 6 characters.' });
  if (balanceCents === null) return json(400, { error: 'Enter a valid balance amount.' });

  const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ? LIMIT 1').bind(email).first();
  const passwordHash = await hashPassword(password);
  const fullName = `${firstName} ${lastName}`;
  let userId = existing?.id || crypto.randomUUID();

  if (existing) {
    await env.DB.prepare(
      `UPDATE users SET password_hash = ?, must_change_password = 1 WHERE id = ?`
    )
      .bind(passwordHash, userId)
      .run();
  } else {
    await env.DB.prepare(
      `INSERT INTO users (id, email, password_hash, must_change_password) VALUES (?, ?, ?, 1)`
    )
      .bind(userId, email, passwordHash)
      .run();
  }

  await env.DB.prepare(
    `INSERT INTO client_accounts (id, email, first_name, last_name, full_name, balance_cents, currency, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'usd', datetime('now'))
     ON CONFLICT(id) DO UPDATE SET
       email = excluded.email,
       first_name = excluded.first_name,
       last_name = excluded.last_name,
       full_name = excluded.full_name,
       balance_cents = excluded.balance_cents,
       updated_at = datetime('now')`
  )
    .bind(userId, email, firstName, lastName, fullName, balanceCents)
    .run();

  return json(200, {
    ok: true,
    message: `${fullName} is ready. Give them the temporary password — they must set a new one on first login at /portal.html.`,
    balanceDollars: (balanceCents / 100).toFixed(2),
  });
}

async function adminUpdateBalance(request, env) {
  const body = await readJson(request);
  if (!body) return json(400, { error: 'Invalid request' });
  const auth = verifyAdmin(body, env);
  if (!auth.ok) return json(401, { error: auth.error });

  const email = String(body.email || '').trim().toLowerCase();
  const balanceCents = dollarsToCents(body.balanceDollars);
  if (!email || !email.includes('@')) return json(400, { error: 'A valid email is required.' });
  if (balanceCents === null) return json(400, { error: 'Enter a valid balance amount.' });

  await env.DB.prepare(
    `UPDATE client_accounts SET balance_cents = ?, updated_at = datetime('now') WHERE email = ?`
  )
    .bind(balanceCents, email)
    .run();

  const row = await env.DB.prepare(
    `SELECT first_name, last_name, email FROM client_accounts WHERE email = ? LIMIT 1`
  )
    .bind(email)
    .first();

  if (!row) return json(404, { error: 'No client found with that email. Add them first.' });
  const name = [row.first_name, row.last_name].filter(Boolean).join(' ') || row.email;
  return json(200, {
    ok: true,
    message: `Balance for ${name} is now $${(balanceCents / 100).toFixed(2)}.`,
  });
}

async function adminSendCredit(request, env) {
  const body = await readJson(request);
  if (!body) return json(400, { error: 'Invalid request' });
  const auth = verifyAdmin(body, env);
  if (!auth.ok) return json(401, { error: auth.error });

  const email = String(body.email || '').trim().toLowerCase();
  const amountCents = dollarsToCents(body.amountDollars);
  const note = String(body.note || '').trim().slice(0, 300);
  const remove = body.action === 'remove';

  if (!email || !email.includes('@')) return json(400, { error: 'A valid email is required.' });
  if (amountCents === null || amountCents <= 0) return json(400, { error: 'Enter a valid amount.' });

  const account = await env.DB.prepare(
    `SELECT id, email, first_name, last_name, full_name, credit_cents
     FROM client_accounts WHERE email = ? LIMIT 1`
  )
    .bind(email)
    .first();
  if (!account) return json(404, { error: 'No client found with that email. Add them first.' });

  const currentCredit = account.credit_cents || 0;
  if (remove && currentCredit < amountCents) {
    return json(400, {
      error: `They only have $${(currentCredit / 100).toFixed(2)} in credit — you can't remove more than that.`,
    });
  }

  const delta = remove ? -amountCents : amountCents;
  const defaultNote = remove ? 'Credit adjustment' : 'Credit from Martins Global Travels';

  await env.DB.batch([
    env.DB.prepare(
      `UPDATE client_accounts SET credit_cents = credit_cents + ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(delta, account.id),
    env.DB.prepare(
      `INSERT INTO credit_transactions (id, user_id, type, amount_cents, status, note)
       VALUES (?, ?, ?, ?, 'completed', ?)`
    ).bind(
      crypto.randomUUID(),
      account.id,
      remove ? 'adjustment' : 'grant',
      amountCents,
      note || defaultNote
    ),
  ]);

  const name =
    [account.first_name, account.last_name].filter(Boolean).join(' ').trim() ||
    account.full_name ||
    account.email;
  const newCredit = currentCredit + delta;
  return json(200, {
    ok: true,
    message: remove
      ? `Removed $${(amountCents / 100).toFixed(2)} — ${name} now has $${(newCredit / 100).toFixed(2)} in credit.`
      : `Sent $${(amountCents / 100).toFixed(2)} to ${name}. They now have $${(newCredit / 100).toFixed(2)} in credit to withdraw from their portal.`,
  });
}

async function adminUpdateNotes(request, env) {
  const body = await readJson(request);
  if (!body) return json(400, { error: 'Invalid request' });
  const auth = verifyAdmin(body, env);
  if (!auth.ok) return json(401, { error: auth.error });

  const email = String(body.email || '').trim().toLowerCase();
  const notes = String(body.notes ?? '');
  if (!email || !email.includes('@')) return json(400, { error: 'A valid email is required.' });

  await env.DB.prepare(
    `UPDATE client_accounts SET notes = ?, updated_at = datetime('now') WHERE email = ?`
  )
    .bind(notes, email)
    .run();

  const row = await env.DB.prepare(
    `SELECT first_name, last_name, email FROM client_accounts WHERE email = ? LIMIT 1`
  )
    .bind(email)
    .first();

  if (!row) return json(404, { error: 'No client found with that email.' });
  const name = [row.first_name, row.last_name].filter(Boolean).join(' ') || row.email;
  return json(200, { ok: true, message: `Notes saved for ${name}.` });
}

async function adminDeleteClient(request, env) {
  const body = await readJson(request);
  if (!body) return json(400, { error: 'Invalid request' });
  const auth = verifyAdmin(body, env);
  if (!auth.ok) return json(401, { error: auth.error });

  const email = String(body.email || '').trim().toLowerCase();
  if (!email || !email.includes('@')) return json(400, { error: 'A valid email is required.' });

  const account = await env.DB.prepare(
    `SELECT id, email, first_name, last_name, full_name FROM client_accounts WHERE email = ? LIMIT 1`
  )
    .bind(email)
    .first();

  if (!account) return json(404, { error: 'No client found with that email.' });
  const name =
    [account.first_name, account.last_name].filter(Boolean).join(' ').trim() ||
    account.full_name ||
    account.email;

  await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(account.id).run();

  return json(200, {
    ok: true,
    message: `${name} was removed from the portal. They can no longer sign in.`,
  });
}

async function adminGetAnalytics(request, env) {
  const body = await readJson(request);
  if (!body) return json(400, { error: 'Invalid request' });
  const auth = verifyAdmin(body, env);
  if (!auth.ok) return json(401, { error: auth.error });

  const { results: rows } = await env.DB.prepare(
    `SELECT id, balance_cents, email, first_name, last_name, full_name, updated_at FROM client_accounts`
  ).all();

  let totalOwedCents = 0;
  let clientsWithBalance = 0;
  for (const row of rows || []) {
    const bal = row.balance_cents || 0;
    if (bal > 0) {
      totalOwedCents += bal;
      clientsWithBalance += 1;
    }
  }

  const { results: payRows } = await env.DB.prepare(
    `SELECT amount_cents, created_at, user_id, status FROM payments
     WHERE status = 'completed' ORDER BY created_at DESC LIMIT 50`
  ).all();

  let totalCollectedCents = 0;
  for (const p of payRows || []) totalCollectedCents += p.amount_cents || 0;

  const accountById = Object.fromEntries((rows || []).map((r) => [r.id, r]));
  const recentPayments = (payRows || []).slice(0, 10).map((p) => {
    const acc = accountById[p.user_id];
    const name = acc
      ? [acc.first_name, acc.last_name].filter(Boolean).join(' ').trim() || acc.full_name || acc.email
      : 'Client';
    return {
      name,
      email: acc?.email || '',
      amountDollars: ((p.amount_cents || 0) / 100).toFixed(2),
      date: p.created_at,
    };
  });

  const site =
    env.GA4_PROPERTY_ID && env.GA4_SERVICE_ACCOUNT_JSON
      ? {
          configured: false,
          message: 'GA4 admin charts require a separate setup step (see SETUP-ANALYTICS.md).',
        }
      : {
          configured: false,
          message: 'Add GA4_PROPERTY_ID and GA4_SERVICE_ACCOUNT_JSON in Cloudflare to enable site analytics.',
        };

  return json(200, {
    ok: true,
    site,
    portal: {
      totalClients: (rows || []).length,
      clientsWithBalance,
      totalOwedDollars: (totalOwedCents / 100).toFixed(2),
      completedPayments: (payRows || []).length,
      totalCollectedDollars: (totalCollectedCents / 100).toFixed(2),
      recentPayments,
    },
    links: {
      cloudflare: 'https://dash.cloudflare.com',
      site: siteUrl(request, env),
      portal: `${siteUrl(request, env)}/portal.html`,
    },
  });
}

async function flightSearch(request, env) {
  const body = await readJson(request);
  if (!body) return json(400, { error: 'Invalid request' });

  const origin = String(body.origin || '')
    .trim()
    .toUpperCase()
    .slice(0, 3);
  const destination = String(body.destination || '')
    .trim()
    .toUpperCase()
    .slice(0, 3);
  const departureDate = String(body.departureDate || '').trim();
  const returnDate = String(body.returnDate || '').trim();
  const adults = Math.min(9, Math.max(1, parseInt(body.adults || '1', 10)));
  const travelClass = String(body.travelClass || 'ECONOMY').toUpperCase();
  const tripType = body.tripType || 'roundtrip';

  if (!origin || origin.length !== 3 || !destination || destination.length !== 3) {
    return json(400, { error: 'Enter valid 3-letter airport codes (e.g. BOS, MIA).' });
  }
  if (!departureDate) return json(400, { error: 'Choose a departure date.' });

  const query = {
    originLocationCode: origin,
    destinationLocationCode: destination,
    departureDate,
    adults,
    travelClass,
    currencyCode: 'USD',
    max: '25',
    nonStop: body.nonStop ? 'true' : undefined,
  };
  if (tripType === 'roundtrip' && returnDate) query.returnDate = returnDate;

  const result = await amadeusFetch(env, '/v2/shopping/flight-offers', query);
  if (result.error) return json(503, { error: result.error });

  const offers = normalizeFlightOffers(result.data?.data || []);
  return json(200, {
    offers,
    meta: { count: offers.length, origin, destination, departureDate, returnDate: returnDate || null },
  });
}

async function airportSearch(request, env) {
  const url = new URL(request.url);
  const keyword = (url.searchParams.get('q') || '').trim();
  if (keyword.length < 2) return json(200, { airports: [] });

  const result = await amadeusFetch(env, '/v1/reference-data/locations', {
    subType: 'AIRPORT,CITY',
    keyword,
    'page[limit]': '20',
    view: 'LIGHT',
  });

  if (result.error) return json(200, { airports: [], error: result.error });

  const seen = new Set();
  const airports = [];
  for (const loc of result.data?.data || []) {
    if (!loc.iataCode || seen.has(loc.iataCode)) continue;
    seen.add(loc.iataCode);
    const isCity = loc.subType === 'CITY';
    const cityName = loc.address?.cityName || '';
    const country = loc.address?.countryCode || '';
    const code = loc.iataCode;
    const name = loc.name || '';
    const city = isCity ? name : cityName || name;
    const detail = isCity
      ? `All airports · ${country}`
      : `${name}${cityName && cityName !== name ? ' · ' + cityName : ''}${country ? ' · ' + country : ''}`;
    airports.push({ code, name, city, country, subType: loc.subType || 'AIRPORT', label: `${city} (${code}) — ${detail}` });
  }

  return json(200, { airports });
}

function flightSummary(offer) {
  const parts = [];
  if (offer?.outbound) parts.push(`${offer.outbound.from} → ${offer.outbound.to}`);
  if (offer?.inbound) parts.push(`Return ${offer.inbound.from} → ${offer.inbound.to}`);
  return parts.join(' · ') || 'Flight booking';
}

async function createFlightCheckout(request, env) {
  const stripe = stripeClient(env);
  if (!stripe) {
    return json(503, { error: 'Payments not configured. Call (508) 232-3003 to book.' });
  }

  const body = await readJson(request);
  if (!body) return json(400, { error: 'Invalid request' });

  const offer = body.offer;
  const email = String(body.email || '').trim().toLowerCase();
  const firstName = String(body.firstName || '').trim();
  const lastName = String(body.lastName || '').trim();
  const phone = String(body.phone || '').trim();
  const airlineTotalCents = offer?.airlineTotalCents;

  if (!airlineTotalCents || airlineTotalCents < 1000) {
    return json(400, { error: 'Invalid flight selection.' });
  }
  if (!email || !firstName || !lastName) {
    return json(400, { error: 'Enter your name and email.' });
  }

  const airlineTotal = airlineTotalCents / 100;
  const baseFare = offer.baseFareCents != null ? offer.baseFareCents / 100 : null;
  const currencyCode = offer.currency || 'USD';
  const pricing = computeFlightPricing(airlineTotal, baseFare, currencyCode);
  const base = siteUrl(request, env);
  const currency = currencyCode.toLowerCase();
  const summary = flightSummary(offer);
  const passenger = `${firstName} ${lastName}`.trim();

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency,
          unit_amount: pricing.airlineTotalCents,
          product_data: { name: 'Airfare', description: summary },
        },
      },
      {
        quantity: 1,
        price_data: {
          currency,
          unit_amount: pricing.serviceFeeCents,
          product_data: {
            name: 'Martins Global Travels service fee (6%)',
            description: 'Agency booking and ticketing service',
          },
        },
      },
    ],
    metadata: {
      booking_type: 'flight',
      amount_cents: String(pricing.priceCents),
      customer_email: email,
      customer_name: passenger,
      customer_phone: phone,
      flight_summary: summary.slice(0, 450),
      offer_id: String(offer.id || '').slice(0, 100),
    },
    success_url: `${base}/book.html?booked=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/book.html?canceled=1`,
  });

  await env.DB.prepare(
    `INSERT INTO travel_bookings (id, stripe_session_id, booking_type, status, customer_email, customer_name, customer_phone, total_cents, currency, details)
     VALUES (?, ?, 'flight', 'pending', ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      crypto.randomUUID(),
      session.id,
      email,
      passenger,
      phone,
      pricing.priceCents,
      currencyCode,
      JSON.stringify({
        offerId: offer.id,
        summary,
        outbound: offer.outbound,
        inbound: offer.inbound,
        airline: offer.airline,
      })
    )
    .run();

  return json(200, { url: session.url });
}

async function createTicketRequest(request, env) {
  const stripe = stripeClient(env);
  if (!stripe) {
    return json(503, { error: 'Payments not configured. Email Jeanie@MartinsGlobalTravels.com.' });
  }

  const body = await readJson(request);
  if (!body) return json(400, { error: 'Invalid request' });

  const pkg = TICKET_PACKAGES[body.packageId];
  if (!pkg) return json(400, { error: 'Select a ticket package.' });

  const email = String(body.email || '').trim().toLowerCase();
  const firstName = String(body.firstName || '').trim();
  const lastName = String(body.lastName || '').trim();
  const phone = String(body.phone || '').trim();
  const city = String(body.city || '').trim();
  const notes = String(body.notes || '').trim();

  if (!email || !firstName || !lastName) {
    return json(400, { error: 'Enter your name and email.' });
  }

  const base = siteUrl(request, env);
  const passenger = `${firstName} ${lastName}`.trim();

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: pkg.cents,
          product_data: {
            name: pkg.name,
            description: city ? `Event destination: ${city}` : 'Luxury event ticket package',
          },
        },
      },
    ],
    metadata: {
      booking_type: 'ticket',
      amount_cents: String(pkg.cents),
      customer_email: email,
      customer_name: passenger,
      package_id: body.packageId,
      host_city: city.slice(0, 120),
    },
    success_url: `${base}/book.html?booked=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/book.html?canceled=1&tab=tickets`,
  });

  await env.DB.prepare(
    `INSERT INTO travel_bookings (id, stripe_session_id, booking_type, status, customer_email, customer_name, customer_phone, total_cents, currency, details)
     VALUES (?, ?, 'ticket', 'pending', ?, ?, ?, ?, 'USD', ?)`
  )
    .bind(
      crypto.randomUUID(),
      session.id,
      email,
      passenger,
      phone,
      pkg.cents,
      JSON.stringify({ packageId: body.packageId, packageName: pkg.name, city, notes })
    )
    .run();

  return json(200, { url: session.url });
}

const POST_ROUTES = {
  'auth/login': authLogin,
  'auth/change-password': authChangePassword,
  'create-checkout': createCheckout,
  'confirm-payment': confirmPayment,
  'stripe-webhook': stripeWebhook,
  'wallet/connect': walletConnectOnboarding,
  'wallet/withdraw': walletWithdraw,
  'admin-verify': adminVerify,
  'admin-list-clients': adminListClients,
  'admin-create-client': adminCreateClient,
  'admin-update-balance': adminUpdateBalance,
  'admin-send-credit': adminSendCredit,
  'admin-update-notes': adminUpdateNotes,
  'admin-delete-client': adminDeleteClient,
  'admin-get-analytics': adminGetAnalytics,
  'flight-search': flightSearch,
  'create-flight-checkout': createFlightCheckout,
  'create-ticket-request': createTicketRequest,
  'send-money/checkout': sendMoneyCheckout,
  'send-money/confirm': sendMoneyConfirm,
  'admin-send-money': adminSendMoney,
};

const GET_ROUTES = {
  'auth/session': authSession,
  'auth/balance': authBalance,
  'wallet': walletInfo,
  'airport-search': airportSearch,
  'send-money/info': sendMoneyInfo,
  'send-money/link': mySendMoneyLink,
};

export async function handleApiRequest(request, env) {
  if (request.method === 'OPTIONS') return empty();

  const route = apiPath(new URL(request.url).pathname);
  if (!route) return json(404, { error: 'Not found' });

  try {
    if (request.method === 'GET' && GET_ROUTES[route]) {
      return await GET_ROUTES[route](request, env);
    }
    if (request.method === 'POST' && POST_ROUTES[route]) {
      return await POST_ROUTES[route](request, env);
    }
    return json(405, { error: 'Method not allowed' });
  } catch (err) {
    console.error(route, err);
    const msg = String(err?.message || err || '');
    if (msg.includes('no such table')) {
      return json(503, {
        error: 'Database not initialized. Run D1 migrations (migrations/0001_init.sql) in Cloudflare.',
      });
    }
    return json(500, { error: 'Server error' });
  }
}
