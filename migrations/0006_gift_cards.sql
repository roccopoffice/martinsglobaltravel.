-- E-gift cards / travel credits (internal ledger — not Stripe money)
-- Separate from client_accounts.credit_cents (withdrawable wallet).

CREATE TABLE IF NOT EXISTS gift_card_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  min_amount_cents INTEGER NOT NULL DEFAULT 2500,
  max_amount_cents INTEGER NOT NULL DEFAULT 1000000,
  allow_custom_amount INTEGER NOT NULL DEFAULT 1,
  purchased_expires_days INTEGER,
  promotional_expires_days INTEGER,
  allow_combine INTEGER NOT NULL DEFAULT 1,
  transferable INTEGER NOT NULL DEFAULT 1,
  currency TEXT NOT NULL DEFAULT 'usd',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO gift_card_settings (id) VALUES (1);

CREATE TABLE IF NOT EXISTS gift_cards (
  id TEXT PRIMARY KEY,
  code_hash TEXT UNIQUE,
  code_encrypted TEXT,
  code_last_four TEXT,
  type TEXT NOT NULL CHECK (type IN ('PURCHASED_GIFT_CARD', 'PROMOTIONAL_CREDIT')),
  original_amount_cents INTEGER NOT NULL CHECK (original_amount_cents > 0),
  current_balance_cents INTEGER NOT NULL CHECK (current_balance_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'scheduled', 'active', 'disabled', 'exhausted', 'expired')),
  recipient_name TEXT,
  recipient_email TEXT,
  purchaser_name TEXT,
  purchaser_email TEXT,
  gift_message TEXT,
  issued_to_customer_id TEXT,
  payment_id TEXT,
  stripe_session_id TEXT UNIQUE,
  issued_by_admin TEXT,
  source TEXT,
  scheduled_delivery_at TEXT,
  delivered_at TEXT,
  email_status TEXT,
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS gift_cards_recipient_email_idx ON gift_cards (recipient_email);
CREATE INDEX IF NOT EXISTS gift_cards_status_idx ON gift_cards (status);
CREATE INDEX IF NOT EXISTS gift_cards_issued_to_idx ON gift_cards (issued_to_customer_id);
CREATE INDEX IF NOT EXISTS gift_cards_delivery_idx ON gift_cards (status, scheduled_delivery_at);

CREATE TABLE IF NOT EXISTS gift_card_transactions (
  id TEXT PRIMARY KEY,
  gift_card_id TEXT NOT NULL REFERENCES gift_cards (id),
  customer_id TEXT,
  booking_id TEXT,
  application_id TEXT,
  payment_id TEXT,
  transaction_type TEXT NOT NULL
    CHECK (transaction_type IN (
      'issue', 'redeem', 'refund_restore', 'admin_adjust', 'expire', 'cancel'
    )),
  amount_cents INTEGER NOT NULL,
  balance_before_cents INTEGER NOT NULL,
  balance_after_cents INTEGER NOT NULL,
  reason TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS gift_card_tx_card_idx ON gift_card_transactions (gift_card_id, created_at);
CREATE INDEX IF NOT EXISTS gift_card_tx_customer_idx ON gift_card_transactions (customer_id, created_at);

CREATE TABLE IF NOT EXISTS gift_card_applications (
  id TEXT PRIMARY KEY,
  gift_card_id TEXT NOT NULL REFERENCES gift_cards (id),
  customer_id TEXT NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  trip_balance_before_cents INTEGER NOT NULL,
  trip_balance_after_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'applied' CHECK (status IN ('applied', 'restored')),
  ledger_tx_id TEXT,
  restore_tx_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  restored_at TEXT
);

CREATE INDEX IF NOT EXISTS gift_card_apps_customer_idx ON gift_card_applications (customer_id, created_at);
CREATE INDEX IF NOT EXISTS gift_card_apps_card_idx ON gift_card_applications (gift_card_id);

CREATE TABLE IF NOT EXISTS gift_card_redemption_attempts (
  id TEXT PRIMARY KEY,
  code_last_four TEXT,
  ip TEXT,
  customer_id TEXT,
  success INTEGER NOT NULL DEFAULT 0,
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS gift_card_attempts_ip_idx
  ON gift_card_redemption_attempts (ip, created_at);
CREATE INDEX IF NOT EXISTS gift_card_attempts_user_idx
  ON gift_card_redemption_attempts (customer_id, created_at);
