const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

function respond(status, body) {
  return { statusCode: status, headers, body: JSON.stringify(body) };
}

function parseBody(event) {
  try {
    return JSON.parse(event.body || '{}');
  } catch {
    return null;
  }
}

function verifyAdmin(body) {
  const expected = process.env.ADMIN_PORTAL_PASSWORD;
  if (!expected) return { ok: false, error: 'Admin portal is not configured on the server.' };
  if (!body?.adminPassword || body.adminPassword !== expected) {
    return { ok: false, error: 'Incorrect admin password.' };
  }
  return { ok: true };
}

function dollarsToCents(value) {
  const n = parseFloat(String(value).replace(/[$,]/g, ''));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

module.exports = { headers, respond, parseBody, verifyAdmin, dollarsToCents };
