(function () {
  const TOKEN_KEY = 'mgt_portal_token';
  const API = '/api/';

  const $ = (id) => document.getElementById(id);
  const loginView = $('portal-login');
  const dashView = $('portal-dashboard');
  const loginForm = $('login-form');
  const loginErr = $('login-error');
  const balanceEl = $('balance-amount');
  const balanceNote = $('balance-note');
  const payBtn = $('pay-btn');
  const creditEl = $('credit-amount');
  const creditNote = $('credit-note');
  const setupBankBtn = $('setup-bank-btn');
  const withdrawPanel = $('withdraw-panel');
  const withdrawBtn = $('withdraw-btn');
  const withdrawInput = $('withdraw-amount');
  const walletHistory = $('wallet-history');
  const logoutBtn = $('logout-btn');
  const changePwBtn = $('change-pw-btn');
  const welcomeEl = $('welcome-name');
  const statusBanner = $('portal-status');
  const pwModal = $('password-modal');
  const pwModalLead = $('pw-modal-lead');
  const pwModalError = $('pw-modal-error');
  const pwCancelBtn = $('pw-cancel-btn');

  let pwModalRequired = false;
  let currentUser = null;

  function getToken() {
    return localStorage.getItem(TOKEN_KEY) || '';
  }

  function setToken(token) {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  }

  function authHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    const token = getToken();
    if (token) headers.Authorization = 'Bearer ' + token;
    return headers;
  }

  function formatMoney(cents, currency) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: (currency || 'usd').toUpperCase(),
    }).format(cents / 100);
  }

  function showBanner(text, type) {
    if (!statusBanner) return;
    statusBanner.textContent = text;
    statusBanner.className = 'portal-banner ' + (type || '');
    statusBanner.hidden = !text;
  }

  function showError(msg) {
    loginErr.textContent = msg;
    loginErr.hidden = !msg;
  }

  function mustChangePassword(user) {
    return user?.must_change_password === true;
  }

  function showPasswordModal(opts) {
    pwModalRequired = !!opts?.required;
    pwModal.hidden = false;
    document.body.style.overflow = 'hidden';
    $('pw-new').value = '';
    $('pw-confirm').value = '';
    pwModalError.hidden = true;
    pwModalError.textContent = '';

    if (opts?.required) {
      pwModalLead.textContent =
        'Your temporary password must be changed before you can use the portal.';
      $('pw-modal-title').innerHTML = 'Create your <em>password</em>';
    } else {
      pwModalLead.textContent = 'Enter a new password (at least 6 characters).';
      $('pw-modal-title').innerHTML = 'Change <em>password</em>';
    }

    pwCancelBtn.hidden = pwModalRequired;
  }

  function hidePasswordModal() {
    if (pwModalRequired) return;
    pwModal.hidden = true;
    document.body.style.overflow = '';
  }

  function clientDisplayName(account) {
    const first = account.first_name?.trim();
    const last = account.last_name?.trim();
    if (first || last) return [first, last].filter(Boolean).join(' ');
    return account.full_name?.trim() || 'Client';
  }

  function renderBalance(account) {
    welcomeEl.textContent = clientDisplayName(account);
    balanceEl.textContent = formatMoney(account.balance_cents, account.currency);

    if (account.balance_cents <= 0) {
      balanceNote.textContent = 'You have no outstanding balance. Thank you!';
      payBtn.disabled = true;
      payBtn.textContent = 'Nothing due';
      if ($('credit-apply-box')) $('credit-apply-box').hidden = true;
    } else {
      balanceNote.textContent = 'Secure payment powered by Stripe.';
      payBtn.disabled = false;
      payBtn.textContent = 'Pay remaining balance with card';
      if ($('credit-apply-box')) $('credit-apply-box').hidden = false;
    }
  }

  async function loadBalance() {
    const res = await fetch(API + 'auth/balance', { headers: authHeaders() });
    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      balanceEl.textContent = '—';
      balanceNote.textContent = json.error || 'Could not load balance. Please try again or contact us.';
      payBtn.disabled = true;
      return;
    }

    if (!json.account) {
      balanceEl.textContent = '—';
      balanceNote.textContent =
        'Your account is not set up yet. Email Jeanie@MartinsGlobalTravels.com or call (508) 232-3003.';
      payBtn.disabled = true;
      return;
    }

    renderBalance({
      ...json.account,
      full_name: json.account.full_name || currentUser?.email?.split('@')[0],
    });
  }

  function formatShortDate(iso) {
    try {
      return new Date(iso.includes('T') ? iso : iso.replace(' ', 'T') + 'Z').toLocaleDateString(
        'en-US',
        { month: 'short', day: 'numeric', year: 'numeric' }
      );
    } catch {
      return '';
    }
  }

  function escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = s ?? '';
    return d.innerHTML;
  }

  function renderWalletHistory(transactions) {
    if (!walletHistory) return;
    if (!transactions?.length) {
      walletHistory.hidden = true;
      walletHistory.innerHTML = '';
      return;
    }
    const rows = transactions
      .map((t) => {
        const isGrant = t.type === 'grant';
        const sign = isGrant ? '+' : '−';
        return `<div class="wallet-row">
          <div>
            <div class="wallet-row-note">${escapeHtml(t.note || (isGrant ? 'Credit added' : 'Withdrawal'))}</div>
            <div class="wallet-row-date">${escapeHtml(formatShortDate(t.created_at))}</div>
          </div>
          <div class="wallet-row-amt ${isGrant ? 'plus' : ''}">${sign}${formatMoney(t.amount_cents, 'usd')}</div>
        </div>`;
      })
      .join('');
    walletHistory.innerHTML = '<div class="wallet-history-title">Credit activity</div>' + rows;
    walletHistory.hidden = false;
  }

  async function loadWallet() {
    if (!creditEl) return;
    const res = await fetch(API + 'wallet', { headers: authHeaders() });
    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      creditEl.textContent = '—';
      creditNote.textContent = json.error || 'Could not load your credit right now.';
      setupBankBtn.hidden = true;
      withdrawPanel.hidden = true;
      return;
    }

    const credit = json.creditCents || 0;
    const payout = json.payout || {};
    creditEl.textContent = formatMoney(credit, json.currency);

    if (credit <= 0) {
      creditNote.textContent = payout.payoutsEnabled
        ? 'No credit right now. Your bank account is connected for future withdrawals.'
        : 'No credit right now. Credit sent to you by Martins Global Travels will appear here.';
      setupBankBtn.hidden = true;
      withdrawPanel.hidden = true;
    } else if (payout.payoutsEnabled) {
      creditNote.textContent = 'Withdraw any amount of your credit straight to your bank.';
      setupBankBtn.hidden = true;
      withdrawPanel.hidden = false;
    } else {
      creditNote.textContent = payout.connected
        ? 'Finish setting up your bank account to withdraw this credit.'
        : 'Connect your bank account to withdraw this credit. Secure setup powered by Stripe.';
      setupBankBtn.textContent = payout.connected ? 'Finish bank setup' : 'Set up bank account';
      setupBankBtn.hidden = false;
      withdrawPanel.hidden = true;
    }

    renderWalletHistory(json.transactions);
  }

  function showDashboard() {
    loginView.hidden = true;
    dashView.hidden = false;
    document.getElementById('nav').classList.add('dark');
  }

  function showLogin() {
    loginView.hidden = false;
    dashView.hidden = true;
    currentUser = null;
    showError('');
    hidePasswordModal();
  }

  async function showDashboardForUser(user) {
    currentUser = user;
    showDashboard();
    if (mustChangePassword(user)) {
      showPasswordModal({ required: true });
      return;
    }
    await Promise.all([loadBalance(), loadWallet(), loadGiftCards()]);
  }

  async function restoreSession() {
    const token = getToken();
    if (!token) {
      showLogin();
      return;
    }

    const res = await fetch(API + 'auth/session', { headers: authHeaders() });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.user) {
      setToken('');
      showLogin();
      return;
    }
    await showDashboardForUser(json.user);
  }

  async function saveNewPassword() {
    const pw = $('pw-new').value;
    const confirm = $('pw-confirm').value;
    pwModalError.hidden = true;

    if (pw.length < 6) {
      pwModalError.textContent = 'Password must be at least 6 characters.';
      pwModalError.hidden = false;
      return;
    }
    if (pw !== confirm) {
      pwModalError.textContent = 'Passwords do not match.';
      pwModalError.hidden = false;
      return;
    }

    const btn = $('pw-save-btn');
    btn.disabled = true;
    btn.textContent = 'Saving…';

    const res = await fetch(API + 'auth/change-password', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ newPassword: pw }),
    });
    const json = await res.json().catch(() => ({}));

    btn.disabled = false;
    btn.textContent = 'Save password';

    if (!res.ok) {
      pwModalError.textContent = json.error || 'Could not update password.';
      pwModalError.hidden = false;
      return;
    }

    pwModalRequired = false;
    pwModal.hidden = true;
    document.body.style.overflow = '';
    if (currentUser) currentUser.must_change_password = false;
    showBanner('Password updated successfully.', 'success');
    await Promise.all([loadBalance(), loadWallet(), loadGiftCards()]);
  }

  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    showError('');
    const email = $('login-email').value.trim();
    const password = $('login-password').value;
    const btn = loginForm.querySelector('button[type=submit]');
    btn.disabled = true;
    btn.textContent = 'Signing in…';

    const res = await fetch(API + 'auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json().catch(() => ({}));

    btn.disabled = false;
    btn.textContent = 'Sign in';

    if (!res.ok) {
      showError(json.error || 'Invalid email or password.');
      return;
    }

    setToken(json.token);
    await showDashboardForUser(json.user);
  });

  $('forgot-toggle')?.addEventListener('click', () => {
    const panel = $('forgot-panel');
    const open = !panel.hidden;
    panel.hidden = open;
    $('forgot-toggle').textContent = open ? 'Forgot password?' : 'Back to sign in';
    if (!open) $('forgot-email').value = $('login-email').value.trim();
  });

  $('forgot-send-btn')?.addEventListener('click', () => {
    const msg = $('forgot-msg');
    msg.style.color = '';
    msg.textContent =
      'Please email Jeanie@MartinsGlobalTravels.com or call (508) 232-3003 to reset your password.';
    msg.hidden = false;
  });

  $('pw-save-btn')?.addEventListener('click', saveNewPassword);
  pwCancelBtn?.addEventListener('click', hidePasswordModal);
  changePwBtn?.addEventListener('click', () => showPasswordModal({ required: false }));

  logoutBtn?.addEventListener('click', () => {
    setToken('');
    showLogin();
    showBanner('');
  });

  payBtn?.addEventListener('click', async () => {
    if (!getToken()) {
      showLogin();
      return;
    }

    payBtn.disabled = true;
    payBtn.textContent = 'Redirecting to Stripe…';

    try {
      const res = await fetch(API + 'create-checkout', {
        method: 'POST',
        headers: authHeaders(),
        body: '{}',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Checkout failed');
      if (json.url) window.location.href = json.url;
      else throw new Error('No checkout URL');
    } catch (err) {
      showBanner(err.message || 'Payment could not start.', 'error');
      payBtn.disabled = false;
      payBtn.textContent = 'Pay balance with card';
    }
  });

  setupBankBtn?.addEventListener('click', async () => {
    setupBankBtn.disabled = true;
    const original = setupBankBtn.textContent;
    setupBankBtn.textContent = 'Opening secure setup…';
    try {
      const res = await fetch(API + 'wallet/connect', {
        method: 'POST',
        headers: authHeaders(),
        body: '{}',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Could not start bank setup.');
      if (json.url) window.location.href = json.url;
      else throw new Error('Could not start bank setup.');
    } catch (err) {
      showBanner(err.message, 'error');
      setupBankBtn.disabled = false;
      setupBankBtn.textContent = original;
    }
  });

  withdrawBtn?.addEventListener('click', async () => {
    const amount = withdrawInput.value.trim();
    if (!amount) {
      showBanner('Enter the amount you want to withdraw.', 'warn');
      return;
    }
    withdrawBtn.disabled = true;
    withdrawBtn.textContent = 'Sending to your bank…';
    try {
      const res = await fetch(API + 'wallet/withdraw', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ amountDollars: amount }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Withdrawal failed.');
      withdrawInput.value = '';
      showBanner(json.message || 'Withdrawal sent to your bank.', 'success');
      await loadWallet();
    } catch (err) {
      showBanner(err.message, 'error');
    } finally {
      withdrawBtn.disabled = false;
      withdrawBtn.textContent = 'Withdraw to my bank';
    }
  });

  async function loadGiftCards() {
    const totalEl = $('gc-total');
    const emptyEl = $('gc-empty');
    const listEl = $('gc-list');
    const giveBtn = $('gc-give-btn');
    if (!totalEl) return;

    const res = await fetch(API + 'gift-cards/my', { headers: authHeaders() });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      totalEl.textContent = '—';
      emptyEl.textContent = json.error || 'Could not load travel credits.';
      emptyEl.hidden = false;
      if (listEl) listEl.hidden = true;
      return;
    }

    const cards = json.cards || [];
    const available = json.availableCents || 0;
    totalEl.textContent = formatMoney(available, 'usd');

    if (!cards.length) {
      emptyEl.hidden = false;
      emptyEl.textContent = "You don't have any travel credits yet.";
      if (giveBtn) giveBtn.hidden = false;
      if (listEl) {
        listEl.hidden = true;
        listEl.innerHTML = '';
      }
      return;
    }

    emptyEl.hidden = true;
    if (giveBtn) giveBtn.hidden = true;
    const rows = cards
      .map((c) => {
        const used = formatMoney(c.usedAmountCents || 0, c.currency);
        const orig = formatMoney(c.originalAmountCents || 0, c.currency);
        const rem = formatMoney(c.currentBalanceCents || 0, c.currency);
        const exp = c.expiresAt ? formatShortDate(c.expiresAt) : 'No expiration';
        return `<div class="wallet-row">
          <div>
            <div class="wallet-row-note">${escapeHtml(c.type === 'PROMOTIONAL_CREDIT' ? 'Promotional credit' : 'Gift card')} · ••••${escapeHtml(c.codeLastFour || '')}</div>
            <div class="wallet-row-date">${escapeHtml(c.status)} · Original ${orig} · Used ${used} · ${escapeHtml(exp)}</div>
            <button type="button" class="portal-link-btn gc-history" data-id="${escapeHtml(c.id)}">Transaction history</button>
          </div>
          <div class="wallet-row-amt plus">${rem}</div>
        </div>`;
      })
      .join('');
    listEl.innerHTML =
      '<div class="wallet-history-title">Total available travel credit</div>' + rows;
    listEl.hidden = false;
    listEl.querySelectorAll('.gc-history').forEach((btn) => {
      btn.addEventListener('click', () => showGiftHistory(btn.dataset.id));
    });
  }

  async function showGiftHistory(id) {
    const detail = $('gc-detail');
    if (!detail) return;
    const res = await fetch(API + 'gift-cards/transactions?id=' + encodeURIComponent(id), {
      headers: authHeaders(),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      detail.hidden = false;
      detail.textContent = json.error || 'Could not load history.';
      return;
    }
    const rows = (json.transactions || [])
      .map((t) => {
        const sign = t.amount_cents >= 0 ? '+' : '−';
        return `<div class="wallet-row">
          <div>
            <div class="wallet-row-note">${escapeHtml(t.reason || t.transaction_type)}</div>
            <div class="wallet-row-date">${escapeHtml(formatShortDate(t.created_at))}</div>
          </div>
          <div class="wallet-row-amt ${t.amount_cents >= 0 ? 'plus' : ''}">${sign}${formatMoney(Math.abs(t.amount_cents), 'usd')}</div>
        </div>`;
      })
      .join('');
    detail.innerHTML =
      '<div class="wallet-history-title">Transaction history</div>' +
      (rows || '<p class="balance-note">No activity yet.</p>');
    detail.hidden = false;
  }

  async function applyGift(payload) {
    const quoteEl = $('trip-quote');
    const res = await fetch(API + 'gift-cards/apply', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      showBanner(json.error || 'Could not apply credit.', 'error');
      return;
    }
    const q = json.quote || {};
    if (quoteEl) {
      quoteEl.hidden = false;
      quoteEl.innerHTML = `Trip total: ${formatMoney(q.tripTotalCents, 'usd')}<br>Travel credit: −${formatMoney(q.creditAppliedCents, 'usd')}<br><strong>Remaining balance: ${formatMoney(q.remainingBalanceCents, 'usd')}</strong>`;
    }
    showBanner(json.message || 'Travel credit applied.', 'success');
    await Promise.all([loadBalance(), loadGiftCards()]);
  }

  $('apply-code-btn')?.addEventListener('click', async () => {
    const code = $('gift-code')?.value.trim();
    if (!code) {
      showBanner('Enter your gift card code.', 'warn');
      return;
    }
    await applyGift({ code });
  });

  $('apply-available-btn')?.addEventListener('click', async () => {
    await applyGift({ applyAvailable: true });
  });

  const params = new URLSearchParams(window.location.search);
  const paidReturn = params.get('paid') === '1';
  const sessionId = params.get('session_id');
  const canceledReturn = params.get('canceled') === '1';
  const connectReturn = params.get('connect');

  if (paidReturn || canceledReturn || connectReturn) {
    history.replaceState({}, '', 'portal.html');
  }

  async function confirmPaidSession() {
    if (!getToken()) return;
    showBanner('Thank you — confirming your payment…', 'success');

    if (sessionId) {
      try {
        const res = await fetch(API + 'confirm-payment', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ sessionId }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Could not confirm payment');
        await loadBalance();
        showBanner('Thank you — your payment was received. Your balance is updated.', 'success');
        return;
      } catch (err) {
        console.warn('confirm-payment', err);
        showBanner(
          'Payment received. If your balance still looks wrong, refresh in a minute or call (508) 232-3003.',
          'warn'
        );
      }
    }

    setTimeout(loadBalance, 2000);
    setTimeout(loadBalance, 6000);
  }

  restoreSession().then(() => {
    if (paidReturn && getToken()) confirmPaidSession();
    else if (canceledReturn) showBanner('Payment canceled. Your balance is unchanged.', 'warn');
    else if (connectReturn === 'done' && getToken()) {
      showBanner(
        'Bank setup complete! Once Stripe verifies your details you can withdraw your credit below.',
        'success'
      );
    } else if (connectReturn === 'refresh' && getToken()) {
      showBanner('Bank setup was not finished. Click "Set up bank account" to continue.', 'warn');
    }
  });
})();
