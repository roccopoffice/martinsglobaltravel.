# Martins Global Travels

Live site: https://martinsglobaltravel.com

Cloudflare Worker + D1 + Stripe. Staff guide: [JEANIE-GUIDE.md](JEANIE-GUIDE.md).

## Pages

| URL | Who |
|-----|-----|
| `/` | Public site |
| `/gift-cards` | Buy e-gift cards |
| `/portal` | Client login, pay, wallet, travel credits |
| `/admin` | Staff only — keep this link private |
| `/send/:token` | Pay a send-money link |

Book Travel (`/book`) exists but is hidden from the public menu until Amadeus is connected.

## Deploy

```bash
npm install
npx wrangler deploy --keep-vars
```

Secrets stay in Cloudflare. Never put Stripe keys in HTML or `js/`.
