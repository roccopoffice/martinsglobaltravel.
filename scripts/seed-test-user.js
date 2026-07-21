/**
 * Create or update a client in Supabase (admin use).
 *
 *   npm install
 *   set SUPABASE_URL=https://xxx.supabase.co
 *   set SUPABASE_SERVICE_ROLE_KEY=eyJ...
 *   set SEED_EMAIL=client@example.com
 *   set SEED_PASSWORD=strong-password-here
 *   set SEED_FIRST_NAME=Jane
 *   set SEED_LAST_NAME=Smith
 *   set SEED_BALANCE_CENTS=250000
 *   node scripts/seed-test-user.js
 */

const { createClient } = require('@supabase/supabase-js');

const EMAIL = process.env.SEED_EMAIL;
const PASSWORD = process.env.SEED_PASSWORD;
const FIRST_NAME = process.env.SEED_FIRST_NAME || '';
const LAST_NAME = process.env.SEED_LAST_NAME || '';
const FULL_NAME = [FIRST_NAME, LAST_NAME].filter(Boolean).join(' ') || process.env.SEED_NAME || 'Client';
const BALANCE_CENTS = parseInt(process.env.SEED_BALANCE_CENTS || '0', 10);

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  if (!EMAIL || !PASSWORD) {
    console.error('Missing SEED_EMAIL or SEED_PASSWORD');
    process.exit(1);
  }

  const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

  let userId;
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const existing = list?.users?.find((u) => u.email?.toLowerCase() === EMAIL.toLowerCase());
  if (existing) {
    userId = existing.id;
    console.log('User already exists:', userId);
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
    });
    if (error) throw error;
    userId = data.user.id;
    console.log('Created user:', userId);
  }

  const { error: upsertErr } = await admin.from('client_accounts').upsert(
    {
      id: userId,
      email: EMAIL,
      first_name: FIRST_NAME || null,
      last_name: LAST_NAME || null,
      full_name: FULL_NAME,
      balance_cents: BALANCE_CENTS,
      currency: 'usd',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );

  if (upsertErr) throw upsertErr;

  console.log('Account ready:', EMAIL, '— balance $' + (BALANCE_CENTS / 100).toFixed(2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
