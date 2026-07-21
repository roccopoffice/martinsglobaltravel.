# Book Travel setup (flights + event tickets)

**Page:** `https://martinsglobaltravel.com/book.html`

This gives you an Expedia-style search and checkout on your site. Live flight prices come from **Amadeus**. Payments go through **Stripe**. Bookings are stored in **Supabase** for Jeanie to fulfill.

---

## What you get

| Feature | How it works |
|---------|----------------|
| **Flight search** | Round-trip / one-way, airport autocomplete (9,000+ airports in-memory), cabin class, sort by price |
| **Buy flight** | Customer pays via Stripe → booking saved → Jeanie confirms ticket |
| **Event packages** | Three ticket packages with Stripe deposit |
| **Nav link** | “Book Travel” in main menu |

---

## 1. Supabase — booking records

Run in **SQL Editor**:

`supabase/migration-travel-bookings.sql`

This creates the `travel_bookings` table. Jeanie can view paid bookings under **Table Editor → travel_bookings**.

---

## 2. Amadeus — live flight search (free test tier)

1. Go to **[developers.amadeus.com](https://developers.amadeus.com)** → Create account.
2. **My Self-Service Workspace** → Create app.
3. Copy **API Key** and **API Secret** (test environment).
4. In **Netlify → Environment variables**, add:

| Variable | Value |
|----------|--------|
| `AMADEUS_API_KEY` | Your API Key |
| `AMADEUS_API_SECRET` | Your API Secret |
| `AMADEUS_ENV` | `test` (use `production` when Amadeus approves you for live) |

5. Redeploy the site.

**Test search example:** BOS → MIA, date at least 2 weeks out.

Amadeus test mode returns real flight data but **test bookings only** until you move to production and complete their partner process.

---

## 3. Stripe — already set up?

Flight and ticket checkouts use the same Stripe account as the client portal.

Ensure these are in Netlify:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

The webhook already handles `booking_type: flight` and `booking_type: ticket` in payment metadata.

---

## 4. Deploy checklist

- [ ] `book.html` and `js/book.js` deployed
- [ ] `migration-travel-bookings.sql` run in Supabase
- [ ] Amadeus keys in Netlify
- [ ] Stripe keys in Netlify
- [ ] Site redeployed
- [ ] Test flight search on live URL (not local file open)
- [ ] Test Stripe checkout with card `4242 4242 4242 4242`

---

## 5. After a customer pays

1. **Stripe Dashboard** → Payments — see the charge.
2. **Supabase** → `travel_bookings` — row status becomes `paid`.
3. Jeanie books the actual flight/tickets and emails the client.

---

## Important — vs Expedia

Expedia runs on billion-dollar systems (global inventory, instant ticketing, hotels, cars, loyalty, etc.). Your site now has:

- ✅ Search UI like Expedia  
- ✅ Live flight prices (Amadeus)  
- ✅ Secure card payment (Stripe)  
- ✅ Event package checkout  
- ⏳ **Jeanie confirms** final ticketing (standard for licensed agencies until full GDS booking API is live)

To get **instant automated ticketing** like Expedia, the next step would be a certified booking API (Amadeus Order Management, Duffel, or Sabre) — that requires Amadeus production approval and additional development.

---

## Airport autocomplete database

The book page loads **`assets/airports.json`** (~9,000 IATA airports) into memory for instant search — city, airport name, code, US state (e.g. type **Ohio** to see all Ohio airports), with fuzzy matching for typos.

To refresh after updating airport data:

```bash
curl -L -o scripts/airports.csv https://davidmegginson.github.io/ourairports-data/airports.csv
py scripts/generate-airports-json.py
```

Then redeploy so `assets/airports.json` is published.

---

## Updating event package prices

Edit `netlify/functions/create-ticket-request.js` → `PACKAGES` object (amounts in cents).

Also update the prices shown on `book.html` to match.
