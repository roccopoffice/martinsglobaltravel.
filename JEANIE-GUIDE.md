# Staff dashboard — Jeanie

Bookmark **https://martinsglobaltravel.com/admin.html** on your computer or phone. Do not post this link on the public site or social media.

Clients use **https://martinsglobaltravel.com/portal** to sign in and pay.

## Sign in

1. Open the admin page.
2. Enter the staff password (Cloudflare Worker secret — not your email password).
3. Click **Continue**. You stay signed in until you close the tab or click **Sign out**.

If the password is wrong, check caps lock or ask whoever manages the website to confirm `ADMIN_PORTAL_PASSWORD`.

## Tabs

| Tab | What it does |
|-----|----------------|
| **Add client** | Create a traveler login and the amount they owe |
| **Client list** | Everyone, private notes, quick actions |
| **Update balance** | Change what one person owes |
| **Send money** | Add withdrawable wallet credit (separate from trip balance) |
| **Agency link** | A public pay link into Martins Global Travels |
| **Gift cards** | Search cards, issue promo credit, disable, policy |
| **Enquiries** | Website contact form and newsletter signups |
| **Analytics** | Portal payment totals (website charts are in Google Analytics) |

Green or gold messages mean something saved. Red means something needs a fix (wrong email, missing field).

## Add a client

1. **Add client** → first name, last name, email, temporary password, balance owed.
2. **Save client**.
3. Text or email them the portal link plus that temporary password. They must change it on first login.

If the email already exists, this updates their password and balance.

## Password resets

There is no self-serve reset email. If a client forgets their password, set a new temporary password on **Add client** (same email) and send it to them.

## Enquiries

New website forms land on the **Enquiries** tab and also email **jeanie@martinsglobaltravels.com**. Reply from your inbox as usual.

## Gift cards

Purchased cards appear after Stripe confirms payment. You can issue promotional credit here without a card charge. Gift-card credit is separate from withdrawable wallet credit.

## If something looks wrong

Contact whoever manages Cloudflare and Stripe. You do not need to log into those accounts for daily client work — **admin.html** is the tool.
