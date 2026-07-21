const { createClient } = require('@supabase/supabase-js');
const { respond, parseBody, verifyAdmin, headers } = require('./admin-lib');
const { fetchSiteAnalytics } = require('./site-analytics-lib');

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

  const { data: accounts, error: accErr } = await admin
    .from('client_accounts')
    .select('id, balance_cents, email, first_name, last_name, full_name, updated_at');

  if (accErr) {
    return respond(500, { error: 'Could not load client data.' });
  }

  const rows = accounts || [];
  let totalOwedCents = 0;
  let clientsWithBalance = 0;

  for (const row of rows) {
    const bal = row.balance_cents || 0;
    if (bal > 0) {
      totalOwedCents += bal;
      clientsWithBalance += 1;
    }
  }

  const { data: payments, error: payErr } = await admin
    .from('payments')
    .select('amount_cents, created_at, user_id, status')
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(50);

  if (payErr) {
    return respond(500, { error: 'Could not load payment history.' });
  }

  const payRows = payments || [];
  let totalCollectedCents = 0;
  for (const p of payRows) {
    totalCollectedCents += p.amount_cents || 0;
  }

  const accountById = Object.fromEntries(rows.map((r) => [r.id, r]));
  const recentPayments = payRows.slice(0, 10).map((p) => {
    const acc = accountById[p.user_id];
    const name = acc
      ? [acc.first_name, acc.last_name].filter(Boolean).join(' ').trim() ||
        acc.full_name ||
        acc.email
      : 'Client';
    return {
      name,
      email: acc?.email || '',
      amountDollars: ((p.amount_cents || 0) / 100).toFixed(2),
      date: p.created_at,
    };
  });

  const site = await fetchSiteAnalytics();

  return respond(200, {
    ok: true,
    site,
    portal: {
      totalClients: rows.length,
      clientsWithBalance,
      totalOwedDollars: (totalOwedCents / 100).toFixed(2),
      completedPayments: payRows.length,
      totalCollectedDollars: (totalCollectedCents / 100).toFixed(2),
      recentPayments,
    },
    links: {
      netlify: 'https://app.netlify.com',
      enquiryFormHint: 'Netlify → your site → Forms → enquiry',
      site: 'https://martinsglobaltravel.com',
      portal: 'https://martinsglobaltravel.com/portal.html',
    },
  });
};
