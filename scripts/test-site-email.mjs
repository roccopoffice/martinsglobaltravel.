import {
  CONTACT_FROM,
  CONTACT_TO,
  isLookalikeDomain,
  sanitizeEmail,
  sanitizeHeader,
} from '../worker/lib/site-email.js';

const checks = [];
function pass(name) {
  checks.push({ name, ok: true });
  console.log(`✅ ${name}`);
}
function fail(name, detail) {
  checks.push({ name, ok: false, detail });
  console.log(`❌ ${name} — ${detail}`);
}

if (sanitizeEmail('Jeanie@MartinsGlobalTravels.com') === CONTACT_TO) pass('sanitizeEmail lowercases');
else fail('sanitizeEmail lowercases', sanitizeEmail('Jeanie@MartinsGlobalTravels.com'));

if (sanitizeEmail('not-an-email') === '') pass('sanitizeEmail rejects junk');
else fail('sanitizeEmail rejects junk', sanitizeEmail('not-an-email'));

if (sanitizeHeader('New enquiry — website\nBcc: evil@x.com') === 'New enquiry website Bcc: evil@x.com') {
  pass('sanitizeHeader strips non-ascii and newlines');
} else {
  fail('sanitizeHeader', sanitizeHeader('New enquiry — website\nBcc: evil@x.com'));
}

if (isLookalikeDomain(CONTACT_FROM, CONTACT_TO)) pass('travel vs travels is lookalike');
else fail('travel vs travels is lookalike', `${CONTACT_FROM} -> ${CONTACT_TO}`);

if (!isLookalikeDomain(CONTACT_FROM, 'guest@gmail.com')) pass('gmail is not lookalike');
else fail('gmail is not lookalike', 'false positive');

if (!isLookalikeDomain(CONTACT_FROM, 'website@martinsglobaltravel.com')) pass('same domain is not lookalike');
else fail('same domain is not lookalike', 'false positive');

const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
process.exit(failed.length ? 1 : 0);
