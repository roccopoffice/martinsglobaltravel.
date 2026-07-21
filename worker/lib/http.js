export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, stripe-signature, Stripe-Signature',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
};

export function json(status, body, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, ...extraHeaders },
  });
}

export function empty(status = 204) {
  return new Response(null, { status, headers: corsHeaders });
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export function bearerToken(request) {
  const header = request.headers.get('Authorization') || '';
  return header.replace(/^Bearer\s+/i, '').trim();
}

export function siteUrl(request, env) {
  return (env.SITE_URL || new URL(request.url).origin).replace(/\/$/, '');
}

export function dollarsToCents(value) {
  const n = parseFloat(String(value).replace(/[$,]/g, ''));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export function verifyAdmin(body, env) {
  const expected = env.ADMIN_PORTAL_PASSWORD;
  if (!expected) return { ok: false, error: 'Admin portal is not configured on the server.' };
  if (!body?.adminPassword || body.adminPassword !== expected) {
    return { ok: false, error: 'Incorrect admin password.' };
  }
  return { ok: true };
}
