const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');
const { applyCheckoutSession } = require('./payment-lib');

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
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = event.headers['stripe-signature'] || event.headers['Stripe-Signature'];

  if (!stripe || !webhookSecret) {
    console.error('stripe-webhook: missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET');
    return { statusCode: 503, body: 'Stripe webhook not configured' };
  }

  if (!sig) {
    return { statusCode: 400, body: 'Missing stripe-signature' };
  }

  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString('utf8')
    : event.body;

  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature failed', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  if (stripeEvent.type === 'checkout.session.completed') {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return { statusCode: 500, body: 'Supabase not configured' };
    }

    const session = stripeEvent.data.object;
    const result = await applyCheckoutSession(supabaseAdmin, session);

    if (!result.ok) {
      console.error('stripe-webhook apply failed', result.error, session.id);
      return { statusCode: 500, body: result.error || 'Database update failed' };
    }
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
