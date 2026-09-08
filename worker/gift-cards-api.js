import Stripe from 'stripe';
import { json, readJson, verifyAdmin, dollarsToCents, siteUrl } from './lib/http.js';
import { requireUser } from './lib/auth.js';
import {
  getSettings,
  publicConfig,
  createPendingPurchase,
  activatePurchasedGiftCard,
  issuePromotional,
  claimCode,
  quoteAndApply,
  listMyCards,
  listCardTransactions,
  adminListCards,
  adminGetCard,
  adminAdjust,
  adminSetStatus,
  adminResend,
  restoreApplication,
  updateSettings,
  clientIp,
} from './lib/gift-cards.js';

function stripeClient(env) {
  return env.STRIPE_SECRET_KEY ? new Stripe(env.STRIPE_SECRET_KEY) : null;
}

function checkoutBase(request, env) {
  const origin = new URL(request.url).origin;
  if (/localhost|127\.0\.0\.1/.test(origin)) return origin;
  return siteUrl(request, env);
}

function adminAuth(body, env) {
  return verifyAdmin(body, env);
}

async function requireAuthed(request, env) {
  const auth = await requireUser(request, env);
  if (auth.error) return { error: auth.error, status: 401 };
  return { user: { id: auth.userId, email: auth.email, ip: clientIp(request) } };
}

export async function giftCardsConfig(request, env) {
  const settings = await getSettings(env.DB);
  return json(200, { ok: true, config: publicConfig(settings) });
}

export async function giftCardsPurchase(request, env) {
  const stripe = stripeClient(env);
  if (!stripe) {
    return json(503, {
      error: 'Card payments are not set up yet. Add STRIPE_SECRET_KEY in Cloudflare and redeploy.',
    });
  }
  const body = await readJson(request);
  if (!body) return json(400, { error: 'Invalid request' });

  const created = await createPendingPurchase(env, body);
  if (created.error) return json(400, { error: created.error });

  const amountCents = created.giftCard.amountCents;
  const base = checkoutBase(request, env);
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: body.purchaserEmail || created.giftCard.recipientEmail,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: amountCents,
          product_data: {
            name: `Martins Global Travels e-Gift Card — $${(amountCents / 100).toFixed(2)}`,
            description: `For ${created.giftCard.recipientName}`,
          },
        },
      },
    ],
    metadata: {
      booking_type: 'gift_card',
      gift_card_id: created.giftCard.id,
      amount_cents: String(amountCents),
    },
    success_url: `${base}/gift-cards.html?purchased=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/gift-cards.html?canceled=1`,
  });

  await env.DB.prepare(`UPDATE gift_cards SET stripe_session_id = ?, updated_at = datetime('now') WHERE id = ?`)
    .bind(session.id, created.giftCard.id)
    .run();

  return json(200, {
    url: session.url,
    confirmationId: created.giftCard.id,
  });
}

export async function giftCardsConfirmPurchase(request, env) {
  const stripe = stripeClient(env);
  if (!stripe) return json(503, { error: 'Payments not configured' });
  const body = await readJson(request);
  const sessionId = String(body?.sessionId || '').trim();
  if (!sessionId.startsWith('cs_')) return json(400, { error: 'Missing payment session' });

  const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);
  if (checkoutSession.metadata?.booking_type !== 'gift_card') {
    return json(400, { error: 'This payment is not a gift card purchase.' });
  }
  const result = await activatePurchasedGiftCard(env, checkoutSession);
  if (!result.ok) return json(500, { error: result.error || 'Could not activate gift card' });

  const card = await env.DB.prepare(
    `SELECT id, recipient_name, recipient_email, original_amount_cents, scheduled_delivery_at, status, code_last_four, purchaser_name
     FROM gift_cards WHERE id = ?`
  )
    .bind(result.giftCardId)
    .first();

  return json(200, {
    ok: true,
    confirmationId: card?.id,
    recipientName: card?.recipient_name,
    recipientEmail: card?.recipient_email,
    amountCents: card?.original_amount_cents,
    deliveryDate: card?.scheduled_delivery_at,
    status: card?.status,
    codeLastFour: card?.code_last_four,
    purchaserName: card?.purchaser_name,
  });
}

export async function giftCardsMy(request, env) {
  const auth = await requireAuthed(request, env);
  if (auth.error) return json(auth.status || 401, { error: auth.error });
  const data = await listMyCards(env, auth.user.id, auth.user.email);
  return json(200, { ok: true, ...data });
}

export async function giftCardsTransactions(request, env) {
  const auth = await requireAuthed(request, env);
  if (auth.error) return json(auth.status || 401, { error: auth.error });
  const url = new URL(request.url);
  const id = url.searchParams.get('id') || (await readJson(request))?.id;
  if (!id) return json(400, { error: 'Missing gift card id' });
  const data = await listCardTransactions(env, id, { userId: auth.user.id });
  if (data.error) return json(data.status || 400, { error: data.error });
  return json(200, { ok: true, ...data });
}

export async function giftCardsRedeem(request, env) {
  const auth = await requireAuthed(request, env);
  if (auth.error) return json(auth.status || 401, { error: auth.error });
  const body = await readJson(request);
  if (!body?.code) return json(400, { error: 'Enter your gift card code.' });
  const result = await claimCode(env, { code: body.code, user: auth.user, ip: clientIp(request) });
  if (result.error) return json(result.status || 400, { error: result.error });
  return json(200, { ok: true, giftCard: result.giftCard });
}

export async function giftCardsQuote(request, env) {
  const auth = await requireAuthed(request, env);
  if (auth.error) return json(auth.status || 401, { error: auth.error });
  const body = (request.method === 'GET' ? Object.fromEntries(new URL(request.url).searchParams) : await readJson(request)) || {};
  const result = await quoteAndApply(env, {
    user: auth.user,
    code: body.code,
    giftCardId: body.giftCardId,
    applyAvailable: body.applyAvailable === true || body.applyAvailable === '1',
    apply: false,
  });
  if (result.error) return json(result.status || 400, { error: result.error, quote: result.quote });
  return json(200, { ok: true, quote: result.quote });
}

export async function giftCardsApply(request, env) {
  const auth = await requireAuthed(request, env);
  if (auth.error) return json(auth.status || 401, { error: auth.error });
  const body = await readJson(request);
  if (!body) return json(400, { error: 'Invalid request' });
  const result = await quoteAndApply(env, {
    user: auth.user,
    code: body.code,
    giftCardId: body.giftCardId,
    applyAvailable: !!body.applyAvailable,
    apply: true,
  });
  if (result.error) return json(result.status || 400, { error: result.error, quote: result.quote });
  return json(200, {
    ok: true,
    quote: result.quote,
    account: result.account,
    message:
      result.quote.remainingBalanceCents <= 0
        ? 'Travel credit covered the full trip balance. Nothing further is due.'
        : `Applied $${(result.quote.creditAppliedCents / 100).toFixed(2)} in travel credit. Remaining due: $${(result.quote.remainingBalanceCents / 100).toFixed(2)}.`,
  });
}

export async function adminGiftCardsList(request, env) {
  const body = await readJson(request);
  if (!body) return json(400, { error: 'Invalid request' });
  const auth = adminAuth(body, env);
  if (!auth.ok) return json(401, { error: auth.error });
  const data = await adminListCards(env, { q: body.q, status: body.status, type: body.type });
  return json(200, { ok: true, ...data });
}

export async function adminGiftCardsGet(request, env) {
  const body = await readJson(request);
  if (!body) return json(400, { error: 'Invalid request' });
  const auth = adminAuth(body, env);
  if (!auth.ok) return json(401, { error: auth.error });
  if (!body.id) return json(400, { error: 'Missing gift card id' });
  const data = await adminGetCard(env, body.id);
  if (data.error) return json(data.status || 400, { error: data.error });
  return json(200, { ok: true, ...data });
}

export async function adminGiftCardsIssue(request, env) {
  const body = await readJson(request);
  if (!body) return json(400, { error: 'Invalid request' });
  const auth = adminAuth(body, env);
  if (!auth.ok) return json(401, { error: auth.error });
  const result = await issuePromotional(env, body, 'staff');
  if (result.error) return json(400, { error: result.error });
  return json(200, {
    ok: true,
    giftCard: result.giftCard,
    code: result.code,
    message: `Issued $${(result.giftCard.originalAmountCents / 100).toFixed(2)} promotional credit ending ${result.codeLastFour}.`,
  });
}

export async function adminGiftCardsAdjust(request, env) {
  const body = await readJson(request);
  if (!body) return json(400, { error: 'Invalid request' });
  const auth = adminAuth(body, env);
  if (!auth.ok) return json(401, { error: auth.error });
  const amountCents =
    typeof body.amountCents === 'number' ? body.amountCents : dollarsToCents(body.amountDollars);
  const signed =
    body.action === 'remove' ? -Math.abs(amountCents || 0) : Math.abs(amountCents || 0);
  const result = await adminAdjust(env, {
    id: body.id,
    amountCents: signed,
    reason: body.reason,
    adminLabel: 'staff',
  });
  if (result.error) return json(result.status || 400, { error: result.error });
  return json(200, { ok: true, giftCard: result.giftCard });
}

export async function adminGiftCardsDisable(request, env) {
  const body = await readJson(request);
  if (!body) return json(400, { error: 'Invalid request' });
  const auth = adminAuth(body, env);
  if (!auth.ok) return json(401, { error: auth.error });
  const result = await adminSetStatus(env, {
    id: body.id,
    status: body.status === 'active' ? 'active' : 'disabled',
    reason: body.reason,
    adminLabel: 'staff',
  });
  if (result.error) return json(result.status || 400, { error: result.error });
  return json(200, { ok: true, giftCard: result.giftCard });
}

export async function adminGiftCardsResend(request, env) {
  const body = await readJson(request);
  if (!body) return json(400, { error: 'Invalid request' });
  const auth = adminAuth(body, env);
  if (!auth.ok) return json(401, { error: auth.error });
  const result = await adminResend(env, body.id);
  if (result.error) return json(result.status || 400, { error: result.error });
  return json(200, { ok: true, ...result });
}

export async function adminGiftCardsRestore(request, env) {
  const body = await readJson(request);
  if (!body) return json(400, { error: 'Invalid request' });
  const auth = adminAuth(body, env);
  if (!auth.ok) return json(401, { error: auth.error });
  const result = await restoreApplication(env, {
    applicationId: body.applicationId,
    reason: body.reason,
    adminLabel: 'staff',
  });
  if (result.error) return json(result.status || 400, { error: result.error });
  return json(200, { ok: true, ...result });
}

export async function adminGiftCardsSettings(request, env) {
  const body = await readJson(request);
  if (!body) return json(400, { error: 'Invalid request' });
  const auth = adminAuth(body, env);
  if (!auth.ok) return json(401, { error: auth.error });
  if (body.save) {
    const updated = await updateSettings(env, body, 'staff');
    return json(200, { ok: true, ...updated });
  }
  const settings = await getSettings(env.DB);
  return json(200, { ok: true, settings: publicConfig(settings), raw: settings });
}
