const { amadeusFetch } = require('./amadeus-lib');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const keyword = (event.queryStringParameters?.q || '').trim();
    if (keyword.length < 2) {
      return { statusCode: 200, headers, body: JSON.stringify({ airports: [] }) };
    }

    const result = await amadeusFetch('/v1/reference-data/locations', {
      subType: 'AIRPORT,CITY',
      keyword,
      'page[limit]': '20',
      view: 'LIGHT',
    });

    if (result.error) {
      return { statusCode: 200, headers, body: JSON.stringify({ airports: [], error: result.error }) };
    }

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
      airports.push({
        code,
        name,
        city,
        country,
        subType: loc.subType || 'AIRPORT',
        label: `${city} (${code}) — ${detail}`,
      });
    }

    return { statusCode: 200, headers, body: JSON.stringify({ airports }) };
  } catch (err) {
    console.error('airport-search', err);
    return { statusCode: 500, headers, body: JSON.stringify({ airports: [] }) };
  }
};
