/**
 * Gift-card / travel-credit tests — run while wrangler dev is up.
 * Usage: node scripts/test-gift-cards.js [baseUrl]
 */
const BASE = process.argv[2] || 'http://127.0.0.1:8787';
const ADMIN_PW = 'test-admin-123';

const results = [];

async function req(method, path, { body, token, headers = {} } = {}) {
  const opts = {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...headers,
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status, json, ok: res.ok, text: json };
}

function pass(name, detail) {
  results.push({ name, ok: true, detail });
  console.log(`✅ ${name}${detail ? ` — ${detail}` : ''}`);
}
function fail(name, detail) {
  results.push({ name, ok: false, detail });
  console.log(`❌ ${name} — ${detail}`);
}

async function createClient(email, password, balanceDollars) {
  return req('POST', '/api/admin-create-client', {
    body: {
      adminPassword: ADMIN_PW,
      firstName: 'Gift',
      lastName: 'Tester',
      email,
      password,
      balanceDollars,
    },
  });
}

async function login(email, password) {
  const res = await req('POST', '/api/auth/login', { body: { email, password } });
  return res.json?.token;
}

async function issuePromo(email, amountDollars, extra = {}) {
  return req('POST', '/api/admin-gift-cards-issue', {
    body: {
      adminPassword: ADMIN_PW,
      recipientName: 'Gift Tester',
      recipientEmail: email,
      amountDollars,
      giftMessage: extra.message || 'Test credit',
      reason: extra.reason || 'Automated test',
      sendEmail: extra.sendEmail,
      expiresAt: extra.expiresAt,
    },
  });
}

async function main() {
  console.log(`Testing gift cards at ${BASE}\n`);
  try {
    await fetch(`${BASE}/api/gift-cards/config`);
  } catch (err) {
    console.error(`Cannot reach ${BASE}. Start wrangler dev first.\n`, err.message);
    process.exit(1);
  }

  const stamp = Date.now();

  const unauth = await req('GET', '/api/gift-cards/my');
  if (unauth.status === 401) pass('Unauthorized GET gift-cards/my', '401');
  else fail('Unauthorized GET gift-cards/my', `expected 401, got ${unauth.status}`);

  const cfg = await req('GET', '/api/gift-cards/config');
  if (cfg.ok && cfg.json?.config?.presetsCents?.includes(25000)) {
    pass('GET gift-cards/config', `min ${cfg.json.config.minAmountCents}`);
  } else fail('GET gift-cards/config', JSON.stringify(cfg.json));

  const purchase = await req('POST', '/api/gift-cards/purchase', {
    body: {
      amountDollars: '50',
      purchaserName: 'Mike',
      purchaserEmail: `mike-${stamp}@example.com`,
      recipientName: 'Sarah',
      recipientEmail: `sarah-${stamp}@example.com`,
      giftMessage: 'Happy Birthday! Here’s to your next adventure!',
    },
  });
  if (purchase.status === 503) pass('Purchase without Stripe (failed payment path)', '503 — no card issued');
  else if (purchase.ok && purchase.json?.url) pass('Purchase started Stripe checkout', 'url returned');
  else fail('Purchase gift card', purchase.json?.error || purchase.status);

  const page = await fetch(`${BASE}/gift-cards`);
  const html = await page.text();
  if (page.ok && html.includes('Give the Gift') && html.includes('E-Gift Card')) {
    pass('GET /gift-cards landing page', `${page.status}`);
  } else fail('GET /gift-cards landing page', `${page.status}`);

  const adminPage = await fetch(`${BASE}/admin/gift-cards`, { redirect: 'manual' });
  if (adminPage.status === 302) pass('GET /admin/gift-cards redirect', adminPage.headers.get('location'));
  else fail('GET /admin/gift-cards redirect', `expected 302, got ${adminPage.status}`);

  const portalHtml = await (await fetch(`${BASE}/portal.html`)).text();
  if (portalHtml.includes('My Travel Credits') && portalHtml.includes('Apply Credit')) {
    pass('Portal includes travel-credit UI', 'section + apply form');
  } else fail('Portal includes travel-credit UI', 'missing copy');

  const emailA = `gc-a-${stamp}@example.com`;
  const createdA = await createClient(emailA, 'temp1234', '2300.00');
  if (createdA.ok) pass('Create client A ($2,300 trip)', emailA);
  else fail('Create client A', createdA.json?.error || createdA.status);
  const tokenA = await login(emailA, 'temp1234');
  if (tokenA) pass('Login client A', 'token');
  else fail('Login client A', 'no token');

  const empty = await req('GET', '/api/gift-cards/my', { token: tokenA });
  if (empty.ok && (empty.json?.cards || []).length === 0) pass('Empty travel credits', '0 cards');
  else fail('Empty travel credits', JSON.stringify(empty.json));

  const codes = [];
  for (let i = 0; i < 3; i++) {
    const issued = await issuePromo(`uniq-${stamp}-${i}@example.com`, '25.00');
    if (issued.ok && issued.json?.code) codes.push(issued.json.code);
  }
  if (codes.length === 3 && new Set(codes).size === 3 && codes.every((c) => /^TRVL-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(c))) {
    pass('Unique TRVL codes', codes.join(', '));
  } else fail('Unique TRVL codes', codes.join(', ') || 'missing');

  const promoA = await issuePromo(emailA, '500.00', { message: 'Congratulations! You received $500 in travel credit.' });
  if (promoA.ok && promoA.json?.giftCard?.type === 'PROMOTIONAL_CREDIT' && promoA.json.code) {
    pass('Admin issue PROMOTIONAL_CREDIT $500', promoA.json.code);
  } else fail('Admin issue promotional', promoA.json?.error || promoA.status);
  const codeA = promoA.json?.code;

  const mine = await req('GET', '/api/gift-cards/my', { token: tokenA });
  if (mine.ok && mine.json.availableCents === 50000) pass('My credits total $500', String(mine.json.availableCents));
  else fail('My credits total', JSON.stringify(mine.json));

  const badCode = await req('POST', '/api/gift-cards/apply', {
    token: tokenA,
    body: { code: 'TRVL-ZZZZ-ZZZZ' },
  });
  if (!badCode.ok) pass('Invalid code rejected', badCode.json?.error || badCode.status);
  else fail('Invalid code rejected', 'unexpected success');

  const applyA = await req('POST', '/api/gift-cards/apply', { token: tokenA, body: { code: codeA } });
  const qA = applyA.json?.quote;
  if (applyA.ok && qA?.creditAppliedCents === 50000 && qA?.remainingBalanceCents === 180000) {
    pass('Apply $500 to $2,300 trip', 'remaining $1,800');
  } else fail('Apply $500 to $2,300 trip', JSON.stringify(applyA.json));

  const balA = await req('GET', '/api/auth/balance', { token: tokenA });
  if (balA.json?.account?.balance_cents === 180000) pass('Trip balance now $1,800', 'server-side');
  else fail('Trip balance after apply', JSON.stringify(balA.json?.account));

  const dup = await req('POST', '/api/gift-cards/apply', { token: tokenA, body: { code: codeA } });
  if (!dup.ok) pass('Duplicate / zero-balance redemption blocked', dup.json?.error || dup.status);
  else fail('Duplicate redemption', 'should not succeed');

  const ledger = await req('GET', `/api/gift-cards/transactions?id=${promoA.json.giftCard.id}`, {
    token: tokenA,
  });
  const types = (ledger.json?.transactions || []).map((t) => t.transaction_type);
  if (ledger.ok && types.includes('issue') && types.includes('redeem')) {
    pass('Transaction ledger', types.join(', '));
  } else fail('Transaction ledger', JSON.stringify(ledger.json));

  const emailB = `gc-b-${stamp}@example.com`;
  await createClient(emailB, 'temp1234', '300.00');
  const tokenB = await login(emailB, 'temp1234');
  const promoB = await issuePromo(emailB, '500.00');
  const applyB = await req('POST', '/api/gift-cards/apply', { token: tokenB, body: { code: promoB.json.code } });
  const qB = applyB.json?.quote;
  if (applyB.ok && qB?.creditAppliedCents === 30000 && qB?.remainingBalanceCents === 0) {
    pass('Credit greater than booking ($500 on $300)', 'trip $0, leftover on card');
  } else fail('Credit greater than booking', JSON.stringify(applyB.json));
  const mineB = await req('GET', '/api/gift-cards/my', { token: tokenB });
  const leftover = (mineB.json?.cards || []).find((c) => c.id === promoB.json.giftCard.id);
  if (leftover?.currentBalanceCents === 20000) pass('Remaining gift-card balance $200', 'preserved');
  else fail('Remaining gift-card balance', JSON.stringify(leftover));

  const emailC = `gc-c-${stamp}@example.com`;
  await createClient(emailC, 'temp1234', '500.00');
  const tokenC = await login(emailC, 'temp1234');
  const promoC = await issuePromo(emailC, '500.00');
  const applyC = await req('POST', '/api/gift-cards/apply', { token: tokenC, body: { code: promoC.json.code } });
  if (applyC.ok && applyC.json?.quote?.remainingBalanceCents === 0) {
    pass('$0 remaining balance covers trip', 'no Stripe required');
  } else fail('$0 remaining balance', JSON.stringify(applyC.json));

  const emailD = `gc-d-${stamp}@example.com`;
  await createClient(emailD, 'temp1234', '1000.00');
  const tokenD = await login(emailD, 'temp1234');
  const cardD1 = await issuePromo(emailD, '300.00');
  const cardD2 = await issuePromo(emailD, '200.00');
  const applyD = await req('POST', '/api/gift-cards/apply', {
    token: tokenD,
    body: { applyAvailable: true },
  });
  if (applyD.ok && applyD.json?.quote?.creditAppliedCents === 50000 && applyD.json?.quote?.remainingBalanceCents === 50000) {
    pass('Multiple cards combined ($300+$200 on $1,000)', 'remaining $500');
  } else fail('Multiple cards', JSON.stringify(applyD.json));
  void cardD1;
  void cardD2;

  const expired = await issuePromo(`exp-${stamp}@example.com`, '50.00', {
    expiresAt: '2000-01-01T00:00:00.000Z',
  });
  const tokenExp = tokenA;
  const applyExp = await req('POST', '/api/gift-cards/apply', {
    token: tokenExp,
    body: { code: expired.json?.code },
  });
  if (!applyExp.ok) pass('Expired code rejected', applyExp.json?.error || applyExp.status);
  else fail('Expired code rejected', 'unexpected success');

  const emailE = `gc-e-${stamp}@example.com`;
  await createClient(emailE, 'temp1234', '100.00');
  const tokenE = await login(emailE, 'temp1234');
  const disabledCard = await issuePromo(emailE, '50.00');
  await req('POST', '/api/admin-gift-cards-disable', {
    body: {
      adminPassword: ADMIN_PW,
      id: disabledCard.json.giftCard.id,
      status: 'disabled',
      reason: 'Test disable',
    },
  });
  const applyDis = await req('POST', '/api/gift-cards/apply', {
    token: tokenE,
    body: { code: disabledCard.json.code },
  });
  if (!applyDis.ok) pass('Disabled code rejected', applyDis.json?.error || applyDis.status);
  else fail('Disabled code rejected', 'unexpected success');

  const adj = await req('POST', '/api/admin-gift-cards-adjust', {
    body: {
      adminPassword: ADMIN_PW,
      id: leftover.id,
      action: 'add',
      amountDollars: '25.00',
      reason: 'Test goodwill adjustment',
    },
  });
  if (adj.ok && adj.json?.giftCard?.currentBalanceCents === 22500) {
    pass('Admin adjustment +$25 with reason', '$225 remaining');
  } else fail('Admin adjustment', JSON.stringify(adj.json));

  const apps = await req('POST', '/api/admin-gift-cards-get', {
    body: { adminPassword: ADMIN_PW, id: promoB.json.giftCard.id },
  });
  const appId = apps.json?.applications?.[0]?.id;
  const restore = await req('POST', '/api/admin-gift-cards-restore', {
    body: { adminPassword: ADMIN_PW, applicationId: appId, reason: 'Test cancellation restore' },
  });
  if (restore.ok && restore.json?.restoredCents === 30000) {
    pass('Restore gift-card portion after cancellation', '$300 back to card');
  } else fail('Restore application', JSON.stringify(restore.json));
  const afterRestore = await req('GET', '/api/auth/balance', { token: tokenB });
  if (afterRestore.json?.account?.balance_cents === 30000) {
    pass('Trip balance restored with gift-card undo', '$300 owed again');
  } else fail('Trip balance after restore', JSON.stringify(afterRestore.json?.account));

  const emailF = `gc-f-${stamp}@example.com`;
  await createClient(emailF, 'temp1234', '800.00');
  const tokenF = await login(emailF, 'temp1234');
  const raceCard = await issuePromo(emailF, '400.00');
  const [r1, r2] = await Promise.all([
    req('POST', '/api/gift-cards/apply', { token: tokenF, body: { code: raceCard.json.code } }),
    req('POST', '/api/gift-cards/apply', { token: tokenF, body: { code: raceCard.json.code } }),
  ]);
  const wins = [r1, r2].filter((r) => r.ok).length;
  const losses = [r1, r2].filter((r) => !r.ok).length;
  if (wins === 1 && losses === 1) pass('Concurrent redemption — only one spend', `${wins} win / ${losses} fail`);
  else if (wins === 1 && losses === 0) {
    const mineF = await req('GET', '/api/gift-cards/my', { token: tokenF });
    const card = (mineF.json?.cards || []).find((c) => c.id === raceCard.json.giftCard.id);
    if ((card?.currentBalanceCents || 0) === 0) pass('Concurrent redemption serialized', 'card exhausted once');
    else fail('Concurrent redemption', JSON.stringify({ r1: r1.json, r2: r2.json, card }));
  } else fail('Concurrent redemption', JSON.stringify({ w: wins, l: losses, r1: r1.json, r2: r2.json }));

  const list = await req('POST', '/api/admin-gift-cards-list', {
    body: { adminPassword: ADMIN_PW, q: emailA },
  });
  if (list.ok && (list.json?.count || 0) >= 1) pass('Admin list/search', `${list.json.count} cards`);
  else fail('Admin list/search', JSON.stringify(list.json));

  const failedAdj = await req('POST', '/api/admin-gift-cards-adjust', {
    body: {
      adminPassword: ADMIN_PW,
      id: promoA.json.giftCard.id,
      action: 'add',
      amountDollars: '10',
    },
  });
  if (!failedAdj.ok) pass('Admin adjust without reason rejected', failedAdj.json?.error);
  else fail('Admin adjust without reason', 'should require reason');

  const checkout = await req('POST', '/api/create-checkout', { token: tokenA, body: {} });
  if (checkout.status === 503 || checkout.ok) {
    pass('Remaining balance still uses Stripe checkout', String(checkout.status));
  } else fail('Remaining checkout', checkout.json?.error || checkout.status);

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
