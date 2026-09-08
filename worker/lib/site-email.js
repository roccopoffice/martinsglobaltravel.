export const CONTACT_TO = 'jeanie@martinsglobaltravels.com';
export const CONTACT_FROM = 'website@martinsglobaltravel.com';
export const CONTACT_SITE = 'https://martinsglobaltravel.com';

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Keep header values on one line and ASCII-only so Gmail does not treat them as spoofing. */
export function sanitizeHeader(value) {
  return String(value || '')
    .normalize('NFKC')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function sanitizeEmail(value) {
  const email = String(value || '')
    .normalize('NFKC')
    .trim()
    .toLowerCase();
  return /^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/i.test(email) ? email : '';
}

function emailDomain(value) {
  return sanitizeEmail(value).split('@')[1] || '';
}

/** Gmail flags From/To domains that look like each other (travel vs travels). */
export function isLookalikeDomain(fromEmail, toEmail) {
  const fromHost = emailDomain(fromEmail);
  const toHost = emailDomain(toEmail);
  if (!fromHost || !toHost || fromHost === toHost) return false;
  const fromLabel = fromHost.replace(/\.[a-z]{2,}$/i, '').replace(/[.-]/g, '');
  const toLabel = toHost.replace(/\.[a-z]{2,}$/i, '').replace(/[.-]/g, '');
  if (!fromLabel || !toLabel) return false;
  if (fromLabel === toLabel) return fromHost !== toHost;
  return fromLabel.includes(toLabel) || toLabel.includes(fromLabel);
}

function senderIdentity(to, fromName) {
  const from = CONTACT_FROM;
  const name = sanitizeHeader(fromName);
  if (!name) return from;
  if (isLookalikeDomain(from, to)) return from;
  if (!/^[A-Za-z0-9 .,&'-]+$/.test(name)) return from;
  return { email: from, name };
}

function buildRawMime({ from, to, replyTo, subject, text, html }) {
  const boundary = `mgt${crypto.randomUUID().replace(/-/g, '')}`;
  const headers = [
    `From: ${from}`,
    `To: ${to}`,
    replyTo ? `Reply-To: ${replyTo}` : '',
    `Subject: ${sanitizeHeader(subject)}`,
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

export function formNotice(kind, text, html) {
  const intro = `This is a ${kind} from the website ${CONTACT_SITE}. Reply to the visitor address below.`;
  return {
    text: `${intro}\n\n${text}`,
    html: `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222;line-height:1.5">
<p>${escapeHtml(intro)}</p>
${html}
<p style="margin-top:24px;font-size:12px;color:#666">Sent by the contact form on ${escapeHtml(CONTACT_SITE)}</p>
</div>`,
  };
}

export async function sendSiteEmail(env, { to = CONTACT_TO, subject, text, html, replyTo, fromName }) {
  if (!env.EMAIL?.send) return { ok: false, reason: 'not_configured' };

  const dest = sanitizeEmail(to || CONTACT_TO);
  if (!dest) return { ok: false, reason: 'invalid_recipient' };

  const from = senderIdentity(dest, fromName);
  const safeReply = sanitizeEmail(replyTo);
  const payload = {
    to: dest,
    from,
    subject: sanitizeHeader(subject),
    text: String(text || ''),
    html: String(html || text || ''),
  };
  if (safeReply) payload.replyTo = safeReply;

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
          to: dest,
          replyTo: safeReply,
          subject,
          text: payload.text,
          html: payload.html,
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
