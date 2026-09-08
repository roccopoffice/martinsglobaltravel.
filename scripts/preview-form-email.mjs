import { writeFileSync } from 'node:fs';
import { brandedFormEmail } from '../worker/lib/site-email.js';

const { html } = brandedFormEmail({
  kind: 'enquiry',
  name: 'Alexandra Chen',
  email: 'website@martinsglobaltravel.com',
  fields: [
    { label: 'Name', value: 'Alexandra Chen' },
    { label: 'Email', value: 'website@martinsglobaltravel.com' },
    { label: 'Phone', value: '(508) 232-3003' },
    { label: 'Destination', value: 'Japan / Asia Pacific' },
    { label: 'Package', value: 'Signature Journey' },
    { label: 'Departure', value: 'April 12, 2026' },
    { label: 'Travelers', value: '2 People' },
  ],
  message:
    'We would love cherry blossom dates in Kyoto, a few nights in Tokyo, and a quiet ryokan stay if you can arrange it.',
});

const out = process.argv[2] || '/opt/cursor/artifacts/form_email_preview.html';
writeFileSync(out, html);
console.log('Wrote', out);
