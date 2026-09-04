import { json, verifyAdmin } from './lib/http.js';
import { CONTACT_TO, escapeHtml, sendSiteEmail } from './lib/site-email.js';

function validEmail(value) {
  const email = String(value || '')
    .trim()
    .toLowerCase();
  return email.includes('@') && email.includes('.') ? email : '';
}

function isHoneypot(data, email) {
  const honey = String(data._honey || '')
    .trim()
    .toLowerCase();
  if (!honey) return false;
  if (email && honey === email) return false;
  return true;
}

async function readContactBody(request) {
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      return (await request.json()) || {};
    } catch {
      return {};
    }
  }
  try {
    const form = await request.formData();
    return Object.fromEntries(form.entries());
  } catch {
    return {};
  }
}

function enquiryLines(data, name, email) {
  const skip = new Set(['_honey', '_subject', '_next', 'name', 'formType']);
  const lines = [`Name: ${name}`, `Email: ${email}`];
  for (const [key, value] of Object.entries(data)) {
    if (skip.has(key) || value == null || String(value).trim() === '') continue;
    const label = key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (c) => c.toUpperCase())
      .trim();
    lines.push(`${label}: ${String(value).trim()}`);
  }
  return lines;
}

export async function submitContact(request, env) {
  const data = await readContactBody(request);

  const firstName = String(data.firstName || '').trim();
  const lastName = String(data.lastName || '').trim();
  const name = String(data.name || '').trim() || [firstName, lastName].filter(Boolean).join(' ');
  const email = validEmail(data.email);
  if (isHoneypot(data, email)) {
    return json(200, { ok: true });
  }
  const subject =
    String(data._subject || '').trim() || 'New enquiry — Martins Global Travels website';

  if (!name || !email) {
    return json(400, { error: 'Name and a valid email are required.' });
  }

  const lines = enquiryLines(data, name, email);
  const text = lines.join('\n');
  const html = `<div style="font-family:system-ui,sans-serif;line-height:1.5">${lines
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join('')}</div>`;

  const id = crypto.randomUUID();
  try {
    await env.DB.prepare(
      `INSERT INTO form_submissions
        (id, form_type, name, email, phone, destination, package, departure_date, travelers, message, payload, emailed)
       VALUES (?, 'enquiry', ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`
    )
      .bind(
        id,
        name,
        email,
        String(data.phone || '').trim() || null,
        String(data.destination || '').trim() || null,
        String(data.package || '').trim() || null,
        String(data.departureDate || '').trim() || null,
        String(data.travelers || '').trim() || null,
        String(data.message || '').trim() || null,
        JSON.stringify(data)
      )
      .run();
  } catch (err) {
    console.error('form_submissions insert enquiry', err);
  }

  let emailed = false;
  try {
    const sent = await sendSiteEmail(env, {
      to: CONTACT_TO,
      replyTo: email,
      subject,
      text,
      html,
    });
    emailed = !!sent.ok;
  } catch (err) {
    console.error('Contact form email failed:', err);
  }

  if (emailed) {
    try {
      await env.DB.prepare('UPDATE form_submissions SET emailed = 1 WHERE id = ?').bind(id).run();
    } catch {
      /* ignore */
    }
  }

  return json(200, { ok: true, emailed });
}

export async function submitNewsletter(request, env) {
  const data = await readContactBody(request);
  const email = validEmail(data.email);
  if (isHoneypot(data, email)) {
    return json(200, { ok: true });
  }
  if (!email) return json(400, { error: 'Enter a valid email address.' });

  const id = crypto.randomUUID();
  try {
    await env.DB.prepare(
      `INSERT INTO form_submissions (id, form_type, email, payload, emailed)
       VALUES (?, 'newsletter', ?, ?, 0)`
    )
      .bind(id, email, JSON.stringify({ email }))
      .run();
  } catch (err) {
    console.error('form_submissions insert newsletter', err);
  }

  let emailed = false;
  try {
    const sent = await sendSiteEmail(env, {
      to: CONTACT_TO,
      replyTo: email,
      subject: 'New newsletter signup — Martins Global Travels website',
      text: `New newsletter signup\nEmail: ${email}`,
      html: `<div style="font-family:system-ui,sans-serif;line-height:1.5"><p>New newsletter signup</p><p>Email: ${escapeHtml(
        email
      )}</p></div>`,
    });
    emailed = !!sent.ok;
  } catch (err) {
    console.error('Newsletter email failed:', err);
  }

  if (emailed) {
    try {
      await env.DB.prepare('UPDATE form_submissions SET emailed = 1 WHERE id = ?').bind(id).run();
    } catch {
      /* ignore */
    }
  }

  return json(200, { ok: true, emailed });
}

export async function adminListForms(request, env) {
  const body = await request.json().catch(() => null);
  const auth = verifyAdmin(body, env);
  if (!auth.ok) return json(401, { error: auth.error });

  try {
    const rows = await env.DB.prepare(
      `SELECT id, form_type, name, email, phone, destination, package, departure_date, travelers, message, emailed, created_at
       FROM form_submissions
       ORDER BY created_at DESC
       LIMIT 200`
    ).all();
    return json(200, { submissions: rows?.results || [] });
  } catch (err) {
    if (String(err?.message || '').includes('no such table')) {
      return json(200, { submissions: [] });
    }
    throw err;
  }
}
