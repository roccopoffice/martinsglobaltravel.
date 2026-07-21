# Stripe setup — client portal payments

Clients click **Pay balance with card** on `portal.html`. Stripe charges them; the balance in Supabase goes down automatically.

**Test first**, then switch to **Live** when Jeanie is ready for real money.

---

## Part A — Create Stripe account

1. Go to [dashboard.stripe.com](https://dashboard.stripe.com) and sign up or log in.
2. Complete business profile (name, bank for payouts) when prompted.
3. Leave **Test mode** ON (toggle top-right) while testing.

---

## Part B — API secret key → Netlify

1. Stripe → **Developers** → **API keys**.
2. Under **Standard keys**, copy the **Secret key** (`sk_test_...` in test mode).
3. Netlify → your site → **Site configuration** → **Environment variables** → **Add**:

| Key | Value | Secret? |
|-----|--------|---------|
| `STRIPE_SECRET_KEY` | `sk_test_...` (or `sk_live_...` later) | **Yes** |

---

## Part C — Webhook → Netlify

The webhook tells your site “payment succeeded” so the balance updates.

1. Stripe → **Developers** → **Webhooks** → **Add endpoint**.
2. **Endpoint URL** (copy exactly):

   `https://martinsglobaltravel.com/.netlify/functions/stripe-webhook`

3. **Select events** → choose **`checkout.session.completed`** only.
4. Click **Add endpoint**.
5. On that endpoint page, open **Signing secret** → **Reveal** → copy (`whsec_...`).
6. Netlify → **Environment variables** → **Add**:

| Key | Value | Secret? |
|-----|--------|---------|
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | **Yes** |

**Test mode and Live mode each have their own webhook and `whsec_` secret.** When you go live, repeat Part C in Live mode and update Netlify with the live secret + live secret key.

---

## Part D — Redeploy Netlify

**Deploys** → **Trigger deploy** → **Deploy site**.

Your Netlify env vars should include all of these for payments:

| Variable | Purpose |
|----------|---------|
| `SUPABASE_URL` | Database |
| `SUPABASE_ANON_KEY` | Portal login (build) |
| `SUPABASE_SERVICE_ROLE_KEY` | Payments update balance |
| `STRIPE_SECRET_KEY` | Start Stripe Checkout |
| `STRIPE_WEBHOOK_SECRET` | Verify payment completed |
| `ADMIN_PORTAL_PASSWORD` | Jeanie admin page |

---

## Part E — Test payment

1. Jeanie adds a test client in **admin.html** with a small balance (e.g. `$10`).
2. Open **portal.html** → sign in as that client.
3. Click **Pay balance with card**.
4. On Stripe Checkout use test card:

   | Field | Value |
   |-------|--------|
   | Card | `4242 4242 4242 4242` |
   | Expiry | Any future date |
   | CVC | Any 3 digits |
   | ZIP | Any 5 digits |

5. After success, balance on portal should drop (may take a few seconds).
6. Stripe → **Webhooks** → your endpoint → **Event deliveries** should show **200** for `checkout.session.completed`.

---

## Part F — Go live (real money)

1. Stripe → turn **Test mode** OFF (Live mode).
2. **Developers** → **API keys** → copy **Live** secret key (`sk_live_...`).
3. **Developers** → **Webhooks** → add **new** live endpoint (same URL) → new `whsec_...`.
4. Netlify → update `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` to **live** values.
5. Redeploy.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| “Card payments are not set up yet” | Add `STRIPE_SECRET_KEY` in Netlify, redeploy |
| Payment works but balance unchanged | Check `STRIPE_WEBHOOK_SECRET`; webhook events must be 200 |
| Webhook 400 signature error | Wrong `whsec_` (test vs live mismatch) |
| Balance still old after pay | Refresh portal; check Supabase `client_accounts` |

---

## Security

- Never put `sk_` or `whsec_` keys in the website, Git, or chat.
- Only **Netlify environment variables**.
