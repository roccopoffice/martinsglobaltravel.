export const CONTACT_TO = 'Jeanie@MartinsGlobalTravels.com';
export const CONTACT_FROM = 'website@martinsglobaltravel.com';

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function sendSiteEmail(env, { to = CONTACT_TO, subject, text, html, replyTo }) {
  if (!env.EMAIL?.send) return { ok: false, reason: 'not_configured' };
  const payload = {
    to,
    from: { email: CONTACT_FROM, name: 'Martins Global Travels Website' },
    subject,
    text,
    html,
  };
  if (replyTo) payload.replyTo = replyTo;
  await env.EMAIL.send(payload);
  return { ok: true };
}
