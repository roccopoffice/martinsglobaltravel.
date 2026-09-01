import { AGENCY_USER_ID, isAgencyUserId } from './send-money.js';

export async function applyCheckoutSession(db, session) {
  if (!session?.id) return { ok: false, error: 'Invalid session' };
  if (session.payment_status && session.payment_status !== 'paid') {
    return { ok: false, error: 'Payment not completed yet' };
  }

  const bookingType = session.metadata?.booking_type;
  if (bookingType === 'flight' || bookingType === 'ticket') {
    const r = await db
      .prepare(
        `UPDATE travel_bookings SET status = 'paid', updated_at = datetime('now') WHERE stripe_session_id = ?`
      )
      .bind(session.id)
      .run();
    if (!r.success) return { ok: false, error: 'Booking update failed' };
    return { ok: true, bookingType, sessionId: session.id };
  }

  let userId = session.metadata?.user_id || null;
  let amountCents = parseInt(session.metadata?.amount_cents || '0', 10);
  if (!amountCents && session.amount_total) amountCents = session.amount_total;
  if (bookingType === 'send_money_agency') userId = AGENCY_USER_ID;

  if (!userId) {
    const email = (session.customer_details?.email || session.customer_email || '')
      .trim()
      .toLowerCase();
    if (email) {
      const row = await db
        .prepare('SELECT id FROM client_accounts WHERE email = ? LIMIT 1')
        .bind(email)
        .first();
      userId = row?.id || null;
    }
  }

  if (!userId || amountCents <= 0) {
    return { ok: false, error: 'Could not match payment to a client account' };
  }

  const existing = await db
    .prepare('SELECT id FROM payments WHERE stripe_checkout_session_id = ? LIMIT 1')
    .bind(session.id)
    .first();
  if (existing) return { ok: true, userId, amountCents, duplicate: true };

  const paymentId = crypto.randomUUID();
  const sendToken = session.metadata?.send_token || null;
  const isAgency = isAgencyUserId(userId) || bookingType === 'send_money_agency';
  const source =
    sendToken || bookingType === 'send_money' || bookingType === 'send_money_agency'
      ? 'send_money'
      : 'portal';
  const stmts = [
    db
      .prepare(
        `INSERT INTO payments (id, user_id, amount_cents, stripe_checkout_session_id, status, source, send_token)
         VALUES (?, ?, ?, ?, 'completed', ?, ?)`
      )
      .bind(paymentId, userId, amountCents, session.id, source, sendToken),
  ];
  if (!isAgency) {
    stmts.push(
      db
        .prepare(
          `UPDATE client_accounts
           SET balance_cents = CASE WHEN balance_cents - ? < 0 THEN 0 ELSE balance_cents - ? END,
               updated_at = datetime('now')
           WHERE id = ?`
        )
        .bind(amountCents, amountCents, userId)
    );
  }
  await db.batch(stmts);

  return { ok: true, userId, amountCents, destination: isAgency ? 'agency' : 'client' };
}

export function sessionBelongsToUser(session, userId, userEmail) {
  if (session.metadata?.user_id === userId) return true;
  const sessionEmail = (session.customer_details?.email || session.customer_email || '')
    .trim()
    .toLowerCase();
  const email = (userEmail || '').trim().toLowerCase();
  return sessionEmail && email && sessionEmail === email;
}
