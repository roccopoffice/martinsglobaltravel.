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

  const firstName = String(body.firstName || '').trim();
  const lastName = String(body.lastName || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const balanceCents = dollarsToCents(body.balanceDollars);

  if (!firstName || !lastName) return respond(400, { error: 'First and last name are required.' });
  if (!email || !email.includes('@')) return respond(400, { error: 'A valid email is required.' });
  if (password.length < 6) return respond(400, { error: 'Password must be at least 6 characters.' });
  if (balanceCents === null) return respond(400, { error: 'Enter a valid balance amount.' });

  const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let userId;
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const existing = list?.users?.find((u) => u.email?.toLowerCase() === email);

  const mustChangeMeta = { must_change_password: true };

  if (existing) {
    userId = existing.id;
    const { error: pwErr } = await admin.auth.admin.updateUserById(userId, {
      password,
      user_metadata: { ...(existing.user_metadata || {}), ...mustChangeMeta },
    });
    if (pwErr) return respond(400, { error: pwErr.message });
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: mustChangeMeta,
    });
    if (error) return respond(400, { error: error.message });
    userId = data.user.id;
  }

  const fullName = `${firstName} ${lastName}`;
  const { error: upsertErr } = await admin.from('client_accounts').upsert(
    {
      id: userId,
      email,
      first_name: firstName,
      last_name: lastName,
      full_name: fullName,
      balance_cents: balanceCents,
      currency: 'usd',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );

  if (upsertErr) {
    return respond(500, {
      error:
        'Login was created but balance could not be saved. Run supabase/schema.sql and migration-add-client-names.sql.',
    });
  }

  return respond(200, {
    ok: true,
    message: `${fullName} is ready. Give them the temporary password — they must set a new one on first login at /portal.html.`,
    balanceDollars: (balanceCents / 100).toFixed(2),
  });
};
