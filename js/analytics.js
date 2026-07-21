(function () {
  const id = window.MGT_ANALYTICS?.GA_MEASUREMENT_ID;
  if (!id || String(id).includes('YOUR_') || !String(id).startsWith('G-')) return;

  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', id, { anonymize_ip: true });
})();
