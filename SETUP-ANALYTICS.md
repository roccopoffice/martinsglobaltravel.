# Website analytics (Google Analytics 4)

This connects **live visitors**, **page views**, **top pages**, and **traffic sources** to the **Analytics** tab in `admin.html`.

Jeanie only uses the admin dashboard. A web person does this one-time setup in Google Cloud + Netlify.

---

## What you need

| Netlify variable | Purpose |
|------------------|---------|
| `GA4_MEASUREMENT_ID` | Public ID like `G-XXXXXXXXXX` — loads tracking on the site |
| `GA4_PROPERTY_ID` | Numeric property ID (not the `G-` code) — for the admin API |
| `GA4_SERVICE_ACCOUNT_JSON` | Full JSON key for a Google service account (secret) |

---

## Step 1 — Create a GA4 property

1. Go to [Google Analytics](https://analytics.google.com)
2. **Admin** (gear) → **Create** → **Property**
3. Name: `Martins Global Travels`
4. Time zone: your business timezone
5. Create a **Web** data stream for `martinsglobaltravel.com`
6. Copy the **Measurement ID** (`G-…`) → save as `GA4_MEASUREMENT_ID`
7. In **Admin → Property settings**, copy the **Property ID** (digits only, e.g. `512345678`) → save as `GA4_PROPERTY_ID`

---

## Step 2 — Google Cloud service account

1. Open [Google Cloud Console](https://console.cloud.google.com)
2. Create or pick a project (e.g. `martins-global-travels`)
3. **APIs & Services → Library** → enable **Google Analytics Data API**
4. **IAM & Admin → Service Accounts → Create**
   - Name: `martins-ga4-reader`
   - Role: none required at project level
5. Open the new service account → **Keys → Add key → JSON**
6. Download the JSON file — you will paste its **entire contents** into Netlify as `GA4_SERVICE_ACCOUNT_JSON` (one line is fine)

---

## Step 3 — Give the service account access in GA4

1. In Google Analytics → **Admin → Property access management**
2. **+** → **Add users**
3. Email: the service account address from the JSON (`something@project-id.iam.gserviceaccount.com`)
4. Role: **Viewer**
5. Save

---

## Step 4 — Netlify environment variables

In **Netlify → Site → Environment variables**, add:

```
GA4_MEASUREMENT_ID=G-XXXXXXXXXX
GA4_PROPERTY_ID=512345678
GA4_SERVICE_ACCOUNT_JSON={"type":"service_account",...entire json...}
```

Redeploy the site (Deploys → Trigger deploy).

The build writes `js/analytics-config.js` from `GA4_MEASUREMENT_ID`. Tracking runs on the main site and client portal (not the staff admin page).

---

## Step 5 — Verify

1. Visit [martinsglobaltravel.com](https://martinsglobaltravel.com) a few times
2. In GA4 → **Reports → Realtime** — you should see activity within a few minutes
3. Sign in to **admin.html → Analytics** — you should see **On site right now**, page views, and 30-day stats

If the admin tab says analytics is not connected, double-check all three env vars and that the service account has **Viewer** on the property.

---

## Privacy note

GA4 uses cookies/identifiers. Add a short privacy note on the site if your lawyer or insurer requires it. The tracking script uses IP anonymization where supported.
