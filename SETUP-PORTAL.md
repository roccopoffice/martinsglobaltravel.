# Client portal — production setup (Supabase + Stripe)

Demo mode has been removed. Complete these steps to go live.

**Portal URL:** `https://martinsglobaltravel.com/portal.html`

---

## Step 1 — Supabase project

1. Create a project at [supabase.com](https://supabase.com) (or use your existing one).
2. **SQL Editor** → paste and run **`supabase/schema.sql`**.
3. **Authentication → Providers** → enable **Email** (password).
4. **Authentication → URL configuration** → Site URL:
   - `https://martinsglobaltravel.com`
   - Redirect URLs: `https://martinsglobaltravel.com/portal.html`
5. **Project Settings → API** — copy:
   - **Project URL**
   - **anon public** key → `js/config.js`
   - **service_role** key → Netlify env only (never in the website)

---

## Step 2 — `js/config.js`

Edit `js/config.js` with your real Supabase values:

```js
window.MGT_CONFIG = {
  SUPABASE_URL: 'https://xxxxxxxx.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
};
```

Redeploy to Netlify with this file included.

---

## Step 3 — Stripe

1. [dashboard.stripe.com](https://dashboard.stripe.com) — complete business setup.
2. Start in **Test mode** to verify, then switch to **Live**.
3. **Developers → API keys** → **Secret key** → Netlify env `STRIPE_SECRET_KEY`.
4. **Developers → Webhooks → Add endpoint**:
   - **Endpoint URL:** `https://martinsglobaltravel.com/.netlify/functions/stripe-webhook`
   - **Event:** `checkout.session.completed`
   - Copy **Signing secret** → Netlify env `STRIPE_WEBHOOK_SECRET`

Repeat webhook setup for **Live mode** when you go live (separate `whsec_` secret).

---

## Step 4 — Netlify environment variables

**Site settings → Environment variables** (all scopes: Production):

| Name | Where to get it |
|------|------------------|
| `SUPABASE_URL` | Supabase → API → Project URL |
| `SUPABASE_ANON_KEY` | Supabase → API → anon public (build creates `js/config.js`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → API → service_role |
| `STRIPE_SECRET_KEY` | Stripe → Secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Webhook signing secret |

Save, then **Deploys → Trigger deploy** (clear cache if needed).

Netlify installs `package.json` dependencies automatically for functions.

---

## Easy client setup (no SQL) — Jeanie

Use **`admin.html`** on the live site (see **`JEANIE-GUIDE.md`**).

1. In Netlify, add **`ADMIN_PORTAL_PASSWORD`** (staff-only password for admin.html).
2. Jeanie opens `https://martinsglobaltravel.com/admin.html`, signs in, fills the form (name, email, password, balance in dollars).
3. Clients use **`portal.html`** with that email and password.

---

## Step 5 — Add client logins (manual / SQL)

For each traveler you store **first name, last name, email, password, and balance owed**.

**Clients sign in with email + password only** (you choose the password when you create them).

1. **Supabase → Authentication → Users → Add user**
   - **Email** = their login email
   - **Password** = password you give them (they use this on the portal)
   - **Auto Confirm User** = on
2. Copy the user **UUID**.
3. **SQL Editor** (if you already ran `schema.sql` before name columns, run `supabase/migration-add-client-names.sql` once):

```sql
insert into public.client_accounts (id, email, first_name, last_name, balance_cents)
values (
  'USER_UUID_HERE',
  'client@example.com',
  'Jane',
  'Smith',
  250000   -- $2,500.00 (always in cents)
);
```

**Update balance:**

```sql
update public.client_accounts
set balance_cents = 150000, updated_at = now()
where email = 'client@example.com';
```

**Optional — seed script** (service role in terminal):

```bash
npm install
set SUPABASE_URL=https://xxx.supabase.co
set SUPABASE_SERVICE_ROLE_KEY=eyJ...
set SEED_EMAIL=client@example.com
set SEED_PASSWORD=choose-a-strong-password
set SEED_NAME=Client Name
set SEED_BALANCE_CENTS=250000
node scripts/seed-test-user.js
```

---

## Step 6 — Test before announcing

- [ ] `js/config.js` has real Supabase keys (not placeholders)
- [ ] Netlify env vars set and site redeployed
- [ ] Stripe webhook shows successful test events
- [ ] Client can sign in and sees correct balance only
- [ ] **Pay balance** opens Stripe Checkout (test card `4242 4242 4242 4242`)
- [ ] After payment, balance drops in Supabase (`client_accounts.balance_cents`)
- [ ] Stripe **Live** keys + live webhook when ready for real money

---

## Security

- Clients only **read** their own balance (Supabase RLS).
- Balances change via Jeanie in SQL or after Stripe webhook payment.
- Never commit `service_role`, Stripe secrets, or client passwords to Git.
