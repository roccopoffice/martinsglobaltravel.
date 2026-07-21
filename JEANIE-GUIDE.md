# Martins Global Travels — Staff Dashboard Guide (for Jeanie)

Hi Jeanie — this guide walks you through your **employee dashboard** step by step. No coding, no Supabase, no technical setup. Bookmark this page and use it whenever you add a client or check a balance.

---

## What you have (two links)

| Who uses it | Link | What it does |
|-------------|------|----------------|
| **You (staff)** | **https://martinsglobaltravel.com/admin.html** | Add clients, set balances, write private notes |
| **Your travelers (clients)** | **https://martinsglobaltravel.com/portal.html** | Sign in, see what they owe, pay by card |

**Important:** Keep **admin.html** private — bookmark it on your computer or phone. Do **not** put it on the public website or social media. Only you and trusted staff should have the link and the staff password.

Clients find the portal from the main site menu: **Client Portal**.

---

## Part 1 — Signing in to your dashboard

1. Open **https://martinsglobaltravel.com/admin.html**
2. You will see **“Manage clients”** and a box that says **Staff sign in**
3. Enter your **staff password** (the one your web person set up for you — only for this page, not your email password)
4. Click **Continue**

You stay signed in until you close the browser tab or click **Sign out** at the bottom.

If it says the password is wrong, double-check caps lock or contact your web person to confirm the staff password in Netlify.

---

## Part 2 — Your main tabs

After you sign in, you see tabs at the top:

| Tab | What it’s for |
|-----|----------------|
| **Add client** | Create a new traveler login + set what they owe |
| **Client list** | See everyone, write notes, quick actions |
| **Update balance** | Change how much one person owes |
| **Analytics** | Website visitors, page views, and portal payment stats |

Green or gold messages at the top tell you if something saved successfully. Red messages mean something needs to be fixed (wrong email, missing field, etc.).

---

## Part 3 — Add a new client (step by step)

Use this when someone new needs portal access.

1. Click the **Add client** tab (usually already open after login)
2. Fill in every field:

| Field | What to enter |
|-------|----------------|
| **First name** | Client’s first name |
| **Last name** | Client’s last name |
| **Email** | Their login email (they will use this every time) |
| **Temporary password** | A password **you** make up (example: `Welcome2026` or something unique) |
| **Balance owed ($)** | How much they owe in **dollars** — example: `2500` or `2500.00` for $2,500 |

3. Click **Save client**
4. You should see a success message with their name

### What to tell the client

Send them something like this (by email or text):

> Hi [Name],  
> You can view your travel balance and pay online here:  
> **https://martinsglobaltravel.com/portal.html**  
>  
> **Email:** [their email]  
> **Temporary password:** [the password you set]  
>  
> The first time you sign in, the site will ask you to **create your own new password**. After that, use your new password going forward.  
>  
> If you forget your password, click **Forgot password?** on the login page.

### About temporary passwords

- The password you set is **one-time / temporary**
- The **first time** they log in, a popup forces them to pick a **new password**
- If you **update** their password in Add client (same email again), they will be asked to change it again on next login

---

## Part 4 — Client list (see everyone + notes)

1. Click the **Client list** tab
2. You see a table: **Name**, **Email**, **Balance owed**
3. The top right shows how many clients you have and a **Refresh** button (use after payments or changes)

### Open a client (dropdown)

1. **Click anywhere on their row** (name, email, or balance)
2. The row expands downward with:
   - **Staff notes** — a text box for **your eyes only** (clients never see this)
   - **Save notes** — saves trip details, reminders, preferences, etc.
   - **Update balance** — jumps you to change what they owe (email filled in)
   - **Remove client** — permanently deletes their login (asks you to confirm first)

3. Click the same row again to **collapse** it

### Remove someone from the portal

1. **Client list** → click the client → **Remove client**
2. Confirm the popup — this **cannot be undone**
3. They lose portal access immediately (login + balance record removed)

### Example notes you might write

- “Honeymoon — Maldives, June 2026”
- “Called 3/15 — paying half next week”
- “Prefers email only”

### After a client pays online

1. Go to **Client list**
2. Click **Refresh**
3. Their **Balance owed** should be **$0.00** (or lower if they paid part — full balance is paid in one checkout)

---

## Part 5 — Update balance only

Use this when someone’s amount owed changes (new invoice, partial plan, correction).

**Option A — from Client list**

1. **Client list** → click the client → **Update balance** in the dropdown

**Option B — Update balance tab**

1. Click **Update balance** tab
2. Enter **Client email**
3. Enter **New balance owed ($)** in dollars — example: `1500` for $1,500
4. Click **Update balance**

The client will see the new amount the next time they open the portal (or refresh the page).

---

## Part 6 — What your clients see (so you know)

You don’t use this page for daily work, but it helps to know what they experience:

1. They go to **portal.html** (or **Client Portal** on the main site)
2. **Sign in** with email + password
3. **First login:** popup — **“Create your password”** (required)
4. They see:
   - A greeting with their name
   - **Balance owed** (only their balance — nobody else’s)
   - **Pay balance with card** (secure Stripe checkout)
5. **Forgot password?** on login — they get an email reset link
6. **Change password** — button on their dashboard after login

They **cannot** see your staff notes or other clients.

---

## Part 7 — Typical day-to-day workflow

### New booking / new client owes money

1. **admin.html** → **Add client**
2. Send them portal link + email + temporary password
3. They log in, set their own password, see balance, pay when ready

### Client paid you outside the portal (check, wire, etc.)

1. **admin.html** → **Update balance** → set balance to **0** or the new remaining amount

### Client paid on the portal with a card

1. **Client list** → **Refresh** → confirm balance updated
2. Optional: add a note (“Paid in full 3/20 via portal”)

### You need to remember something about a trip

1. **Client list** → click client → write in **Staff notes** → **Save notes**

### Client forgot password

- Tell them: **Forgot password?** on **portal.html**, enter email, check inbox
- Or: **Add client** tab, same email + **new temporary password** → they must change it on next login

---

## Part 8 — Sign out

When you’re done on a shared computer:

1. Scroll to the bottom
2. Click **Sign out**

---

## Quick reference card (print or save)

```
STAFF DASHBOARD
https://martinsglobaltravel.com/admin.html
Password: [your staff password — keep private]

CLIENT PORTAL (give to travelers)
https://martinsglobaltravel.com/portal.html

ADD CLIENT → name, email, temp password, balance ($)
CLIENT LIST → click row → notes + refresh balances
UPDATE BALANCE → email + new amount ($)
ANALYTICS → live visitors, page views, portal payments

Support: Jeanie@MartinsGlobalTravels.com · (508) 232-3003
```

---

## Analytics tab (website + portal stats)

1. Click **Analytics** at the top
2. Click **Refresh** for the latest numbers

### Website traffic (top section)

| Stat | What it means |
|------|----------------|
| **On site right now** | People browsing the website at this moment (green dot = live) |
| **Page views today** | How many pages were opened today |
| **Visitors today** | Unique people who visited today |
| **30-day stats** | Page views, visitors, sessions, bounce rate, average visit time |
| **Top pages** | Which pages get the most views |
| **How people found you** | Google, social media, direct link, etc. |

If analytics is not connected yet, your web person completes a one-time Google Analytics setup (**SETUP-ANALYTICS.md**). Enquiry forms are still under **Netlify → Forms** (link on that tab).

### Portal summary (bottom section)

Client counts, total owed, money collected through the portal, and recent card payments.

---

## If something doesn’t work

| Problem | What to try |
|---------|-------------|
| Can’t sign in to admin | Check staff password; contact web person |
| Client can’t sign in | Confirm email/password; try new temp password in Add client |
| Balance wrong after card pay | Client list → Refresh; wait 1 minute; contact web person if still wrong |
| Notes won’t save | Contact web person (database column may need one-time setup) |
| Client didn’t get reset email | Check spam; confirm correct email on account |

---

## Need technical help?

Contact whoever manages the website / Netlify / Stripe setup. You do **not** need to log into Supabase or Stripe for normal daily client management — **admin.html** is your only tool for that.

---

*Martins Global Travels — Client manager (staff only)*
