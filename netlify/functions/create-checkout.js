const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

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
  if (!stripe) {
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({
        error: 'Card payments are not set up yet. Add STRIPE_SECRET_KEY in Netlify and redeploy.',
      }),
    };
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({ error: 'Server is missing Supabase configuration.' }),
    };
  }

  try {
    const authHeader = event.headers.authorization || event.headers.Authorization || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Not signed in' }) };
    }

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData?.user) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid session' }) };
    }

    const userId = userData.user.id;

    const { data: account, error: accountError } = await supabaseAdmin
      .from('client_accounts')
      .select('balance_cents, currency, full_name, first_name, last_name, email')
      .eq('id', userId)
      .single();

    if (accountError || !account) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'No account found. Contact Martins Global Travels.' }),
      };
    }

    if (account.balance_cents <= 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'No balance due' }) };
    }

    const siteUrl = (process.env.URL || process.env.DEPLOY_PRIME_URL || 'https://martinsglobaltravel.com').replace(
      /\/$/,
      ''
    );
    const currency = (account.currency || 'usd').toLowerCase();
    const clientName =
      [account.first_name, account.last_name].filter(Boolean).join(' ').trim() || account.full_name;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: account.email || userData.user.email,
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
        user_id: userId,
        amount_cents: String(account.balance_cents),
      },
      success_url: `${siteUrl}/portal.html?paid=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/portal.html?canceled=1`,
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err) {
    console.error('create-checkout', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Could not start checkout. Try again or call (508) 232-3003.' }),
    };
  }
};
