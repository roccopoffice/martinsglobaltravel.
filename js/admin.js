(function () {
  const $ = (id) => document.getElementById(id);
  const msgEl = $('msg');
  const loginSec = $('admin-login');
  const toolsSec = $('admin-tools');
  const mainEl = document.querySelector('main');
  let adminPassword = '';
  let clientsCache = [];
  let openClientEmail = null;

  function showMsg(text, ok) {
    if (!text) {
      msgEl.hidden = true;
      return;
    }
    msgEl.textContent = text;
    msgEl.className = 'msg ' + (ok ? 'ok' : 'err');
    msgEl.hidden = false;
  }

  async function api(path, body) {
    const res = await fetch('/api/' + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Request failed');
    return json;
  }

  function setBusy(btn, busy, label) {
    if (!btn) return;
    btn.disabled = busy;
    btn.textContent = busy ? 'Please wait…' : label;
  }

  function formatMoney(dollars) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
      parseFloat(dollars) || 0
    );
  }

  function switchTab(tabId) {
    document.querySelectorAll('.tab').forEach((t) => {
      t.classList.toggle('active', t.dataset.tab === tabId);
    });
    $('panel-add').hidden = tabId !== 'add';
    $('panel-list').hidden = tabId !== 'list';
    $('panel-balance').hidden = tabId !== 'balance';
    $('panel-credits').hidden = tabId !== 'credits';
    $('panel-giftcards').hidden = tabId !== 'giftcards';
    $('panel-analytics').hidden = tabId !== 'analytics';
    mainEl?.classList.toggle('wide', tabId === 'list' || tabId === 'analytics' || tabId === 'giftcards');
    if (tabId === 'list') loadClientList();
    if (tabId === 'analytics') loadAnalytics();
    if (tabId === 'giftcards') {
      loadGiftCards();
      loadGiftSettings();
    }
  }

  function formatDate(iso) {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  }

  function formatCount(n) {
    const num = Number(n);
    if (!Number.isFinite(num)) return '0';
    return num.toLocaleString('en-US');
  }

  function miniTable(rows, labelHeader, valueHeader) {
    if (!rows?.length) return '<p class="hint">No data yet.</p>';
    return `<table class="mini-table">
      <thead><tr><th>${escapeHtml(labelHeader)}</th><th>${escapeHtml(valueHeader)}</th></tr></thead>
      <tbody>${rows
        .map(
          (r) =>
            `<tr><td>${escapeHtml(r.label)}</td><td>${escapeHtml(formatCount(r.value))}</td></tr>`
        )
        .join('')}</tbody></table>`;
  }

  function renderSiteAnalytics(site) {
    if (!site?.configured) {
      return `
        <div class="site-section">
          <h3 class="lbl" style="margin-bottom:12px">Website traffic</h3>
          <div class="analytics-hint">${escapeHtml(site?.message || 'Website analytics is not set up yet. Your web person can follow SETUP-ANALYTICS.md.')}</div>
          <div class="link-list">
            <a href="https://app.netlify.com" target="_blank" rel="noopener">Netlify → Forms (enquiry submissions)</a>
            <a href="https://martinsglobaltravel.com" target="_blank" rel="noopener">View live website</a>
          </div>
        </div>`;
    }

    const s = site.last30Days || {};
    const t = site.today || {};

    return `
      <div class="site-section">
        <h3 class="lbl" style="margin-bottom:12px">Website traffic</h3>
        <div class="stat-grid">
          <div class="stat-box live-stat">
            <div class="stat-val"><span class="live-dot" aria-hidden="true"></span>${escapeHtml(formatCount(site.liveVisitors))}</div>
            <div class="stat-lbl">On site right now</div>
          </div>
          <div class="stat-box">
            <div class="stat-val">${escapeHtml(formatCount(t.pageViews))}</div>
            <div class="stat-lbl">Page views today</div>
          </div>
          <div class="stat-box">
            <div class="stat-val">${escapeHtml(formatCount(t.visitors))}</div>
            <div class="stat-lbl">Visitors today</div>
          </div>
          <div class="stat-box">
            <div class="stat-val">${escapeHtml(formatCount(s.pageViews))}</div>
            <div class="stat-lbl">Page views (30 days)</div>
          </div>
          <div class="stat-box">
            <div class="stat-val">${escapeHtml(formatCount(s.visitors))}</div>
            <div class="stat-lbl">Visitors (30 days)</div>
          </div>
          <div class="stat-box">
            <div class="stat-val">${escapeHtml(formatCount(s.sessions))}</div>
            <div class="stat-lbl">Sessions (30 days)</div>
          </div>
          <div class="stat-box">
            <div class="stat-val">${escapeHtml(String(s.bounceRate ?? 0))}%</div>
            <div class="stat-lbl">Bounce rate (30 days)</div>
          </div>
          <div class="stat-box">
            <div class="stat-val">${escapeHtml(String(s.avgSessionMinutes ?? 0))}m</div>
            <div class="stat-lbl">Avg. visit (30 days)</div>
          </div>
        </div>
        <div class="row-wrap" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:20px">
          <div>
            <h3 class="lbl" style="margin-bottom:8px">Top pages (30 days)</h3>
            ${miniTable(site.topPages, 'Page', 'Views')}
          </div>
          <div>
            <h3 class="lbl" style="margin-bottom:8px">How people found you (30 days)</h3>
            ${miniTable(site.topChannels, 'Channel', 'Sessions')}
          </div>
        </div>
        <div class="link-list" style="margin-top:16px">
          <a href="https://analytics.google.com" target="_blank" rel="noopener">Open full Google Analytics dashboard</a>
          <a href="https://app.netlify.com" target="_blank" rel="noopener">Netlify → Forms (enquiry submissions)</a>
        </div>
      </div>`;
  }

  async function loadAnalytics() {
    const body = $('analytics-body');
    if (!body || !adminPassword) return;

    body.className = 'list-loading';
    body.textContent = 'Loading analytics…';

    try {
      const json = await api('admin-get-analytics', { adminPassword });
      const p = json.portal || {};
      const site = json.site || {};

      const recent =
        (p.recentPayments || []).length > 0
          ? `<table class="pay-table">
          <thead><tr><th>Client</th><th>Amount</th><th>Date</th></tr></thead>
          <tbody>${p.recentPayments
            .map(
              (r) =>
                `<tr><td>${escapeHtml(r.name)}</td><td>${escapeHtml(formatMoney(r.amountDollars))}</td><td>${escapeHtml(formatDate(r.date))}</td></tr>`
            )
            .join('')}</tbody></table>`
          : '<p class="hint">No card payments recorded yet.</p>';

      body.className = '';
      body.innerHTML = `
        ${renderSiteAnalytics(site)}
        <h3 class="lbl" style="margin-bottom:12px">Portal summary</h3>
        <div class="stat-grid">
          <div class="stat-box"><div class="stat-val">${escapeHtml(String(p.totalClients ?? 0))}</div><div class="stat-lbl">Total clients</div></div>
          <div class="stat-box"><div class="stat-val">${escapeHtml(String(p.clientsWithBalance ?? 0))}</div><div class="stat-lbl">Owing balance</div></div>
          <div class="stat-box"><div class="stat-val">${escapeHtml(formatMoney(p.totalOwedDollars))}</div><div class="stat-lbl">Total owed</div></div>
          <div class="stat-box"><div class="stat-val">${escapeHtml(formatMoney(p.totalCollectedDollars))}</div><div class="stat-lbl">Collected (portal)</div></div>
        </div>
        <h3 class="lbl" style="margin-bottom:8px">Recent portal payments</h3>
        ${recent}
      `;
    } catch (e) {
      body.className = 'list-empty';
      body.textContent = e.message;
    }
  }

  function escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = s ?? '';
    return d.innerHTML;
  }

  function toggleClientRow(email) {
    const detail = document.querySelector(`tr.client-detail[data-email="${CSS.escape(email)}"]`);
    const row = document.querySelector(`tr.client-row[data-email="${CSS.escape(email)}"]`);
    if (!detail || !row) return;

    if (openClientEmail === email) {
      detail.hidden = true;
      row.classList.remove('open');
      openClientEmail = null;
      return;
    }

    document.querySelectorAll('tr.client-detail').forEach((el) => {
      el.hidden = true;
    });
    document.querySelectorAll('tr.client-row').forEach((el) => {
      el.classList.remove('open');
    });

    detail.hidden = false;
    row.classList.add('open');
    openClientEmail = email;
  }

  async function saveNotes(email, textarea, btn) {
    setBusy(btn, true, 'Save notes');
    try {
      const json = await api('admin-update-notes', {
        adminPassword,
        email,
        notes: textarea.value,
      });
      const client = clientsCache.find((c) => c.email === email);
      if (client) client.notes = textarea.value;
      showMsg(json.message, true);
    } catch (e) {
      showMsg(e.message, false);
    } finally {
      setBusy(btn, false, 'Save notes');
    }
  }

  function openBalanceTab(email, balance) {
    $('u-email').value = email;
    $('u-balance').value = balance;
    switchTab('balance');
    showMsg('Update the balance below, then click Update balance.', true);
  }

  function openCreditsTab(email) {
    $('cr-email').value = email;
    $('cr-amount').value = '';
    $('cr-action').value = 'add';
    switchTab('credits');
    showMsg('Enter the amount to send, then click Send credit.', true);
  }

  async function deleteClient(email, name, btn) {
    const label = name || email;
    const ok = window.confirm(
      `Remove ${label} from the portal?\n\nThis deletes their login and account. They will not be able to sign in again. This cannot be undone.`
    );
    if (!ok) return;

    setBusy(btn, true, 'Removing…');
    showMsg('');
    try {
      const json = await api('admin-delete-client', { adminPassword, email });
      showMsg(json.message, true);
      openClientEmail = null;
      loadClientList();
    } catch (e) {
      showMsg(e.message, false);
      setBusy(btn, false, 'Remove client');
    }
  }

  async function loadClientList() {
    const body = $('list-body');
    const countEl = $('list-count');
    if (!body || !adminPassword) return;

    body.className = 'list-loading';
    body.textContent = 'Loading clients…';
    if (countEl) countEl.textContent = '';
    openClientEmail = null;

    try {
      const json = await api('admin-list-clients', { adminPassword });
      clientsCache = json.clients || [];

      if (countEl) {
        countEl.textContent =
          clientsCache.length === 1 ? '1 client' : clientsCache.length + ' clients';
      }

      if (!clientsCache.length) {
        body.className = 'list-empty';
        body.textContent = 'No clients yet. Add one under Add client.';
        return;
      }

      const rows = clientsCache
        .map((c) => {
          const emailAttr = escapeHtml(c.email);
          return `
        <tr class="client-row" data-email="${emailAttr}">
          <td data-label="Name">${escapeHtml(c.name)}<span class="chev">▸</span></td>
          <td data-label="Email" class="email">${emailAttr}</td>
          <td data-label="Balance" class="bal">${escapeHtml(formatMoney(c.balanceDollars))}</td>
          <td data-label="Credit" class="bal credit">${escapeHtml(formatMoney(c.creditDollars))}</td>
        </tr>
        <tr class="client-detail" data-email="${emailAttr}" hidden>
          <td colspan="4">
            <div class="client-detail-panel">
              <label class="lbl">Staff notes (private — clients never see this)</label>
              <textarea class="inp notes-area" data-notes-for="${emailAttr}" placeholder="Trip details, preferences, payment reminders…">${escapeHtml(c.notes)}</textarea>
              <div class="detail-actions">
                <button type="button" class="btn btn-sm save-notes-btn" data-email="${emailAttr}">Save notes</button>
                <button type="button" class="btn btn-outline btn-sm balance-btn" data-email="${emailAttr}" data-balance="${escapeHtml(c.balanceDollars)}">Update balance</button>
                <button type="button" class="btn btn-outline btn-sm credit-btn" data-email="${emailAttr}">Send credit</button>
                <button type="button" class="btn btn-danger btn-sm delete-btn" data-email="${emailAttr}" data-name="${escapeHtml(c.name)}">Remove client</button>
              </div>
            </div>
          </td>
        </tr>`;
        })
        .join('');

      body.className = '';
      body.innerHTML = `
        <table class="client-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Balance owed</th>
              <th>Credit</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>`;

      body.querySelectorAll('tr.client-row').forEach((row) => {
        row.addEventListener('click', () => toggleClientRow(row.dataset.email));
      });

      body.querySelectorAll('.save-notes-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const email = btn.dataset.email;
          const textarea = body.querySelector(`textarea[data-notes-for="${CSS.escape(email)}"]`);
          saveNotes(email, textarea, btn);
        });
      });

      body.querySelectorAll('.balance-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          openBalanceTab(btn.dataset.email, btn.dataset.balance);
        });
      });

      body.querySelectorAll('.credit-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          openCreditsTab(btn.dataset.email);
        });
      });

      body.querySelectorAll('.delete-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          deleteClient(btn.dataset.email, btn.dataset.name, btn);
        });
      });

      body.querySelectorAll('tr.client-detail').forEach((row) => {
        row.addEventListener('click', (e) => e.stopPropagation());
      });
    } catch (e) {
      body.className = 'list-empty';
      body.textContent = e.message;
    }
  }

  $('admin-login-btn')?.addEventListener('click', async () => {
    const pw = $('admin-pw').value;
    if (!pw) {
      showMsg('Enter the admin password.', false);
      return;
    }
    const btn = $('admin-login-btn');
    setBusy(btn, true, 'Continue');
    showMsg('');
    try {
      await api('admin-verify', { adminPassword: pw });
      adminPassword = pw;
      loginSec.hidden = true;
      toolsSec.hidden = false;
      showMsg('Signed in. You can add clients or view the list.', true);
      loadClientList();
      if (location.hash === '#gift-cards') switchTab('giftcards');
    } catch (e) {
      showMsg(e.message, false);
    } finally {
      setBusy(btn, false, 'Continue');
    }
  });

  $('admin-pw')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') $('admin-login-btn').click();
  });

  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  $('refresh-list-btn')?.addEventListener('click', () => loadClientList());
  $('refresh-analytics-btn')?.addEventListener('click', () => loadAnalytics());

  $('create-btn')?.addEventListener('click', async () => {
    const btn = $('create-btn');
    setBusy(btn, true, 'Save client');
    showMsg('');
    try {
      const json = await api('admin-create-client', {
        adminPassword,
        firstName: $('c-first').value,
        lastName: $('c-last').value,
        email: $('c-email').value,
        password: $('c-pass').value,
        balanceDollars: $('c-balance').value,
      });
      showMsg(json.message, true);
      loadClientList();
    } catch (e) {
      showMsg(e.message, false);
    } finally {
      setBusy(btn, false, 'Save client');
    }
  });

  $('update-btn')?.addEventListener('click', async () => {
    const btn = $('update-btn');
    setBusy(btn, true, 'Update balance');
    showMsg('');
    try {
      const json = await api('admin-update-balance', {
        adminPassword,
        email: $('u-email').value,
        balanceDollars: $('u-balance').value,
      });
      showMsg(json.message, true);
      loadClientList();
    } catch (e) {
      showMsg(e.message, false);
    } finally {
      setBusy(btn, false, 'Update balance');
    }
  });

  $('send-credit-btn')?.addEventListener('click', async () => {
    const btn = $('send-credit-btn');
    const remove = $('cr-action').value === 'remove';
    const amount = $('cr-amount').value.trim();
    const email = $('cr-email').value.trim();

    if (!remove) {
      const ok = window.confirm(
        `Send ${formatMoney(amount)} in credit to ${email}?\n\nThey will be able to withdraw this to their bank account.`
      );
      if (!ok) return;
    }

    setBusy(btn, true, 'Send credit');
    showMsg('');
    try {
      const json = await api('admin-send-credit', {
        adminPassword,
        email,
        amountDollars: amount,
        note: $('cr-note').value,
        action: remove ? 'remove' : 'add',
      });
      showMsg(json.message, true);
      $('cr-amount').value = '';
      $('cr-note').value = '';
      loadClientList();
    } catch (e) {
      showMsg(e.message, false);
    } finally {
      setBusy(btn, false, 'Send credit');
    }
  });

  let giftCardsCache = [];

  function gcMoney(cents) {
    return formatMoney(((cents || 0) / 100).toFixed(2));
  }

  async function loadGiftCards() {
    const body = $('gc-list-body');
    if (!body || !adminPassword) return;
    body.className = 'list-loading';
    body.textContent = 'Loading gift cards…';
    try {
      const json = await api('admin-gift-cards-list', {
        adminPassword,
        q: $('gc-q')?.value || '',
      });
      giftCardsCache = json.giftCards || [];
      if (!giftCardsCache.length) {
        body.className = 'list-empty';
        body.textContent = 'No gift cards yet.';
        return;
      }
      body.className = '';
      body.innerHTML = `<table class="client-table">
        <thead><tr><th>Recipient</th><th>Type</th><th>Status</th><th>Balance</th><th></th></tr></thead>
        <tbody>${giftCardsCache
          .map(
            (c) => `<tr class="client-row" data-id="${escapeHtml(c.id)}">
              <td data-label="Recipient">${escapeHtml(c.recipientName || '')}<div class="email">${escapeHtml(c.recipientEmail || '')}</div></td>
              <td data-label="Type">${escapeHtml(c.type)}</td>
              <td data-label="Status">${escapeHtml(c.status)} · ••••${escapeHtml(c.codeLastFour || '')}</td>
              <td data-label="Balance" class="bal">${escapeHtml(gcMoney(c.currentBalanceCents))}</td>
              <td><button type="button" class="btn btn-sm gc-open" data-id="${escapeHtml(c.id)}">View</button></td>
            </tr>`
          )
          .join('')}</tbody></table>`;
      body.querySelectorAll('.gc-open').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          openGiftCard(btn.dataset.id);
        });
      });
    } catch (e) {
      body.className = 'list-empty';
      body.textContent = e.message;
    }
  }

  async function openGiftCard(id) {
    const wrap = $('gc-detail-body');
    wrap.hidden = false;
    wrap.innerHTML = '<p class="list-loading">Loading…</p>';
    try {
      const json = await api('admin-gift-cards-get', { adminPassword, id });
      const c = json.giftCard;
      const txs = json.transactions || [];
      const apps = json.applications || [];
      wrap.innerHTML = `
        <h3 class="lbl">Card ${escapeHtml(c.id.slice(0, 8))} · ••••${escapeHtml(c.codeLastFour || '')}</h3>
        <p class="hint">${escapeHtml(c.type)} · ${escapeHtml(c.status)} · Original ${escapeHtml(gcMoney(c.originalAmountCents))} · Remaining ${escapeHtml(gcMoney(c.currentBalanceCents))}<br>
        Recipient: ${escapeHtml(c.recipientName || '')} (${escapeHtml(c.recipientEmail || '')})<br>
        Payment: ${escapeHtml(c.paymentId || 'none')} · Stripe: ${escapeHtml(c.stripeSessionId || 'none')}</p>
        <div class="row row-wrap">
          <div>
            <label class="lbl" for="gc-adj-amt">Adjust amount ($)</label>
            <input class="inp" id="gc-adj-amt" inputmode="decimal">
          </div>
          <div>
            <label class="lbl" for="gc-adj-reason">Reason (required)</label>
            <input class="inp" id="gc-adj-reason" placeholder="Correction, goodwill…">
          </div>
        </div>
        <div class="detail-actions">
          <button type="button" class="btn btn-sm" id="gc-adj-add">Add</button>
          <button type="button" class="btn btn-outline btn-sm" id="gc-adj-remove">Remove</button>
          <button type="button" class="btn btn-outline btn-sm" id="gc-disable">${c.status === 'disabled' ? 'Re-enable' : 'Disable'}</button>
          <button type="button" class="btn btn-outline btn-sm" id="gc-resend">Resend email</button>
        </div>
        <h3 class="lbl" style="margin-top:18px">Ledger</h3>
        <table class="mini-table"><thead><tr><th>When</th><th>Type</th><th>Amount</th><th>Balance after</th></tr></thead>
        <tbody>${txs
          .map(
            (t) =>
              `<tr><td>${escapeHtml(formatDate(t.created_at))}</td><td>${escapeHtml(t.transaction_type)} — ${escapeHtml(t.reason || '')}</td><td>${escapeHtml(gcMoney(t.amount_cents))}</td><td>${escapeHtml(gcMoney(t.balance_after_cents))}</td></tr>`
          )
          .join('')}</tbody></table>
        <h3 class="lbl" style="margin-top:18px">Trip applications</h3>
        ${
          apps.length
            ? `<table class="mini-table"><thead><tr><th>When</th><th>Amount</th><th>Status</th><th></th></tr></thead><tbody>${apps
                .map(
                  (a) =>
                    `<tr><td>${escapeHtml(formatDate(a.created_at))}</td><td>${escapeHtml(gcMoney(a.amount_cents))}</td><td>${escapeHtml(a.status)}</td><td>${
                      a.status === 'applied'
                        ? `<button type="button" class="btn btn-sm gc-restore" data-id="${escapeHtml(a.id)}">Restore credit</button>`
                        : ''
                    }</td></tr>`
                )
                .join('')}</tbody></table>`
            : '<p class="hint">None yet.</p>'
        }`;
      $('gc-adj-add')?.addEventListener('click', () => adjustGift(id, 'add'));
      $('gc-adj-remove')?.addEventListener('click', () => adjustGift(id, 'remove'));
      $('gc-disable')?.addEventListener('click', () =>
        disableGift(id, c.status === 'disabled' ? 'active' : 'disabled')
      );
      $('gc-resend')?.addEventListener('click', () => resendGift(id));
      wrap.querySelectorAll('.gc-restore').forEach((btn) => {
        btn.addEventListener('click', () => restoreGift(btn.dataset.id));
      });
    } catch (e) {
      wrap.innerHTML = `<p class="msg err">${escapeHtml(e.message)}</p>`;
    }
  }

  async function adjustGift(id, action) {
    try {
      const json = await api('admin-gift-cards-adjust', {
        adminPassword,
        id,
        action,
        amountDollars: $('gc-adj-amt').value,
        reason: $('gc-adj-reason').value,
      });
      showMsg('Balance updated.', true);
      openGiftCard(json.giftCard.id);
      loadGiftCards();
    } catch (e) {
      showMsg(e.message, false);
    }
  }

  async function disableGift(id, status) {
    try {
      await api('admin-gift-cards-disable', {
        adminPassword,
        id,
        status,
        reason: status === 'disabled' ? 'Disabled by staff' : 'Re-enabled by staff',
      });
      showMsg(status === 'disabled' ? 'Card disabled.' : 'Card re-enabled.', true);
      openGiftCard(id);
      loadGiftCards();
    } catch (e) {
      showMsg(e.message, false);
    }
  }

  async function resendGift(id) {
    try {
      const json = await api('admin-gift-cards-resend', { adminPassword, id });
      showMsg(json.ok ? `Email queued for ${json.recipientEmail}.` : 'Resend attempted.', true);
    } catch (e) {
      showMsg(e.message, false);
    }
  }

  async function restoreGift(applicationId) {
    const reason = window.prompt('Reason for restoring this gift-card credit to the card (required):');
    if (!reason) return;
    try {
      const json = await api('admin-gift-cards-restore', { adminPassword, applicationId, reason });
      showMsg(`Restored ${gcMoney(json.restoredCents)} to the gift card.`, true);
      loadGiftCards();
    } catch (e) {
      showMsg(e.message, false);
    }
  }

  async function loadGiftSettings() {
    if (!adminPassword) return;
    try {
      const json = await api('admin-gift-cards-settings', { adminPassword });
      const s = json.raw || {};
      if ($('gc-min')) $('gc-min').value = ((s.min_amount_cents || 0) / 100).toFixed(2);
      if ($('gc-max')) $('gc-max').value = ((s.max_amount_cents || 0) / 100).toFixed(2);
      if ($('gc-combine')) $('gc-combine').checked = Number(s.allow_combine) === 1;
      if ($('gc-transfer')) $('gc-transfer').checked = Number(s.transferable) === 1;
    } catch {
      /* ignore until signed in */
    }
  }

  $('gc-search-btn')?.addEventListener('click', loadGiftCards);
  $('gc-q')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') loadGiftCards();
  });
  $('gc-export-btn')?.addEventListener('click', () => {
    const rows = [
      ['id', 'type', 'status', 'recipient', 'email', 'original', 'balance', 'last4', 'created'].join(','),
      ...giftCardsCache.map((c) =>
        [
          c.id,
          c.type,
          c.status,
          JSON.stringify(c.recipientName || ''),
          c.recipientEmail || '',
          (c.originalAmountCents || 0) / 100,
          (c.currentBalanceCents || 0) / 100,
          c.codeLastFour || '',
          c.createdAt || '',
        ].join(',')
      ),
    ];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'gift-cards.csv';
    a.click();
  });
  $('gc-issue-btn')?.addEventListener('click', async () => {
    const btn = $('gc-issue-btn');
    setBusy(btn, true, 'Issue promotional credit');
    try {
      const json = await api('admin-gift-cards-issue', {
        adminPassword,
        recipientName: $('gc-issue-name').value,
        recipientEmail: $('gc-issue-email').value,
        amountDollars: $('gc-issue-amount').value,
        giftMessage: $('gc-issue-msg').value,
        reason: $('gc-issue-msg').value || 'Promotional travel credit',
      });
      showMsg(json.message, true);
      const codeEl = $('gc-issue-code');
      codeEl.hidden = false;
      codeEl.textContent = 'Give the recipient this code: ' + json.code;
      loadGiftCards();
    } catch (e) {
      showMsg(e.message, false);
    } finally {
      setBusy(btn, false, 'Issue promotional credit');
    }
  });
  $('gc-save-settings')?.addEventListener('click', async () => {
    try {
      await api('admin-gift-cards-settings', {
        adminPassword,
        save: true,
        min_amount_cents: Math.round(parseFloat($('gc-min').value || '0') * 100),
        max_amount_cents: Math.round(parseFloat($('gc-max').value || '0') * 100),
        allow_combine: $('gc-combine').checked ? 1 : 0,
        transferable: $('gc-transfer').checked ? 1 : 0,
      });
      showMsg('Gift card policy saved.', true);
    } catch (e) {
      showMsg(e.message, false);
    }
  });

  $('logout-btn')?.addEventListener('click', () => {
    adminPassword = '';
    toolsSec.hidden = true;
    loginSec.hidden = false;
    $('admin-pw').value = '';
    mainEl?.classList.remove('wide');
    showMsg('');
  });
})();
