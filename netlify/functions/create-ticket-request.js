const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

const PACKAGES = {
  'evt-single': { name: 'Single event package', cents: 250000 },
  'evt-weekend': { name: 'Weekend getaway package', cents: 485000 },
  'evt-premium': { name: 'VIP experience package', cents: 1250000 },
};

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  return key ? new Stripe(key) : null;
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
      body: JSON.stringify({ error: 'Payments not configured. Email Jeanie@MartinsGlobalTravels.com.' }),
    };
  }

  try {
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid request' }) };
    }

    const pkg = PACKAGES[body.packageId];
    if (!pkg) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Select a ticket package.' }) };
    }

    const email = String(body.email || '').trim().toLowerCase();
    const firstName = String(body.firstName || '').trim();
    const lastName = String(body.lastName || '').trim();
    const phone = String(body.phone || '').trim();
    const city = String(body.city || '').trim();
    const notes = String(body.notes || '').trim();

    if (!email || !firstName || !lastName) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Enter your name and email.' }) };
    }

    const siteUrl = (process.env.URL || process.env.DEPLOY_PRIME_URL || 'https://martinsglobaltravel.com').replace(
      /\/$/,
      ''
    );
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
      success_url: `${siteUrl}/book.html?booked=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/book.html?canceled=1&tab=tickets`,
    });

    const supabase = getSupabaseAdmin();
    if (supabase) {
      await supabase.from('travel_bookings').insert({
        stripe_session_id: session.id,
        booking_type: 'ticket',
        status: 'pending',
        customer_email: email,
        customer_name: passenger,
        customer_phone: phone,
        total_cents: pkg.cents,
        currency: 'USD',
        details: { packageId: body.packageId, packageName: pkg.name, city, notes },
      });
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err) {
    console.error('create-ticket-request', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Could not start checkout.' }),
    };
  }
};
