const NETLIFY_ORIGIN = 'https://cute-florentine-3714b4.netlify.app';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/.netlify/functions/')) {
      const target = new URL(url.pathname + url.search, NETLIFY_ORIGIN);
      const proxyHeaders = new Headers(request.headers);
      proxyHeaders.set('Host', new URL(NETLIFY_ORIGIN).host);
      return fetch(
        new Request(target.toString(), {
          method: request.method,
          headers: proxyHeaders,
          body: request.body,
          redirect: 'manual',
        })
      );
    }

    return env.ASSETS.fetch(request);
  },
};
