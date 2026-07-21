(function () {
  const cfg = window.MGT_CONFIG || {};
  const supabaseReady =
    cfg.SUPABASE_URL &&
    cfg.SUPABASE_ANON_KEY &&
    !String(cfg.SUPABASE_URL).includes('YOUR_PROJECT') &&
    !String(cfg.SUPABASE_ANON_KEY).includes('YOUR_SUPABASE');

  const $ = (id) => document.getElementById(id);
  const loginView = $('portal-login');
  const dashView = $('portal-dashboard');
  const loginForm = $('login-form');
  const loginErr = $('login-error');
  const balanceEl = $('balance-amount');
  const balanceNote = $('balance-note');
  const payBtn = $('pay-btn');
  const logoutBtn = $('logout-btn');
  const changePwBtn = $('change-pw-btn');
  const welcomeEl = $('welcome-name');
  const statusBanner = $('portal-status');
  const pwModal = $('password-modal');
  const pwModalLead = $('pw-modal-lead');
  const pwModalError = $('pw-modal-error');
  const pwCancelBtn = $('pw-cancel-btn');

  let pwModalRequired = false;

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

  function showSetupMessage() {
    loginView.hidden = false;
    dashView.hidden = true;
    showError(
      'Portal is not connected yet. Add your Supabase URL and anon key in js/config.js, then redeploy (see SETUP-PORTAL.md).'
    );
    if (loginForm) loginForm.querySelector('button[type=submit]').disabled = true;
  }

  function mustChangePassword(user) {
    return user?.user_metadata?.must_change_password === true;
  }

  function portalRedirectUrl() {
    return window.location.origin + '/portal.html';
  }

  function showPasswordModal(opts) {
    pwModalRequired = !!opts?.required;
    pwModal.hidden = false;
    document.body.style.overflow = 'hidden';
    $('pw-new').value = '';
    $('pw-confirm').value = '';
    pwModalError.hidden = true;
    pwModalError.textContent = '';

    if (opts?.recovery) {
      pwModalLead.textContent =
        'You opened a password reset link. Choose a new password for your account.';
      $('pw-modal-title').innerHTML = 'Reset your <em>password</em>';
    } else if (opts?.required) {
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

    const { data, error } = await client.auth.updateUser({
      password: pw,
      data: { must_change_password: false },
    });

    btn.disabled = false;
    btn.textContent = 'Save password';

    if (error) {
      pwModalError.textContent = error.message;
      pwModalError.hidden = false;
      return;
    }

    pwModalRequired = false;
    pwModal.hidden = true;
    document.body.style.overflow = '';
    showBanner('Password updated successfully.', 'success');

    const session = data?.user ? { user: data.user } : null;
    const { data: sessionData } = await client.auth.getSession();
    if (sessionData?.session) {
      showDashboardSession(sessionData.session);
    }
  }

  if (!supabaseReady) {
    showSetupMessage();
    return;
  }

  const { createClient } = supabase;
  const client = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

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
    } else {
      balanceNote.textContent = 'Secure payment powered by Stripe.';
      payBtn.disabled = false;
      payBtn.textContent = 'Pay balance with card';
    }
  }

  async function loadBalance(session) {
    const { data, error } = await client
      .from('client_accounts')
      .select('balance_cents, currency, full_name, first_name, last_name')
      .eq('id', session.user.id)
      .maybeSingle();

    if (error) {
      balanceEl.textContent = '—';
      balanceNote.textContent = 'Could not load balance. Please try again or contact us.';
      payBtn.disabled = true;
      return;
    }

    if (!data) {
      balanceEl.textContent = '—';
      balanceNote.textContent =
        'Your account is not set up yet. Email Jeanie@MartinsGlobalTravels.com or call (508) 232-3003.';
      payBtn.disabled = true;
      return;
    }

    renderBalance({
      first_name: data.first_name,
      last_name: data.last_name,
      full_name: data.full_name || session.user.email?.split('@')[0],
      balance_cents: data.balance_cents,
      currency: data.currency,
    });
  }

  function showDashboard() {
    loginView.hidden = true;
    dashView.hidden = false;
    document.getElementById('nav').classList.add('dark');
  }

  function showLogin() {
    loginView.hidden = false;
    dashView.hidden = true;
    showError('');
    hidePasswordModal();
  }

  function showDashboardSession(session) {
    showDashboard();
    if (mustChangePassword(session.user)) {
      showPasswordModal({ required: true });
      return;
    }
    loadBalance(session);
  }

  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    showError('');
    const email = $('login-email').value.trim();
    const password = $('login-password').value;
    const btn = loginForm.querySelector('button[type=submit]');
    btn.disabled = true;
    btn.textContent = 'Signing in…';

    const { data, error } = await client.auth.signInWithPassword({ email, password });

    btn.disabled = false;
    btn.textContent = 'Sign in';

    if (error) {
      showError(error.message === 'Invalid login credentials' ? 'Invalid email or password.' : error.message);
      return;
    }

    showDashboardSession(data.session);
  });

  $('forgot-toggle')?.addEventListener('click', () => {
    const panel = $('forgot-panel');
    const open = !panel.hidden;
    panel.hidden = open;
    $('forgot-toggle').textContent = open ? 'Forgot password?' : 'Back to sign in';
    if (!open) {
      $('forgot-email').value = $('login-email').value.trim();
    }
  });

  $('forgot-send-btn')?.addEventListener('click', async () => {
    const email = $('forgot-email').value.trim();
    const msg = $('forgot-msg');
    msg.hidden = true;
    if (!email) {
      msg.textContent = 'Enter your email address.';
      msg.hidden = false;
      return;
    }
    const btn = $('forgot-send-btn');
    btn.disabled = true;
    btn.textContent = 'Sending…';

    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: portalRedirectUrl(),
    });

    btn.disabled = false;
    btn.textContent = 'Send reset link';

    if (error) {
      msg.style.color = '#e88';
      msg.textContent = error.message;
      msg.hidden = false;
      return;
    }

    msg.style.color = '';
    msg.textContent = 'Check your email for a password reset link.';
    msg.hidden = false;
  });

  $('pw-save-btn')?.addEventListener('click', saveNewPassword);
  pwCancelBtn?.addEventListener('click', hidePasswordModal);
  changePwBtn?.addEventListener('click', () => showPasswordModal({ required: false }));

  logoutBtn?.addEventListener('click', async () => {
    await client.auth.signOut();
    showLogin();
    showBanner('');
  });

  payBtn?.addEventListener('click', async () => {
    const { data: sessionData } = await client.auth.getSession();
    const session = sessionData?.session;
    if (!session) {
      showLogin();
      return;
    }

    payBtn.disabled = true;
    payBtn.textContent = 'Redirecting to Stripe…';

    try {
      const res = await fetch('/.netlify/functions/create-checkout', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + session.access_token,
          'Content-Type': 'application/json',
        },
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

  const params = new URLSearchParams(window.location.search);
  const paidReturn = params.get('paid') === '1';
  const sessionId = params.get('session_id');
  const canceledReturn = params.get('canceled') === '1';

  if (paidReturn || canceledReturn) {
    history.replaceState({}, '', 'portal.html');
  }

  async function confirmPaidSession(session) {
    if (!session) return;
    showBanner('Thank you — confirming your payment…', 'success');

    if (sessionId) {
      try {
        const res = await fetch('/.netlify/functions/confirm-payment', {
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + session.access_token,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sessionId }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Could not confirm payment');
        await loadBalance(session);
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

    setTimeout(() => loadBalance(session), 2000);
    setTimeout(() => loadBalance(session), 6000);
  }

  if (paidReturn) {
    client.auth.getSession().then(({ data }) => {
      if (data.session) confirmPaidSession(data.session);
    });
  } else if (canceledReturn) {
    showBanner('Payment canceled. Your balance is unchanged.', 'warn');
  }

  client.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY' && session) {
      showDashboard();
      showPasswordModal({ required: true, recovery: true });
      return;
    }
    if (session) {
      if (mustChangePassword(session.user) && !pwModalRequired) {
        showDashboard();
        showPasswordModal({ required: true });
      } else if (!pwModalRequired) {
        showDashboardSession(session);
      }
    } else {
      showLogin();
    }
  });

  client.auth.getSession().then(({ data }) => {
    if (data.session) showDashboardSession(data.session);
    else showLogin();
  });
})();
