(function () {
  const match = location.pathname.match(/^\/send\/([A-Za-z0-9_-]{8,64})\/?$/);
  const token = match ? match[1] : '';
  const lead = document.getElementById('lead');
  const form = document.getElementById('form');
  const err = document.getElementById('error');
  const btn = document.getElementById('send-btn');
  const payCard = document.getElementById('pay-card');
  const thanks = document.getElementById('thanks');

  function showError(msg) {
    err.textContent = msg || '';
    err.hidden = !msg;
  }

  function showThanks() {
    payCard.hidden = true;
    thanks.hidden = false;
  }

  async function load() {
    if (!token) {
      lead.textContent = 'This link is not available.';
      form.hidden = true;
      return;
    }
    const res = await fetch('/api/send-money/info?token=' + encodeURIComponent(token));
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      lead.textContent = json.error || 'This link is not available.';
      form.hidden = true;
      return;
    }
    const thanksLead = document.getElementById('thanks-lead');
    if (json.destination === 'agency') {
      lead.textContent = 'Send money to Martins Global Travels.';
      if (thanksLead) thanksLead.textContent = 'Thank you. Martins Global Travels received your payment.';
    } else {
      lead.textContent = "Send money toward " + json.firstName + "'s trip.";
      if (thanksLead) thanksLead.textContent = 'Thank you.';
    }
  }

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    showError('');
    btn.disabled = true;
    btn.textContent = 'Connecting…';
    try {
      const res = await fetch('/api/send-money/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, amountDollars: document.getElementById('amount').value }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Could not start payment');
      if (json.url) window.location.href = json.url;
      else throw new Error('Could not start payment');
    } catch (ex) {
      showError(ex.message);
      btn.disabled = false;
      btn.textContent = 'Send';
    }
  });

  const params = new URLSearchParams(location.search);
  if (params.get('paid') === '1' && params.get('session_id')) {
    fetch('/api/send-money/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, sessionId: params.get('session_id') }),
    })
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        history.replaceState({}, '', location.pathname);
        if (ok && j.ok) showThanks();
        else {
          load();
          showError(j.error || 'Payment is still confirming. If you were charged, you are all set.');
        }
      })
      .catch(() => {
        load();
        showError('Payment is still confirming. If you were charged, you are all set.');
      });
    return;
  }
  if (params.get('canceled') === '1') {
    history.replaceState({}, '', location.pathname);
    showError('Payment canceled. Nothing was charged.');
  }
  load();
})();
