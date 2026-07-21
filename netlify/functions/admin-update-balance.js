const { createClient } = require('@supabase/supabase-js');
const { respond, parseBody, verifyAdmin, dollarsToCents, headers } = require('./admin-lib');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return respond(405, { error: 'Method not allowed' });
  }

  const body = parseBody(event);
  if (!body) return respond(400, { error: 'Invalid request' });

  const auth = verifyAdmin(body);
  if (!auth.ok) return respond(401, { error: auth.error });

  const email = String(body.email || '').trim().toLowerCase();
  const balanceCents = dollarsToCents(body.balanceDollars);

  if (!email || !email.includes('@')) return respond(400, { error: 'A valid email is required.' });
  if (balanceCents === null) return respond(400, { error: 'Enter a valid balance amount.' });

  const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await admin
    .from('client_accounts')
    .update({ balance_cents: balanceCents, updated_at: new Date().toISOString() })
    .eq('email', email)
    .select('first_name, last_name, email')
    .maybeSingle();

  if (error) return respond(500, { error: error.message });
  if (!data) return respond(404, { error: 'No client found with that email. Add them first.' });

  const name = [data.first_name, data.last_name].filter(Boolean).join(' ') || data.email;
  return respond(200, {
    ok: true,
    message: `Balance for ${name} is now $${(balanceCents / 100).toFixed(2)}.`,
  });
};
