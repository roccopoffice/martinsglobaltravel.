import { handleApiRequest } from './worker/api.js';
import { deliverDueCards } from './worker/lib/gift-cards.js';

const CONTACT_TO = 'Jeanie@MartinsGlobalTravels.com';
const CONTACT_FROM = 'website@martinsglobaltravels.com';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/contact') {
      if (request.method === 'POST') {
        return handleContact(request, env);
      }
      if (request.method === 'GET') {
        return new Response('Method not allowed', { status: 405 });
      }
    }

    if (url.pathname === '/admin/gift-cards' || url.pathname === '/admin/gift-cards/') {
      return Response.redirect(new URL('/admin.html#gift-cards', request.url), 302);
    }
    if (url.pathname === '/gift-cards' || url.pathname === '/gift-cards/') {
      return env.ASSETS.fetch(new Request(new URL('/gift-cards.html', request.url), request));
    }

    if (/^\/send\/[A-Za-z0-9_-]{8,64}\/?$/.test(url.pathname)) {
      let asset = await env.ASSETS.fetch(new Request(new URL('/send-money.html', request.url)));
      if (asset.status >= 300 && asset.status < 400 && asset.headers.get('Location')) {
        asset = await env.ASSETS.fetch(new Request(new URL(asset.headers.get('Location'), request.url)));
      }
      return asset;
    }

    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/.netlify/functions/')) {
      return handleApiRequest(request, env);
    }
    return env.ASSETS.fetch(request);
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(deliverDueCards(env));
  },
};

async function handleContact(request, env) {
  try {
    const form = await request.formData();
    const data = Object.fromEntries(form.entries());

    if (String(data._honey || '').trim()) {
      return jsonResponse({ ok: true });
    }

    const firstName = String(data.firstName || '').trim();
    const lastName = String(data.lastName || '').trim();
    const name = String(data.name || '').trim() || [firstName, lastName].filter(Boolean).join(' ');
    const email = String(data.email || '').trim();
    const subject =
      String(data._subject || '').trim() || 'New enquiry — Martins Global Travels website';

    if (!name || !email || !email.includes('@')) {
      return new Response('Name and a valid email are required.', { status: 400 });
    }

    const skip = new Set(['_honey', '_subject', '_next', 'name']);
    const lines = [`Name: ${name}`, `Email: ${email}`];

    for (const [key, value] of Object.entries(data)) {
      if (skip.has(key) || value == null || String(value).trim() === '') continue;
      const label = key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (c) => c.toUpperCase())
        .trim();
      lines.push(`${label}: ${String(value).trim()}`);
    }

    const text = lines.join('\n');
    const html = lines.map((line) => `<p>${escapeHtml(line)}</p>`).join('');

    if (!env.EMAIL?.send) {
      return new Response('Email service is not configured.', { status: 503 });
    }

    await env.EMAIL.send({
      to: CONTACT_TO,
      from: { email: CONTACT_FROM, name: 'Martins Global Travels Website' },
      replyTo: email,
      subject,
      text,
      html: `<div style="font-family:system-ui,sans-serif;line-height:1.5">${html}</div>`,
    });

    return jsonResponse({ ok: true });
  } catch (err) {
    console.error('Contact form email failed:', err);
    return new Response(
      'We could not send your message right now. Please call (508) 232-3003 or email Jeanie@MartinsGlobalTravels.com directly.',
      { status: 500, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );
  }
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
