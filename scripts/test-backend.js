/**
 * Backend smoke test — run while `npx wrangler dev --port 8787 --local` is up.
 * Usage: node scripts/test-backend.js [baseUrl]
 */
const BASE = process.argv[2] || 'http://127.0.0.1:8787';
const ADMIN_PW = 'test-admin-123';

const results = [];

async function req(method, path, { body, token, headers = {} } = {}) {
  const url = `${BASE}${path}`;
  const opts = {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status, json, ok: res.ok };
}

function pass(name, detail) {
  results.push({ name, ok: true, detail });
  console.log(`✅ ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(name, detail) {
  results.push({ name, ok: false, detail });
  console.log(`❌ ${name} — ${detail}`);
}

async function main() {
  console.log(`Testing backend at ${BASE}\n`);

  try {
    await fetch(`${BASE}/api/auth/session`);
  } catch (err) {
    console.error(`Cannot reach ${BASE}. Start wrangler dev first.\n`, err.message);
    process.exit(1);
  }

  // OPTIONS / CORS
  const opt = await fetch(`${BASE}/api/auth/login`, { method: 'OPTIONS' });
  if (opt.status === 204) pass('OPTIONS preflight', '204');
  else fail('OPTIONS preflight', `expected 204, got ${opt.status}`);

  // Unauthenticated session
  const session = await req('GET', '/api/auth/session');
  if (session.status === 401) pass('GET auth/session (no token)', '401');
  else fail('GET auth/session (no token)', `expected 401, got ${session.status}`);

  // Admin verify wrong password
  const badAdmin = await req('POST', '/api/admin-verify', { body: { adminPassword: 'wrong' } });
  if (badAdmin.status === 401) pass('POST admin-verify (bad pw)', '401');
  else fail('POST admin-verify (bad pw)', `expected 401, got ${badAdmin.status}`);

  // Admin verify ok
  const goodAdmin = await req('POST', '/api/admin-verify', { body: { adminPassword: ADMIN_PW } });
  if (goodAdmin.ok && goodAdmin.json?.ok) pass('POST admin-verify', 'ok');
  else fail('POST admin-verify', goodAdmin.json?.error || goodAdmin.status);

  // Create client
  const email = `test-${Date.now()}@example.com`;
  const create = await req('POST', '/api/admin-create-client', {
    body: {
      adminPassword: ADMIN_PW,
      firstName: 'Test',
      lastName: 'Client',
      email,
      password: 'temp1234',
      balanceDollars: '150.00',
    },
  });
  if (create.ok && create.json?.ok) pass('POST admin-create-client', email);
  else fail('POST admin-create-client', create.json?.error || create.status);

  // List clients
  const list = await req('POST', '/api/admin-list-clients', { body: { adminPassword: ADMIN_PW } });
  if (list.ok && list.json?.clients?.some((c) => c.email === email)) {
    pass('POST admin-list-clients', `${list.json.count} clients`);
  } else {
    fail('POST admin-list-clients', list.json?.error || 'client not in list');
  }

  // Login
  const login = await req('POST', '/api/auth/login', {
    body: { email, password: 'temp1234' },
  });
  if (!login.ok || !login.json?.token) {
    fail('POST auth/login', login.json?.error || login.status);
    summarize();
    process.exit(1);
  }
  pass('POST auth/login', 'token received');
  const token = login.json.token;

  // Session with token
  const sess2 = await req('GET', '/api/auth/session', { token });
  if (sess2.ok && sess2.json?.user?.email === email) pass('GET auth/session (with token)', email);
  else fail('GET auth/session (with token)', sess2.json?.error || sess2.status);

  // Balance
  const bal = await req('GET', '/api/auth/balance', { token });
  if (bal.ok && bal.json?.account?.balance_cents === 15000) {
    pass('GET auth/balance', '$150.00');
  } else {
    fail('GET auth/balance', bal.json?.error || JSON.stringify(bal.json?.account));
  }

  // Change password
  const chpw = await req('POST', '/api/auth/change-password', {
    token,
    body: { newPassword: 'newpass5678' },
  });
  if (chpw.ok) pass('POST auth/change-password', 'ok');
  else fail('POST auth/change-password', chpw.json?.error || chpw.status);

  // Re-login with new password
  const login2 = await req('POST', '/api/auth/login', {
    body: { email, password: 'newpass5678' },
  });
  if (login2.ok) pass('POST auth/login (new password)', 'ok');
  else fail('POST auth/login (new password)', login2.json?.error || login2.status);
  const token2 = login2.json?.token || token;

  // Update balance
  const updBal = await req('POST', '/api/admin-update-balance', {
    body: { adminPassword: ADMIN_PW, email, balanceDollars: '75.50' },
  });
  if (updBal.ok) pass('POST admin-update-balance', '$75.50');
  else fail('POST admin-update-balance', updBal.json?.error || updBal.status);

  // Update notes
  const notes = await req('POST', '/api/admin-update-notes', {
    body: { adminPassword: ADMIN_PW, email, notes: 'VIP client' },
  });
  if (notes.ok) pass('POST admin-update-notes', 'ok');
  else fail('POST admin-update-notes', notes.json?.error || notes.status);

  // Analytics
  const analytics = await req('POST', '/api/admin-get-analytics', {
    body: { adminPassword: ADMIN_PW },
  });
  if (analytics.ok && analytics.json?.portal?.totalClients >= 1) {
    pass('POST admin-get-analytics', `${analytics.json.portal.totalClients} clients`);
  } else {
    fail('POST admin-get-analytics', analytics.json?.error || analytics.status);
  }

  // Checkout without Stripe (expect 503)
  const checkout = await req('POST', '/api/create-checkout', { token: token2, body: {} });
  if (checkout.status === 503) pass('POST create-checkout (no Stripe key)', '503 as expected');
  else if (checkout.ok) pass('POST create-checkout', 'Stripe configured');
  else fail('POST create-checkout', checkout.json?.error || checkout.status);

  // Flight search without Amadeus (expect 503)
  const flights = await req('POST', '/api/flight-search', {
    body: {
      origin: 'BOS',
      destination: 'MIA',
      departureDate: '2026-09-15',
      returnDate: '2026-09-22',
      adults: 1,
      tripType: 'roundtrip',
    },
  });
  if (flights.status === 503) pass('POST flight-search (no Amadeus)', '503 as expected');
  else if (flights.ok) pass('POST flight-search', `${flights.json?.offers?.length || 0} offers`);
  else fail('POST flight-search', flights.json?.error || flights.status);

  // Airport search
  const airports = await req('GET', '/api/airport-search?q=Boston');
  if (airports.ok) pass('GET airport-search', `${airports.json?.airports?.length || 0} results`);
  else fail('GET airport-search', airports.json?.error || airports.status);

  // Legacy netlify path
  const legacy = await req('POST', '/.netlify/functions/admin-verify', {
    body: { adminPassword: ADMIN_PW },
  });
  if (legacy.ok) pass('Legacy /.netlify/functions/admin-verify', 'ok');
  else fail('Legacy /.netlify/functions/admin-verify', legacy.json?.error || legacy.status);

  // Delete test client
  const del = await req('POST', '/api/admin-delete-client', {
    body: { adminPassword: ADMIN_PW, email },
  });
  if (del.ok) pass('POST admin-delete-client', 'cleaned up');
  else fail('POST admin-delete-client', del.json?.error || del.status);

  summarize();
  process.exit(results.some((r) => !r.ok) ? 1 : 0);
}

function summarize() {
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) {
    console.log('\nFailed:');
    failed.forEach((f) => console.log(`  - ${f.name}: ${f.detail}`));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
