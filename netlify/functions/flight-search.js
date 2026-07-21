const { amadeusFetch, normalizeFlightOffers } = require('./amadeus-lib');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid request' }) };
    }

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
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Enter valid 3-letter airport codes (e.g. BOS, MIA).' }),
      };
    }

    if (!departureDate) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Choose a departure date.' }) };
    }

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

    if (tripType === 'roundtrip' && returnDate) {
      query.returnDate = returnDate;
    }

    const result = await amadeusFetch('/v2/shopping/flight-offers', query);
    if (result.error) {
      return { statusCode: 503, headers, body: JSON.stringify({ error: result.error }) };
    }

    const offers = normalizeFlightOffers(result.data?.data || []);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        offers,
        meta: { count: offers.length, origin, destination, departureDate, returnDate: returnDate || null },
      }),
    };
  } catch (err) {
    console.error('flight-search', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Search failed. Call (508) 232-3003 for assistance.' }),
    };
  }
};
