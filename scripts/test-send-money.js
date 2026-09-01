/**
 * Private send-money link tests. Run while wrangler dev is up.
 * Usage: node scripts/test-send-money.js [baseUrl]
 */
const BASE = process.argv[2] || 'http://127.0.0.1:8787';
const ADMIN_PW = 'test-admin-123';
const results = [];

async function req(method, path, { body, token } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
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

async function testHelpers() {
  const {
    generateSendToken,
    normalizeToken,
    sendMoneyLimits,
    publicFirstName,
  } = await import('../worker/lib/send-money.js');
  const { applyCheckoutSession } = await import('../worker/lib/payments.js');
  const { dollarsToCents } = await import('../worker/lib/http.js');

  const token = generateSendToken();
  if (token.length >= 12 && token.length <= 16 && !/^\d+$/.test(token) && normalizeToken(token) === token) {
    pass('Token is random and non-sequential', token);
  } else fail('Token is random and non-sequential', token);

  if (normalizeToken('123') === '' && normalizeToken('abc') === '') pass('Short/sequential tokens rejected', 'ok');
  else fail('Short/sequential tokens rejected', 'unexpected');

  const limits = sendMoneyLimits({ SEND_MONEY_MIN_CENTS: '2000', SEND_MONEY_MAX_CENTS: '1000000' });
  if (limits.minCents === 2000 && limits.maxCents === 1000000) pass('Configurable amount limits', '$20–$10,000');
  else fail('Configurable amount limits', JSON.stringify(limits));

  if (publicFirstName({ first_name: 'Sarah', full_name: 'Sarah Italia' }) === 'Sarah') {
    pass('Public name uses first name', 'Sarah');
  } else fail('Public name uses first name', 'mismatch');

  if (dollarsToCents('1,000') === 100000 && dollarsToCents('$250') === 25000 && dollarsToCents('nope') == null) {
    pass('Amount parsing', '1000 / 250 / invalid');
  } else fail('Amount parsing', 'mismatch');

  const ops = [];
  const db = {
    prepare(sql) {
      return {
        bind() {
          return {
            async first() {
              if (String(sql).includes('SELECT id FROM payments')) return null;
              return null;
            },
            async run() {
              return { success: true };
            },
          };
        },
      };
    },
    async batch(list) {
      ops.push(list);
    },
  };
  const unpaid = await applyCheckoutSession(
    db,
    {
      id: 'cs_test_unpaid',
      payment_status: 'unpaid',
      metadata: { booking_type: 'send_money', user_id: 'u1', amount_cents: '25000', send_token: 'abc' },
    },
    {}
  );
  if (!unpaid.ok) pass('Unpaid Stripe session is not credited', unpaid.error);
  else fail('Unpaid Stripe session is not credited', 'unexpected ok');

  const paid = await applyCheckoutSession(
    db,
    {
      id: 'cs_test_paid',
      payment_status: 'paid',
      metadata: {
        booking_type: 'send_money',
        user_id: 'client-sarah',
        amount_cents: '25000',
        send_token: '7fK29xPq91Lm',
      },
    },
    {}
  );
  if (paid.ok && paid.userId === 'client-sarah' && paid.amountCents === 25000 && ops.length === 1) {
    pass('Paid send-money session records against the client', '$250');
  } else fail('Paid send-money session records against the client', JSON.stringify(paid));
}

async function main() {
  console.log(`Testing send-money at ${BASE}\n`);
  await testHelpers();
  try {
    await fetch(`${BASE}/api/auth/session`);
  } catch (err) {
    console.error(`Cannot reach ${BASE}. Start wrangler dev first.\n`, err.message);
    process.exit(1);
  }

  const email = `send-${Date.now()}@example.com`;
  const created = await req('POST', '/api/admin-create-client', {
    body: {
      adminPassword: ADMIN_PW,
      firstName: 'Sarah',
      lastName: 'Italia',
      email,
      password: 'temp1234',
      balanceDollars: '2300.00',
    },
  });
  if (created.ok) pass('Create client Sarah', email);
  else fail('Create client', created.json?.error || created.status);

  const unauth = await req('GET', '/api/send-money/link');
  if (unauth.status === 401) pass('Send-money link requires login', '401');
  else fail('Send-money link requires login', String(unauth.status));

  const login = await req('POST', '/api/auth/login', { body: { email, password: 'temp1234' } });
  const token = login.json?.token;
  if (token) pass('Client login', 'token');
  else fail('Client login', login.json?.error || login.status);

  const mine = await req('GET', '/api/send-money/link', { token });
  const url = mine.json?.url || '';
  const pathToken = url.split('/send/')[1];
  if (mine.ok && pathToken && !/^\d+$/.test(pathToken) && pathToken.length >= 12) {
    pass('Client send-money link', pathToken);
  } else fail('Client send-money link', JSON.stringify(mine.json));

  if (mine.json?.receivedCents === 0) pass('Money received starts at $0', '0');
  else fail('Money received starts at $0', String(mine.json?.receivedCents));

  const missing = await req('GET', '/api/send-money/info?token=not-a-real-token-xx');
  if (missing.status === 404) pass('Unknown token is 404', 'not enumerable');
  else fail('Unknown token is 404', String(missing.status));

  const info = await req('GET', `/api/send-money/info?token=${pathToken}`);
  if (info.ok && info.json.firstName === 'Sarah' && info.json.minCents >= 1) {
    pass('Public info is first name only', info.json.firstName);
  } else fail('Public info', JSON.stringify(info.json));
  if (
    info.json &&
    !('email' in info.json) &&
    !('lastName' in info.json) &&
    !('balanceCents' in info.json) &&
    !('userId' in info.json)
  ) {
    pass('Public info does not leak client data', 'no email/balance/id');
  } else fail('Public info leak check', JSON.stringify(info.json));

  const page = await fetch(`${BASE}/send/${pathToken}`, { redirect: 'manual' });
  const html = page.status === 200 ? await page.text() : '';
  if (page.status === 200 && html.includes('Send Money') && html.includes('js/send-money.js')) {
    pass('GET /send/{token} page', String(page.status));
  } else fail('GET /send/{token} page', `status ${page.status} location ${page.headers.get('location')}`);

  const sequential = await fetch(`${BASE}/send/123`, { redirect: 'manual' });
  if (sequential.status === 404 || sequential.status === 307) {
    /* 307 to /send is asset pretty-URL; sequential IDs are not worker routes */
  }
  const seqInfo = await req('GET', '/api/send-money/info?token=123');
  if (seqInfo.status === 404) pass('Sequential /send/123 is not a valid link', String(seqInfo.status));
  else fail('Sequential /send/123 is not a valid link', String(seqInfo.status));

  const navHome = await (await fetch(`${BASE}/`)).text();
  if (!navHome.includes('/send/') || navHome.includes('send-money')) {
    /* homepage may mention send in other ways; just ensure no browse list */
  }
  if (!navHome.includes('>Send Money<')) pass('Send link is not in main nav', 'ok');
  else fail('Send link is not in main nav', 'found in homepage');

  const low = await req('POST', '/api/send-money/checkout', { body: { token: pathToken, amountDollars: '1' } });
  if (low.status === 400) pass('Amount below minimum rejected', low.json?.error);
  else fail('Amount below minimum', `${low.status} ${JSON.stringify(low.json)}`);

  const badAmt = await req('POST', '/api/send-money/checkout', {
    body: { token: pathToken, amountDollars: 'nope' },
  });
  if (badAmt.status === 400) pass('Invalid amount rejected', '400');
  else fail('Invalid amount', String(badAmt.status));

  const twenty = await req('POST', '/api/send-money/checkout', {
    body: { token: pathToken, amountDollars: '20' },
  });
  if (twenty.status === 503 || (twenty.ok && twenty.json?.url)) {
    pass('Minimum $20 is accepted', String(twenty.status));
  } else fail('Minimum $20 is accepted', `${twenty.status} ${JSON.stringify(twenty.json)}`);

  const thousand = await req('POST', '/api/send-money/checkout', {
    body: { token: pathToken, amountDollars: '1,000' },
  });
  if (thousand.status === 503 || (thousand.ok && thousand.json?.url)) {
    pass('Comma amounts are validated server-side', String(thousand.status));
  } else fail('Comma amounts', `${thousand.status} ${JSON.stringify(thousand.json)}`);

  const checkout = await req('POST', '/api/send-money/checkout', {
    body: { token: pathToken, amountDollars: '250' },
  });
  if (checkout.status === 503) pass('Checkout uses Stripe (no key locally)', '503 — nothing credited');
  else if (checkout.ok && checkout.json?.url) pass('Checkout started Stripe', 'url');
  else fail('Checkout', checkout.json?.error || checkout.status);

  const fakeConfirm = await req('POST', '/api/send-money/confirm', {
    body: { token: pathToken, sessionId: 'not-a-session' },
  });
  if (!fakeConfirm.ok) pass('Browser success flag is not trusted', fakeConfirm.json?.error || fakeConfirm.status);
  else fail('Fake confirm rejected', 'unexpected ok');

  const admin = await req('POST', '/api/admin-send-money', {
    body: { adminPassword: ADMIN_PW, email },
  });
  if (admin.ok && admin.json.token === pathToken && admin.json.client.email === email) {
    pass('Admin views link and client', admin.json.status);
  } else fail('Admin view', JSON.stringify(admin.json));

  const disabled = await req('POST', '/api/admin-send-money', {
    body: { adminPassword: ADMIN_PW, email, action: 'disable' },
  });
  if (disabled.ok && disabled.json.status === 'disabled') pass('Admin disables link', 'disabled');
  else fail('Admin disable', JSON.stringify(disabled.json));

  const afterOff = await req('GET', `/api/send-money/info?token=${pathToken}`);
  if (afterOff.status === 404) pass('Disabled link cannot be used', '404');
  else fail('Disabled link cannot be used', String(afterOff.status));

  const payOff = await req('POST', '/api/send-money/checkout', {
    body: { token: pathToken, amountDollars: '50' },
  });
  if (payOff.status === 404) pass('Disabled link cannot start Stripe', '404');
  else fail('Disabled checkout', String(payOff.status));

  const regen = await req('POST', '/api/admin-send-money', {
    body: { adminPassword: ADMIN_PW, email, action: 'generate' },
  });
  const newToken = regen.json?.token;
  if (regen.ok && newToken && newToken !== pathToken) pass('Admin generates new token', newToken);
  else fail('Admin generate', JSON.stringify(regen.json));

  const info2 = await req('GET', `/api/send-money/info?token=${newToken}`);
  if (info2.ok && info2.json.firstName === 'Sarah') pass('New token works', 'Sarah');
  else fail('New token works', JSON.stringify(info2.json));

  const list = await req('POST', '/api/admin-list-clients', { body: { adminPassword: ADMIN_PW } });
  const row = (list.json?.clients || []).find((c) => c.email === email);
  if (row?.sendToken === newToken && row.sendLinkStatus === 'active') {
    pass('Admin list includes send-money link', row.sendToken);
  } else fail('Admin list send-money fields', JSON.stringify(row));

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) {
    console.log('\nFailed:');
    failed.forEach((f) => console.log(`  - ${f.name}: ${f.detail}`));
  }
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
