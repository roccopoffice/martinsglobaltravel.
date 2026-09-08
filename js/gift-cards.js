(function () {
  const PRESETS = [25, 50, 100, 250, 500, 1000];
  const $ = (id) => document.getElementById(id);
  const presetsEl = $('amount-presets');
  const customEl = $('custom-amount');
  const form = $('gift-form');
  const errEl = $('form-error');
  const payBtn = $('pay-btn');
  let selected = 250;

  function money(n) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
  }

  function currentAmount() {
    const custom = parseFloat(String(customEl.value || '').replace(/[$,]/g, ''));
    if (Number.isFinite(custom) && custom > 0) return custom;
    return selected;
  }

  function renderPresets() {
    presetsEl.innerHTML = PRESETS.map(
      (n) =>
        `<button type="button" class="amt-btn${n === selected ? ' on' : ''}" data-amt="${n}">${money(n)}</button>`
    ).join('');
    presetsEl.querySelectorAll('.amt-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        selected = Number(btn.dataset.amt);
        customEl.value = '';
        renderPresets();
        updatePreview();
      });
    });
  }

  function updatePreview() {
    const amount = currentAmount();
    const recipient = $('recipient-name').value.trim() || 'Someone special';
    const purchaser = $('purchaser-name').value.trim() || 'A friend';
    const message = $('gift-message').value.trim();
    $('preview-name').textContent = recipient;
    $('preview-amount').textContent = money(amount);
    $('preview-from').textContent = 'From ' + purchaser;
    $('preview-note').innerHTML = `To: ${escapeHtml(recipient)}<br>${escapeHtml(money(amount))}${
      message ? `<br>“${escapeHtml(message)}”` : ''
    }<br>From: ${escapeHtml(purchaser)}`;
  }

  function escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = s ?? '';
    return d.innerHTML;
  }

  function showError(msg) {
    errEl.textContent = msg || '';
    errEl.hidden = !msg;
  }

  $('for-self')?.addEventListener('change', () => {
    if ($('for-self').checked) {
      $('recipient-name').value = $('purchaser-name').value;
      $('recipient-email').value = $('purchaser-email').value;
    }
    updatePreview();
  });

  ['purchaser-name', 'purchaser-email', 'recipient-name', 'recipient-email', 'gift-message', 'custom-amount'].forEach(
    (id) => $(id)?.addEventListener('input', updatePreview)
  );

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    showError('');
    const amount = currentAmount();
    payBtn.disabled = true;
    payBtn.textContent = 'Connecting to secure checkout…';
    try {
      const res = await fetch('/api/gift-cards/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountDollars: amount,
          purchaserName: $('purchaser-name').value,
          purchaserEmail: $('purchaser-email').value,
          recipientName: $('recipient-name').value,
          recipientEmail: $('recipient-email').value,
          giftMessage: $('gift-message').value,
          deliveryDate: $('delivery-date').value || null,
          forSelf: !!$('for-self').checked,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Could not start checkout');
      if (json.url) window.location.href = json.url;
      else throw new Error('No checkout URL returned');
    } catch (err) {
      showError(err.message || 'Could not start checkout.');
      payBtn.disabled = false;
      payBtn.textContent = 'Continue to Payment';
    }
  });

  async function confirmPurchase(sessionId) {
    const success = $('success');
    success.hidden = false;
    try {
      const res = await fetch('/api/gift-cards/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Could not confirm');
      $('ok-recipient').textContent = json.recipientName || '—';
      $('ok-amount').textContent = money((json.amountCents || 0) / 100);
      $('ok-email').textContent = json.recipientEmail || '—';
      $('ok-date').textContent = json.deliveryDate
        ? new Date(json.deliveryDate).toLocaleDateString()
        : 'Today';
      $('ok-id').textContent = String(json.confirmationId || '').slice(0, 8).toUpperCase();
    } catch (err) {
      $('ok-recipient').textContent = 'Payment received';
      $('ok-amount').textContent = 'Confirming…';
      $('ok-email').textContent = err.message;
    }
  }

  const params = new URLSearchParams(window.location.search);
  if (params.get('purchased') === '1' && params.get('session_id')) {
    history.replaceState({}, '', 'gift-cards.html');
    confirmPurchase(params.get('session_id'));
  } else if (params.get('canceled') === '1') {
    history.replaceState({}, '', 'gift-cards.html');
    showError('Checkout was canceled. No gift card was issued.');
  }

  const today = new Date().toISOString().slice(0, 10);
  if ($('delivery-date')) $('delivery-date').min = today;
  renderPresets();
  updatePreview();
})();
