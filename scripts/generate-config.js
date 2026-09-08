/**
 * Writes js/analytics-config.js from GA4_MEASUREMENT_ID.
 * The committed file already has the live measurement ID.
 */

const fs = require('fs');
const path = require('path');

const gaId = process.env.GA4_MEASUREMENT_ID || '';
const analyticsOut = `// Generated at build — public measurement ID only
window.MGT_ANALYTICS = {
  GA_MEASUREMENT_ID: ${JSON.stringify(gaId)},
};
`;
const analyticsDest = path.join(__dirname, '..', 'js', 'analytics-config.js');
fs.writeFileSync(analyticsDest, analyticsOut, 'utf8');
console.log('Wrote', analyticsDest, gaId ? '(GA4 enabled)' : '(GA4 not set)');
