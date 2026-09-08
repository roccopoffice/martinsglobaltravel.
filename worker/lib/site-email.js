export const CONTACT_TO = 'jeanie@martinsglobaltravels.com';
export const CONTACT_FROM = 'website@martinsglobaltravel.com';

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function encodeHeader(value) {
  return String(value || '')
    .replace(/[\r\n]+/g, ' ')
    .trim();
}

function buildRawMime({ from, fromName, to, replyTo, subject, text, html }) {
  const boundary = `mgt${crypto.randomUUID().replace(/-/g, '')}`;
  const headers = [
    `From: ${fromName ? `"${encodeHeader(fromName)}" <${from}>` : from}`,
    `To: ${to}`,
    replyTo ? `Reply-To: ${replyTo}` : '',
    `Subject: ${encodeHeader(subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ].filter(Boolean);

  return (
    `${headers.join('\r\n')}\r\n\r\n` +
    `--${boundary}\r\nContent-Type: text/plain; charset="utf-8"\r\n\r\n${text || ''}\r\n` +
    `--${boundary}\r\nContent-Type: text/html; charset="utf-8"\r\n\r\n${html || text || ''}\r\n` +
    `--${boundary}--\r\n`
  );
}

export async function sendSiteEmail(env, { to = CONTACT_TO, subject, text, html, replyTo }) {
  if (!env.EMAIL?.send) return { ok: false, reason: 'not_configured' };

  const dest = String(to || CONTACT_TO).trim();
  const payload = {
    to: dest,
    from: { email: CONTACT_FROM, name: 'Martins Global Travels Website' },
    subject,
    text,
    html,
  };
  if (replyTo) payload.replyTo = replyTo;

  try {
    await env.EMAIL.send(payload);
    return { ok: true };
  } catch (firstErr) {
    try {
      const { EmailMessage } = await import('cloudflare:email');
      const message = new EmailMessage(
        CONTACT_FROM,
        dest,
        buildRawMime({
          from: CONTACT_FROM,
          fromName: 'Martins Global Travels Website',
          to: dest,
          replyTo,
          subject,
          text,
          html,
        })
      );
      await env.EMAIL.send(message);
      return { ok: true };
    } catch (secondErr) {
      const reason = [firstErr?.code, firstErr?.message, secondErr?.message]
        .filter(Boolean)
        .join(' | ');
      console.error('sendSiteEmail failed', reason);
      return { ok: false, reason: reason || 'send_failed' };
    }
  }
}
