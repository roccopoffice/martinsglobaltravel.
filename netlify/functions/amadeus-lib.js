let cachedToken = null;
let tokenExpires = 0;

function getAmadeusBase() {
  return process.env.AMADEUS_ENV === 'production'
    ? 'https://api.amadeus.com'
    : 'https://test.api.amadeus.com';
}

async function getAmadeusToken() {
  const key = process.env.AMADEUS_API_KEY;
  const secret = process.env.AMADEUS_API_SECRET;
  if (!key || !secret) {
    return { error: 'Flight search is not configured. Add AMADEUS_API_KEY and AMADEUS_API_SECRET in Netlify.' };
  }

  const base = getAmadeusBase();
  if (cachedToken && Date.now() < tokenExpires - 60000) {
    return { token: cachedToken, base };
  }

  const res = await fetch(`${base}/v1/security/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: key,
      client_secret: secret,
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.access_token) {
    console.error('Amadeus token error', data);
    return { error: 'Could not connect to flight search. Try again shortly.' };
  }

  cachedToken = data.access_token;
  tokenExpires = Date.now() + (data.expires_in || 1800) * 1000;
  return { token: cachedToken, base };
}

async function amadeusFetch(path, query) {
  const auth = await getAmadeusToken();
  if (auth.error) return { error: auth.error };

  const url = new URL(path, auth.base);
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
    });
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${auth.token}` },
  });
  const data = await res.json();
  if (!res.ok) {
    console.error('Amadeus API', path, data);
    const detail = data?.errors?.[0]?.detail || data?.errors?.[0]?.title;
    return { error: detail || 'Flight search failed. Check airports and dates.' };
  }
  return { data };
}

function formatDuration(iso) {
  if (!iso || !iso.startsWith('PT')) return iso || '';
  const h = iso.match(/(\d+)H/);
  const m = iso.match(/(\d+)M/);
  const parts = [];
  if (h) parts.push(h[1] + 'h');
  if (m) parts.push(m[1] + 'm');
  return parts.join(' ') || iso;
}

function parseItinerary(itinerary) {
  if (!itinerary?.segments?.length) return null;
  const segs = itinerary.segments;
  const first = segs[0];
  const last = segs[segs.length - 1];
  return {
    from: first.departure.iataCode,
    to: last.arrival.iataCode,
    departAt: first.departure.at,
    arriveAt: last.arrival.at,
    duration: formatDuration(itinerary.duration),
    stops: Math.max(0, segs.length - 1),
    carriers: [...new Set(segs.map((s) => s.carrierCode))],
    segments: segs.length,
  };
}

const { computeFlightPricing } = require('../../js/flight-pricing');

function normalizeFlightOffers(raw) {
  return (raw || []).map((offer) => {
    const out = parseItinerary(offer.itineraries?.[0]);
    const back = offer.itineraries?.[1] ? parseItinerary(offer.itineraries[1]) : null;
    const airlineTotal = parseFloat(offer.price?.total || '0');
    const baseFare =
      offer.price?.base != null && offer.price.base !== '' ? parseFloat(offer.price.base) : null;
    const currency = offer.price?.currency || 'USD';
    const pricing = computeFlightPricing(airlineTotal, baseFare, currency);

    return {
      id: offer.id,
      currency,
      airline: (offer.validatingAirlineCodes || [])[0] || out?.carriers?.[0] || '',
      cabin: offer.travelerPricings?.[0]?.fareDetailsBySegment?.[0]?.cabin || 'ECONOMY',
      seats: offer.numberOfBookableSeats,
      outbound: out,
      inbound: back,
      priceTotal: pricing.customerTotal,
      priceDisplay: pricing.priceDisplay,
      priceCents: pricing.priceCents,
      baseFare: pricing.baseFare,
      taxesFees: pricing.taxesFees,
      airlineTotal: pricing.airlineTotal,
      serviceFee: pricing.serviceFee,
      customerTotal: pricing.customerTotal,
      baseFareCents: pricing.baseFareCents,
      taxesFeesCents: pricing.taxesFeesCents,
      airlineTotalCents: pricing.airlineTotalCents,
      serviceFeeCents: pricing.serviceFeeCents,
      baseFareDisplay: pricing.baseFareDisplay,
      taxesFeesDisplay: pricing.taxesFeesDisplay,
      airlineTotalDisplay: pricing.airlineTotalDisplay,
      serviceFeeDisplay: pricing.serviceFeeDisplay,
      markupRate: pricing.markupRate,
    };
  });
}

module.exports = {
  amadeusFetch,
  normalizeFlightOffers,
  getAmadeusToken,
};
