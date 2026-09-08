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

function fieldCell(label, value, lastInRow) {
  const pad = lastInRow ? '14px 0 14px 12px' : '14px 12px 14px 0';
  return `<td width="50%" valign="top" style="padding:${pad};border-bottom:1px solid #222222">
  <div style="font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:9px;letter-spacing:2.4px;text-transform:uppercase;color:#c9a84c;font-weight:600">${escapeHtml(label)}</div>
  <div style="font-family:'DM Serif Display',Georgia,'Times New Roman',serif;font-size:16px;line-height:1.35;color:#f5f0e6;margin-top:6px">${escapeHtml(value)}</div>
</td>`;
}

function fieldRowsHtml(fields) {
  const rows = [];
  for (let i = 0; i < fields.length; i += 2) {
    const left = fields[i];
    const right = fields[i + 1];
    rows.push(`<tr>
      ${fieldCell(left.label, left.value, !right)}
      ${right ? fieldCell(right.label, right.value, true) : '<td width="50%" style="border-bottom:1px solid #222222"></td>'}
    </tr>`);
  }
  return rows.join('');
}

export function brandedFormEmail({ kind = 'enquiry', name, email, fields = [], message }) {
  const site = CONTACT_SITE;
  const logo = `${site}/assets/mgt-logo.png`;
  const safeName = String(name || '').trim();
  const safeEmail = sanitizeEmail(email);
  const cleanFields = fields
    .map((field) => ({
      label: sanitizeHeader(field.label),
      value: String(field.value || '').trim(),
    }))
    .filter((field) => field.label && field.value);
  const isEnquiry = kind !== 'newsletter';
  const eyebrow = isEnquiry ? 'New website enquiry' : 'Newsletter signup';
  const headline = safeName || (isEnquiry ? 'A traveler reached out' : 'A new subscriber');
  const dek = isEnquiry
    ? `${safeName || 'Someone'} sent this from the contact form on martinsglobaltravel.com.`
    : `${safeEmail || 'Someone'} joined the mailing list on martinsglobaltravel.com.`;
  const replyHref = safeEmail
    ? `mailto:${safeEmail}?subject=${encodeURIComponent(
        isEnquiry ? `Your Martins Global Travels enquiry` : `Your Martins Global Travels newsletter`
      )}`
    : `${site}/#contact`;
  const replyLabel = safeName ? `Reply to ${safeName.split(' ')[0]}` : 'Reply to traveler';

  const textLines = [
    'Martins Global Travels',
    eyebrow,
    '',
    headline,
    dek,
    '',
    ...cleanFields.map((field) => `${field.label}: ${field.value}`),
    message ? `\nDream trip:\n${String(message).trim()}` : '',
    '',
    safeEmail ? `Reply: ${safeEmail}` : '',
    '(508) 232-3003',
    site,
  ].filter((line) => line !== '');

  const messageBlock = message
    ? `<tr><td style="padding-top:28px">
        <div style="padding:22px 24px;background:#0d0d0d;border:1px solid rgba(201,168,76,.4)">
          <div style="font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:9px;letter-spacing:2.4px;text-transform:uppercase;color:#c9a84c;font-weight:600">Dream trip</div>
          <p style="font-family:'DM Serif Display',Georgia,'Times New Roman',serif;font-size:17px;font-style:italic;line-height:1.6;color:#f0ece4;margin:12px 0 0">${escapeHtml(
            String(message).trim()
          )}</p>
        </div>
      </td></tr>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(eyebrow)}</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#050505;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#050505;margin:0;padding:0">
  <tr>
    <td align="center" style="padding:36px 12px 48px">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;border-collapse:collapse">
        <tr><td style="height:3px;background:#c9a84c;font-size:0;line-height:0">&nbsp;</td></tr>
        <tr>
          <td style="background:#0d0d0d;padding:32px 36px 26px;text-align:center;border-left:1px solid #1a1a1a;border-right:1px solid #1a1a1a">
            <img src="${logo}" width="72" height="72" alt="Martins Global Travels gold seal" style="display:block;margin:0 auto 16px;border:0">
            <div style="font-family:'DM Serif Display',Georgia,'Times New Roman',serif;font-size:22px;line-height:1.2;color:#ffffff">Martins Global Travels</div>
            <div style="font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:4px;text-transform:uppercase;color:#c9a84c;font-weight:500;margin-top:8px">Bespoke journeys</div>
          </td>
        </tr>
        <tr>
          <td style="background:#111111;padding:36px;border-left:1px solid #1a1a1a;border-right:1px solid #1a1a1a">
            <div style="font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#c9a84c;font-weight:600">${escapeHtml(
              eyebrow
            )}</div>
            <h1 style="font-family:'DM Serif Display',Georgia,'Times New Roman',serif;font-size:34px;line-height:1.12;font-weight:400;color:#ffffff;margin:12px 0 10px">${escapeHtml(
              headline
            )}</h1>
            <p style="font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#cfc6b0;margin:0 0 28px">${escapeHtml(
              dek
            )}</p>
            <a href="${replyHref}" style="display:inline-block;background:#c9a84c;color:#050505;text-decoration:none;padding:14px 26px;font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase">${escapeHtml(
              replyLabel
            )}</a>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:32px;border-collapse:collapse">
              ${fieldRowsHtml(cleanFields)}
              ${messageBlock}
            </table>
          </td>
        </tr>
        <tr>
          <td style="background:#0d0d0d;padding:26px 36px;text-align:center;border-left:1px solid #1a1a1a;border-right:1px solid #1a1a1a;border-top:1px solid #222222">
            <div style="font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#8a8070">Reply to this email to write ${
              safeName ? escapeHtml(safeName) : 'the traveler'
            } directly.</div>
            <div style="font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:12px;color:#c9a84c;margin-top:10px">
              <a href="tel:+15082323003" style="color:#c9a84c;text-decoration:none">(508) 232-3003</a>
              &nbsp;&middot;&nbsp;
              <a href="${site}" style="color:#c9a84c;text-decoration:none">martinsglobaltravel.com</a>
            </div>
          </td>
        </tr>
        <tr><td style="height:3px;background:#c9a84c;font-size:0;line-height:0">&nbsp;</td></tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

  return { text: textLines.join('\n'), html };
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
