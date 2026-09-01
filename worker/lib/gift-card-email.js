const CONTACT_TO = 'Jeanie@MartinsGlobalTravels.com';
const CONTACT_FROM = 'website@martinsglobaltravels.com';

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function dollars(cents) {
  return `$${((cents || 0) / 100).toFixed(2)}`;
}

export function giftCardEmailContent(card, code, env) {
  const site = (env.SITE_URL || 'https://martinsglobaltravel.com').replace(/\/$/, '');
  const amount = dollars(card.original_amount_cents || card.current_balance_cents);
  const recipient = card.recipient_name || 'there';
  const message = card.gift_message || '';
  const expires = card.expires_at
    ? `Expires ${new Date(card.expires_at).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })}.`
    : 'This travel credit does not expire unless noted in your portal.';
  const portalUrl = `${site}/portal.html`;
  const giftUrl = `${site}/gift-cards.html`;

  const subject = "You've received a Travel E-Gift Card!";
  const text = [
    `Hi ${recipient},`,
    '',
    `You've received a Martins Global Travels e-Gift Card for ${amount}.`,
    message ? `Message: ${message}` : '',
    `Redemption code: ${code}`,
    expires,
    '',
    'Sign in to the client portal and enter this code under My Travel Credits, then apply it to your trip balance.',
    portalUrl,
    '',
    'Martins Global Travels · (508) 232-3003',
  ]
    .filter(Boolean)
    .join('\n');

  const html = `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#050505;color:#f5f0e6;font-family:Georgia,'Times New Roman',serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px 48px">
    <div style="text-align:center;margin-bottom:24px">
      <img src="${site}/assets/mgt-logo.png" alt="Martins Global Travels" width="64" height="64" style="display:inline-block">
      <div style="font-size:13px;letter-spacing:4px;text-transform:uppercase;color:#c9a84c;margin-top:12px">Martins Global Travels</div>
    </div>
    <h1 style="font-size:28px;font-weight:400;text-align:center;margin:0 0 8px">You've received a Travel E-Gift Card</h1>
    <p style="text-align:center;color:#cfc6b0;font-size:15px;line-height:1.5">Hi ${escapeHtml(recipient)}, someone sent you the freedom to choose your next adventure.</p>
    <div style="margin:28px 0;padding:28px 24px;border-radius:18px;background:linear-gradient(135deg,#1a1408,#3d2e12 55%,#c9a84c);border:1px solid rgba(201,168,76,.45)">
      <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#f3e2b0">E-Gift Card · For Travel</div>
      <div style="font-size:13px;margin-top:10px;color:#fff">To ${escapeHtml(recipient)}</div>
      <div style="font-size:42px;margin:12px 0 8px;color:#fff">${escapeHtml(amount)}</div>
      ${message ? `<p style="font-style:italic;color:#f3e2b0;margin:0 0 16px">“${escapeHtml(message)}”</p>` : ''}
      <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#dfc06e">Redemption code</div>
      <div style="font-family:ui-monospace,Menlo,monospace;font-size:20px;letter-spacing:2px;margin-top:6px;color:#fff">${escapeHtml(code)}</div>
    </div>
    <p style="font-size:14px;line-height:1.6;color:#cfc6b0">${escapeHtml(expires)} Sign in to your client portal, open <strong>My Travel Credits</strong>, enter the code, then apply it to your trip balance. Remaining credit stays on the card for a future eligible trip.</p>
    <p style="text-align:center;margin:28px 0">
      <a href="${portalUrl}" style="display:inline-block;background:#c9a84c;color:#050505;text-decoration:none;padding:14px 28px;font-size:13px;letter-spacing:1.5px;text-transform:uppercase;font-weight:700">Use My Travel Gift Card</a>
    </p>
    <p style="text-align:center;font-size:12px;color:#8a8070">
      <a href="${giftUrl}" style="color:#c9a84c">Give a gift card</a> · (508) 232-3003 · Jeanie@MartinsGlobalTravels.com
    </p>
  </div>
</body></html>`;

  return { subject, text, html, portalUrl };
}

async function sendRaw(env, { to, subject, text, html }) {
  if (!env.EMAIL?.send) return { ok: false, reason: 'not_configured' };
  await env.EMAIL.send({
    to,
    from: { email: CONTACT_FROM, name: 'Martins Global Travels' },
    subject,
    text,
    html,
  });
  return { ok: true };
}

export async function sendGiftCardEmail(env, card, code) {
  const content = giftCardEmailContent(card, code, env);
  const to = String(card.recipient_email || '').trim();
  if (!to) return { ok: false, reason: 'missing_recipient' };

  try {
    const sent = await sendRaw(env, { to, ...content });
    if (sent.ok) return sent;
  } catch (err) {
    try {
      await sendRaw(env, {
        to: CONTACT_TO,
        subject: `[Gift card for ${to}] ${content.subject}`,
        text: `Could not email the recipient directly (${String(err?.message || err)}).\n\n${content.text}`,
        html: content.html,
      });
      return { ok: false, reason: 'sent_to_agency_fallback' };
    } catch (fallbackErr) {
      return { ok: false, reason: String(fallbackErr?.message || err?.message || 'send_failed') };
    }
  }
  return { ok: false, reason: 'not_configured' };
}
