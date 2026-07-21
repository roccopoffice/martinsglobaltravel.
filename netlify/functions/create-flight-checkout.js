const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');
const { computeFlightPricing } = require('../../js/flight-pricing');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
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

function flightSummary(offer) {
  const parts = [];
  if (offer?.outbound) {
    parts.push(`${offer.outbound.from} → ${offer.outbound.to}`);
  }
  if (offer?.inbound) {
    parts.push(`Return ${offer.inbound.from} → ${offer.inbound.to}`);
  }
  return parts.join(' · ') || 'Flight booking';
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
      body: JSON.stringify({ error: 'Payments not configured. Call (508) 232-3003 to book.' }),
    };
  }

  try {
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid request' }) };
    }

    const offer = body.offer;
    const email = String(body.email || '').trim().toLowerCase();
    const firstName = String(body.firstName || '').trim();
    const lastName = String(body.lastName || '').trim();
    const phone = String(body.phone || '').trim();

    const airlineTotalCents = offer?.airlineTotalCents;
    if (!airlineTotalCents || airlineTotalCents < 1000) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid flight selection.' }) };
    }

    if (!email || !firstName || !lastName) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Enter your name and email.' }) };
    }

    const airlineTotal = airlineTotalCents / 100;
    const baseFare = offer.baseFareCents != null ? offer.baseFareCents / 100 : null;
    const currencyCode = offer.currency || 'USD';
    const pricing = computeFlightPricing(airlineTotal, baseFare, currencyCode);

    const siteUrl = (process.env.URL || process.env.DEPLOY_PRIME_URL || 'https://martinsglobaltravel.com').replace(
      /\/$/,
      ''
    );
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
            product_data: {
              name: 'Airfare',
              description: summary,
            },
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
        airline_total_cents: String(pricing.airlineTotalCents),
        service_fee_cents: String(pricing.serviceFeeCents),
        customer_email: email,
        customer_name: passenger,
        customer_phone: phone,
        flight_summary: summary.slice(0, 450),
        offer_id: String(offer.id || '').slice(0, 100),
      },
      success_url: `${siteUrl}/book.html?booked=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/book.html?canceled=1`,
    });

    const supabase = getSupabaseAdmin();
    if (supabase) {
      await supabase.from('travel_bookings').insert({
        stripe_session_id: session.id,
        booking_type: 'flight',
        status: 'pending',
        customer_email: email,
        customer_name: passenger,
        customer_phone: phone,
        total_cents: pricing.priceCents,
        currency: currencyCode,
        details: {
          offerId: offer.id,
          summary,
          outbound: offer.outbound,
          inbound: offer.inbound,
          airline: offer.airline,
          baseFareCents: pricing.baseFareCents,
          taxesFeesCents: pricing.taxesFeesCents,
          airlineTotalCents: pricing.airlineTotalCents,
          serviceFeeCents: pricing.serviceFeeCents,
        },
      });
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err) {
    console.error('create-flight-checkout', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Could not start checkout. Try again or call (508) 232-3003.' }),
    };
  }
};
