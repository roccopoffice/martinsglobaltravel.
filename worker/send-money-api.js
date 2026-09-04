import Stripe from 'stripe';
import { json, readJson, verifyAdmin, dollarsToCents, siteUrl } from './lib/http.js';
import { requireUser } from './lib/auth.js';
import { applyCheckoutSession } from './lib/payments.js';
import {
  sendMoneyLimits,
  normalizeToken,
  findActiveLink,
  ensureLink,
  rotateLink,
  setLinkStatus,
  receivedCents,
  publicFirstName,
  AGENCY_USER_ID,
  isAgencyUserId,
  isAgencyEmail,
  ensureAgencyAccount,
} from './lib/send-money.js';

function stripeClient(env) {
  return env.STRIPE_SECRET_KEY ? new Stripe(env.STRIPE_SECRET_KEY) : null;
}

function checkoutBase(request, env) {
  const origin = new URL(request.url).origin;
  if (/localhost|127\.0\.0\.1/.test(origin)) return origin;
  return siteUrl(request, env);
}

function publicLink(request, env, token) {
  return `${checkoutBase(request, env)}/send/${token}`;
}

export async function sendMoneyInfo(request, env) {
  const token = normalizeToken(new URL(request.url).searchParams.get('token'));
  const limits = sendMoneyLimits(env);
  const row = await findActiveLink(env.DB, token);
  if (!row || row.status !== 'active') {
    return json(404, { error: 'This link is not available.' });
  }
  const isAgency = isAgencyUserId(row.user_id);
  return json(200, {
    destination: isAgency ? 'agency' : 'client',
    firstName: isAgency ? '' : publicFirstName(row),
    minCents: limits.minCents,
    maxCents: limits.maxCents,
    currency: row.currency || 'usd',
  });
}

export async function sendMoneyCheckout(request, env) {
  const body = await readJson(request);
  if (!body) return json(400, { error: 'Invalid request' });

  const token = normalizeToken(body.token);
  const row = await findActiveLink(env.DB, token);
  if (!row || row.status !== 'active') {
    return json(404, { error: 'This link is not available.' });
  }

  const amountCents = dollarsToCents(body.amountDollars);
  const limits = sendMoneyLimits(env);
  if (amountCents == null || amountCents < limits.minCents) {
    return json(400, {
      error: `Enter an amount of at least $${(limits.minCents / 100).toFixed(2)}.`,
    });
  }
  if (amountCents > limits.maxCents) {
    return json(400, {
      error: `The maximum you can send is $${(limits.maxCents / 100).toFixed(2)}.`,
    });
  }

  const stripe = stripeClient(env);
  if (!stripe) {
    return json(503, {
      error: 'Card payments are not set up yet. Please try again later or call (508) 232-3003.',
    });
  }

  const isAgency = isAgencyUserId(row.user_id);
  const firstName = publicFirstName(row);
  const base = checkoutBase(request, env);
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: (row.currency || 'usd').toLowerCase(),
          unit_amount: amountCents,
          product_data: {
            name: isAgency
              ? 'Payment — Martins Global Travels'
              : 'Trip contribution — Martins Global Travels',
            description: isAgency ? 'Sent to Martins Global Travels' : `Toward ${firstName}'s trip`,
          },
        },
      },
    ],
    metadata: {
      booking_type: isAgency ? 'send_money_agency' : 'send_money',
      user_id: row.user_id,
      amount_cents: String(amountCents),
      send_token: row.token,
    },
    success_url: `${base}/send/${row.token}?paid=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/send/${row.token}?canceled=1`,
  });

  return json(200, { url: session.url });
}

export async function sendMoneyConfirm(request, env) {
  const stripe = stripeClient(env);
  if (!stripe) return json(503, { error: 'Payments not configured' });
  const body = await readJson(request);
  const sessionId = String(body?.sessionId || '').trim();
  const token = normalizeToken(body?.token);
  if (!sessionId.startsWith('cs_')) return json(400, { error: 'Missing payment session' });

  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const bookingType = session.metadata?.booking_type;
  if (bookingType !== 'send_money' && bookingType !== 'send_money_agency') {
    return json(400, { error: 'This payment is not a send-money payment.' });
  }
  if (token && session.metadata?.send_token && session.metadata.send_token !== token) {
    return json(403, { error: 'Payment does not match this link.' });
  }

  const result = await applyCheckoutSession(env.DB, session, env);
  if (!result.ok) return json(500, { error: result.error || 'Could not record payment' });
  return json(200, { ok: true });
}

export async function mySendMoneyLink(request, env) {
  const auth = await requireUser(request, env);
  if (auth.error) return json(401, { error: auth.error });

  const link = await ensureLink(env.DB, auth.userId);
  if (!link) return json(500, { error: 'Could not create your send-money link.' });
  const received = await receivedCents(env.DB, auth.userId);
  return json(200, {
    url: link.status === 'active' ? publicLink(request, env, link.token) : null,
    status: link.status,
    receivedCents: received,
  });
}

export async function adminSendMoney(request, env) {
  const body = await readJson(request);
  if (!body) return json(400, { error: 'Invalid request' });
  const auth = verifyAdmin(body, env);
  if (!auth.ok) return json(401, { error: auth.error });

  const target = String(body.target || '').trim();
  let account;
  if (target === 'agency') {
    await ensureAgencyAccount(env.DB);
    account = await env.DB.prepare(
      `SELECT id, first_name, last_name, full_name, email FROM client_accounts WHERE id = ? LIMIT 1`
    )
      .bind(AGENCY_USER_ID)
      .first();
    if (!account) return json(500, { error: 'Could not create the agency send-money account.' });
  } else {
    const email = String(body.email || '')
      .trim()
      .toLowerCase();
    if (!email.includes('@')) return json(400, { error: 'A valid email is required.' });
    if (isAgencyEmail(email)) return json(404, { error: 'No client found with that email.' });

    account = await env.DB.prepare(
      `SELECT id, first_name, last_name, full_name, email FROM client_accounts WHERE email = ? LIMIT 1`
    )
      .bind(email)
      .first();
    if (!account) return json(404, { error: 'No client found with that email.' });
  }

  let link = await env.DB.prepare('SELECT token, status FROM send_money_links WHERE user_id = ?')
    .bind(account.id)
    .first();

  if (body.action === 'generate') {
    link = await rotateLink(env.DB, account.id);
  } else if (body.action === 'disable') {
    link = (await setLinkStatus(env.DB, account.id, 'disabled')) || link;
    if (!link) return json(400, { error: 'There is no send-money link yet.' });
  } else if (body.action === 'enable') {
    if (!link) link = await rotateLink(env.DB, account.id);
    else link = await setLinkStatus(env.DB, account.id, 'active');
  }

  const { results: payments } = await env.DB.prepare(
    `SELECT id, amount_cents, status, created_at, stripe_checkout_session_id
     FROM payments WHERE user_id = ? AND source = 'send_money'
     ORDER BY created_at DESC LIMIT 25`
  )
    .bind(account.id)
    .all();

  const received = await receivedCents(env.DB, account.id);
  const isAgency = isAgencyUserId(account.id);
  const name = isAgency
    ? 'Martins Global Travels'
    : [account.first_name, account.last_name].filter(Boolean).join(' ').trim() ||
      account.full_name ||
      account.email;

  return json(200, {
    ok: true,
    destination: isAgency ? 'agency' : 'client',
    client: { name, email: isAgency ? null : account.email },
    url: link ? publicLink(request, env, link.token) : null,
    token: link?.token || null,
    status: link?.status || null,
    receivedCents: received,
    payments: payments || [],
  });
}
