/**
 * Writes js/config.js at build time from Netlify env vars (keeps keys out of Git).
 * Local: set SUPABASE_URL + SUPABASE_ANON_KEY, then node scripts/generate-config.js
 */

const fs = require('fs');
const path = require('path');

const url = process.env.SUPABASE_URL;
const anon = process.env.SUPABASE_ANON_KEY;
const hasSupabase = Boolean(url && anon);

if (!hasSupabase) {
  console.warn(
    'Warning: SUPABASE_URL or SUPABASE_ANON_KEY not set. Deploy will succeed; client portal needs both in Netlify → Environment variables.'
  );
}

const out = `// Generated at build — do not commit real keys to Git
window.MGT_CONFIG = {
  SUPABASE_URL: ${JSON.stringify(url || 'https://YOUR_PROJECT_REF.supabase.co')},
  SUPABASE_ANON_KEY: ${JSON.stringify(anon || 'YOUR_SUPABASE_ANON_KEY')},
};
`;

const dest = path.join(__dirname, '..', 'js', 'config.js');
fs.writeFileSync(dest, out, 'utf8');
console.log('Wrote', dest, hasSupabase ? '(Supabase configured)' : '(placeholders — add env vars)');

const gaId = process.env.GA4_MEASUREMENT_ID || '';
const analyticsOut = `// Generated at build — public measurement ID only
window.MGT_ANALYTICS = {
  GA_MEASUREMENT_ID: ${JSON.stringify(gaId)},
};
`;
const analyticsDest = path.join(__dirname, '..', 'js', 'analytics-config.js');
fs.writeFileSync(analyticsDest, analyticsOut, 'utf8');
console.log('Wrote', analyticsDest, gaId ? '(GA4 enabled)' : '(GA4 not set)');
