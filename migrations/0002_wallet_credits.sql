-- Wallet credits: money Martins Global Travels gives to clients,
-- withdrawable to their bank via Stripe Connect.

ALTER TABLE client_accounts ADD COLUMN credit_cents INTEGER NOT NULL DEFAULT 0;
ALTER TABLE client_accounts ADD COLUMN stripe_connect_id TEXT;

CREATE TABLE IF NOT EXISTS credit_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES client_accounts (id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('grant', 'withdrawal', 'adjustment')),
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  status TEXT NOT NULL DEFAULT 'completed',
  note TEXT,
  stripe_transfer_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS credit_transactions_user_idx ON credit_transactions (user_id, created_at);
