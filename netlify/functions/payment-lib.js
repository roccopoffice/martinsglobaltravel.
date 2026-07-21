/**
 * Shared logic: apply a successful Stripe Checkout session to Supabase.
 */
async function applyCheckoutSession(supabaseAdmin, session) {
  if (!session?.id) {
    return { ok: false, error: 'Invalid session' };
  }

  if (session.payment_status && session.payment_status !== 'paid') {
    return { ok: false, error: 'Payment not completed yet' };
  }

  const bookingType = session.metadata?.booking_type;

  if (bookingType === 'flight' || bookingType === 'ticket') {
    const { error } = await supabaseAdmin
      .from('travel_bookings')
      .update({ status: 'paid', updated_at: new Date().toISOString() })
      .eq('stripe_session_id', session.id);

    if (error) {
      console.error('travel_bookings update failed', error);
      return { ok: false, error: error.message || 'Booking update failed' };
    }

    return { ok: true, bookingType, sessionId: session.id };
  }

  let userId = session.metadata?.user_id || null;
  let amountCents = parseInt(session.metadata?.amount_cents || '0', 10);
  if (!amountCents && session.amount_total) {
    amountCents = session.amount_total;
  }

  if (!userId) {
    const email = (session.customer_details?.email || session.customer_email || '')
      .trim()
      .toLowerCase();
    if (email) {
      const { data } = await supabaseAdmin
        .from('client_accounts')
        .select('id')
        .eq('email', email)
        .maybeSingle();
      userId = data?.id || null;
    }
  }

  if (!userId || amountCents <= 0) {
    console.error('applyCheckoutSession missing data', {
      sessionId: session.id,
      userId,
      amountCents,
      metadata: session.metadata,
    });
    return { ok: false, error: 'Could not match payment to a client account' };
  }

  const { error } = await supabaseAdmin.rpc('apply_payment', {
    p_user_id: userId,
    p_amount_cents: amountCents,
    p_session_id: session.id,
  });

  if (error) {
    console.error('apply_payment rpc failed', error);
    return { ok: false, error: error.message || 'Database update failed' };
  }

  return { ok: true, userId, amountCents };
}

function sessionBelongsToUser(session, userId, userEmail) {
  if (session.metadata?.user_id === userId) return true;
  const sessionEmail = (session.customer_details?.email || session.customer_email || '')
    .trim()
    .toLowerCase();
  const email = (userEmail || '').trim().toLowerCase();
  return sessionEmail && email && sessionEmail === email;
}

module.exports = { applyCheckoutSession, sessionBelongsToUser };
