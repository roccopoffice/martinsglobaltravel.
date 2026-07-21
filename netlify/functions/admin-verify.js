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

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return respond(500, { error: 'Supabase is not configured on the server.' });
  }

  const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error } = await admin.from('client_accounts').select('id').limit(1);
  if (error) {
    return respond(500, {
      error: 'Could not reach Supabase. Run schema.sql in your Supabase project.',
    });
  }

  return respond(200, { ok: true });
};
