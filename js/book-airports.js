/**
 * In-memory airport search — full IATA database, fuzzy match, US state lookup.
 * Requires Fuse.js and assets/airports.json (run scripts/generate-airports-json.py).
 */
(function (global) {
  const US_STATES = [
    ['AL', 'Alabama'], ['AK', 'Alaska'], ['AZ', 'Arizona'], ['AR', 'Arkansas'],
    ['CA', 'California'], ['CO', 'Colorado'], ['CT', 'Connecticut'], ['DE', 'Delaware'],
    ['FL', 'Florida'], ['GA', 'Georgia'], ['HI', 'Hawaii'], ['ID', 'Idaho'],
    ['IL', 'Illinois'], ['IN', 'Indiana'], ['IA', 'Iowa'], ['KS', 'Kansas'],
    ['KY', 'Kentucky'], ['LA', 'Louisiana'], ['ME', 'Maine'], ['MD', 'Maryland'],
    ['MA', 'Massachusetts'], ['MI', 'Michigan'], ['MN', 'Minnesota'], ['MS', 'Mississippi'],
    ['MO', 'Missouri'], ['MT', 'Montana'], ['NE', 'Nebraska'], ['NV', 'Nevada'],
    ['NH', 'New Hampshire'], ['NJ', 'New Jersey'], ['NM', 'New Mexico'], ['NY', 'New York'],
    ['NC', 'North Carolina'], ['ND', 'North Dakota'], ['OH', 'Ohio'], ['OK', 'Oklahoma'],
    ['OR', 'Oregon'], ['PA', 'Pennsylvania'], ['RI', 'Rhode Island'], ['SC', 'South Carolina'],
    ['SD', 'South Dakota'], ['TN', 'Tennessee'], ['TX', 'Texas'], ['UT', 'Utah'],
    ['VT', 'Vermont'], ['VA', 'Virginia'], ['WA', 'Washington'], ['WV', 'West Virginia'],
    ['WI', 'Wisconsin'], ['WY', 'Wyoming'], ['DC', 'District of Columbia'],
  ];

  let airports = [];
  let fuse = null;
  let byState = {};

  function norm(s) {
    return (s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function findState(query) {
    const q = norm(query.trim());
    if (q.length < 2) return null;

    for (const [abbr, name] of US_STATES) {
      const n = norm(name);
      const a = abbr.toLowerCase();
      if (q === a || q === n) return { abbr, name };
      if (q.length >= 3 && (n.startsWith(q) || n.includes(q))) return { abbr, name };
    }
    return null;
  }

  function formatAirport(a) {
    const city = a.city || a.name;
    const where = [a.stateName || a.state, a.country].filter(Boolean).join(' · ');
    return {
      code: a.code,
      name: a.name,
      city,
      country: a.country,
      state: a.state,
      stateName: a.stateName,
      label: where ? `${city} (${a.code}) — ${a.name} · ${where}` : `${city} (${a.code}) — ${a.name}`,
    };
  }

  function searchState(abbr, limit) {
    const list = byState[abbr] || [];
    return list.slice(0, limit).map(formatAirport);
  }

  function searchFuzzy(query, limit) {
    if (!fuse) return [];
    return fuse.search(query, { limit }).map((r) => formatAirport(r.item));
  }

  function searchExactCode(query) {
    const code = query.trim().toUpperCase();
    if (code.length !== 3) return [];
    const hit = airports.find((a) => a.code === code);
    return hit ? [formatAirport(hit)] : [];
  }

  function search(query, limit = 22) {
    const q = query.trim();
    if (q.length < 2) return [];

    const state = findState(q);
    if (state) return searchState(state.abbr, Math.max(limit, 28));

    if (/^[a-zA-Z]{3}$/.test(q)) {
      const exact = searchExactCode(q);
      if (exact.length) {
        const fuzzy = searchFuzzy(q, limit - 1).filter((a) => a.code !== exact[0].code);
        return exact.concat(fuzzy).slice(0, limit);
      }
    }

    return searchFuzzy(q, limit);
  }

  const ready = (async function load() {
    try {
      const res = await fetch('assets/airports.json');
      if (!res.ok) throw new Error('airports.json missing');
      airports = await res.json();

      byState = {};
      for (const a of airports) {
        if (a.state) {
          if (!byState[a.state]) byState[a.state] = [];
          byState[a.state].push(a);
        }
      }

      if (global.Fuse) {
        fuse = new global.Fuse(airports, {
          keys: [
            { name: 'code', weight: 0.22 },
            { name: 'city', weight: 0.28 },
            { name: 'name', weight: 0.2 },
            { name: 'stateName', weight: 0.14 },
            { name: 'state', weight: 0.08 },
            { name: 'country', weight: 0.05 },
            { name: 'keywords', weight: 0.08 },
          ],
          threshold: 0.38,
          ignoreLocation: true,
          minMatchCharLength: 2,
          distance: 130,
          includeScore: true,
        });
      }
    } catch (err) {
      console.error('Airport database failed to load', err);
      airports = [];
    }
  })();

  global.MGTAirportSearch = { ready, search, findState };
})(window);
