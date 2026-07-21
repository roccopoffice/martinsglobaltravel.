const { createClient } = require('@supabase/supabase-js');
const { respond, parseBody, verifyAdmin, headers } = require('./admin-lib');

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
  if (!email || !email.includes('@')) {
    return respond(400, { error: 'A valid email is required.' });
  }

  const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: account, error: findErr } = await admin
    .from('client_accounts')
    .select('id, email, first_name, last_name, full_name')
    .eq('email', email)
    .maybeSingle();

  if (findErr) return respond(500, { error: findErr.message });
  if (!account) return respond(404, { error: 'No client found with that email.' });

  const name =
    [account.first_name, account.last_name].filter(Boolean).join(' ').trim() ||
    account.full_name ||
    account.email;

  const { error: authDeleteErr } = await admin.auth.admin.deleteUser(account.id);

  if (authDeleteErr) {
    const { error: rowErr } = await admin.from('client_accounts').delete().eq('id', account.id);
    if (rowErr) {
      return respond(500, { error: 'Could not remove client. ' + authDeleteErr.message });
    }
  }

  return respond(200, {
    ok: true,
    message: `${name} was removed from the portal. They can no longer sign in.`,
  });
};
