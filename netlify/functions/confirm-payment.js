const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');
const { applyCheckoutSession, sessionBelongsToUser } = require('./payment-lib');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const stripe = getStripe();
  const supabaseAdmin = getSupabaseAdmin();
  if (!stripe || !supabaseAdmin) {
    return { statusCode: 503, headers, body: JSON.stringify({ error: 'Payments not configured' }) };
  }

  try {
    const authHeader = event.headers.authorization || event.headers.Authorization || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Not signed in' }) };
    }

    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid request' }) };
    }

    const sessionId = String(body.sessionId || '').trim();
    if (!sessionId || !sessionId.startsWith('cs_')) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing payment session' }) };
    }

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData?.user) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid session' }) };
    }

    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);

    if (!sessionBelongsToUser(checkoutSession, userData.user.id, userData.user.email)) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Payment does not match this account' }) };
    }

    const result = await applyCheckoutSession(supabaseAdmin, checkoutSession);
    if (!result.ok) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: result.error }) };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true, balanceUpdated: true }),
    };
  } catch (err) {
    console.error('confirm-payment', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Could not confirm payment' }),
    };
  }
};
