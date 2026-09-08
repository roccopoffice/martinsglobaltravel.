-- Private send-money links: Stripe payments toward a client's trip balance.

CREATE TABLE IF NOT EXISTS send_money_links (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES client_accounts (id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS send_money_links_user_idx ON send_money_links (user_id);

ALTER TABLE payments ADD COLUMN source TEXT NOT NULL DEFAULT 'portal';
ALTER TABLE payments ADD COLUMN send_token TEXT;

CREATE INDEX IF NOT EXISTS payments_send_token_idx ON payments (send_token);
