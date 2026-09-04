/**
 * Form email smoke tests — run while wrangler dev is up.
 * Usage: node scripts/test-forms.js [baseUrl]
 */
const BASE = process.argv[2] || 'http://127.0.0.1:8787';
const ADMIN_PW = 'test-admin-123';

const results = [];

function pass(name, detail) {
  results.push({ name, ok: true, detail });
  console.log(`✅ ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(name, detail) {
  results.push({ name, ok: false, detail });
  console.log(`❌ ${name} — ${detail}`);
}

async function main() {
  console.log(`Testing forms at ${BASE}\n`);

  const missing = await fetch(`${BASE}/api/contact`, { method: 'POST', body: new URLSearchParams({ firstName: 'A' }) });
  const missingText = await missing.text();
  if (missing.status === 400) pass('POST /api/contact missing email', '400');
  else fail('POST /api/contact missing email', `${missing.status} ${missingText.slice(0, 120)}`);

  const honey = await fetch(`${BASE}/api/contact`, {
    method: 'POST',
    body: new URLSearchParams({
      _honey: 'bot',
      firstName: 'Bot',
      lastName: 'Trap',
      email: 'bot@example.com',
    }),
  });
  const honeyJson = await honey.json().catch(() => ({}));
  if (honey.ok && honeyJson.ok) pass('POST /api/contact honeypot', 'ok without storing');
  else fail('POST /api/contact honeypot', JSON.stringify(honeyJson) || honey.status);

  const stamp = Date.now();
  const email = `form-test-${stamp}@example.com`;
  const enquiry = await fetch(`${BASE}/api/contact`, {
    method: 'POST',
    body: new URLSearchParams({
      firstName: 'Taylor',
      lastName: 'Enquiry',
      email,
      phone: '5085550100',
      destination: 'Japan / Asia Pacific',
      message: 'Looking for cherry blossom dates.',
    }),
  });
  const enquiryJson = await enquiry.json().catch(() => ({}));
  if (enquiry.ok && enquiryJson.ok) pass('POST /api/contact enquiry', `emailed=${enquiryJson.emailed}`);
  else fail('POST /api/contact enquiry', JSON.stringify(enquiryJson) || enquiry.status);

  const autofill = await fetch(`${BASE}/api/newsletter`, {
    method: 'POST',
    body: new URLSearchParams({
      email: `autofill-${stamp}@example.com`,
      _honey: `autofill-${stamp}@example.com`,
    }),
  });
  const autofillJson = await autofill.json().catch(() => ({}));
  if (autofill.ok && autofillJson.ok) pass('POST /api/newsletter autofilled honeypot still saves', 'ok');
  else fail('POST /api/newsletter autofilled honeypot still saves', JSON.stringify(autofillJson) || autofill.status);

  const nl = await fetch(`${BASE}/api/newsletter`, {
    method: 'POST',
    body: new URLSearchParams({ email: `news-${stamp}@example.com` }),
  });
  const nlJson = await nl.json().catch(() => ({}));
  if (nl.ok && nlJson.ok) pass('POST /api/newsletter', `emailed=${nlJson.emailed}`);
  else fail('POST /api/newsletter', JSON.stringify(nlJson) || nl.status);

  const listed = await fetch(`${BASE}/api/admin-list-forms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ adminPassword: ADMIN_PW }),
  });
  const listedJson = await listed.json().catch(() => ({}));
  const rows = listedJson.submissions || [];
  const foundEnquiry = rows.some((r) => r.email === email && r.form_type === 'enquiry');
  const foundNews = rows.some((r) => r.email === `news-${stamp}@example.com` && r.form_type === 'newsletter');
  const foundAutofill = rows.some((r) => r.email === `autofill-${stamp}@example.com` && r.form_type === 'newsletter');
  if (listed.ok && foundEnquiry && foundNews && foundAutofill) pass('POST /api/admin-list-forms', `${rows.length} rows`);
  else fail('POST /api/admin-list-forms', JSON.stringify(listedJson).slice(0, 240));

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
