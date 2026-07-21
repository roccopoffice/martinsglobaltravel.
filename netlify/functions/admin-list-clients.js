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

  const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await admin
    .from('client_accounts')
    .select('id, first_name, last_name, full_name, email, balance_cents, notes, updated_at')
    .order('last_name', { ascending: true })
    .order('first_name', { ascending: true });

  if (error) {
    return respond(500, {
      error: 'Could not load clients. Run supabase/schema.sql in your Supabase project.',
    });
  }

  const clients = (data || []).map((row) => {
    const name =
      [row.first_name, row.last_name].filter(Boolean).join(' ').trim() ||
      row.full_name?.trim() ||
      row.email;
    return {
      id: row.id,
      name,
      email: row.email,
      balanceCents: row.balance_cents,
      balanceDollars: ((row.balance_cents || 0) / 100).toFixed(2),
      notes: row.notes || '',
      updatedAt: row.updated_at,
    };
  });

  return respond(200, { ok: true, clients, count: clients.length });
};
