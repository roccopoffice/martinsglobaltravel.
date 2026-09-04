import { handleApiRequest } from './worker/api.js';
import { deliverDueCards } from './worker/lib/gift-cards.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

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
