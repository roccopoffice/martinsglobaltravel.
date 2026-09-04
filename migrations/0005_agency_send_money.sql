-- Internal agency account so people can send money to Martins Global Travels
-- (not toward a client trip). This is not a portal login.

INSERT OR IGNORE INTO users (id, email, password_hash, must_change_password)
VALUES ('agency', 'agency@internal.martinsglobaltravels', 'not-a-login', 0);

INSERT OR IGNORE INTO client_accounts (
  id, email, first_name, last_name, full_name, balance_cents, currency
) VALUES (
  'agency',
  'agency@internal.martinsglobaltravels',
  'Martins',
  'Global Travels',
  'Martins Global Travels',
  0,
  'usd'
);
