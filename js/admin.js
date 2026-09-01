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
    $('panel-agency').hidden = tabId !== 'agency';
    $('panel-analytics').hidden = tabId !== 'analytics';
    mainEl?.classList.toggle('wide', tabId === 'list' || tabId === 'analytics');
    if (tabId === 'list') loadClientList();
    if (tabId === 'agency') loadAgencyLink();
    if (tabId === 'analytics') loadAnalytics();
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

  function renderAgencyPayments(payments) {
    const box = $('agency-payments');
    if (!box) return;
    if (!payments?.length) {
      box.innerHTML = '<p class="hint" style="margin-top:14px">No send-money payments yet.</p>';
      return;
    }
    box.innerHTML =
      '<p class="hint" style="margin-top:14px">Payments received through the agency link</p>' +
      payments
        .slice(0, 10)
        .map(
          (p) =>
            `<p class="hint">${escapeHtml(formatMoney(((p.amount_cents || 0) / 100).toFixed(2)))} · ${escapeHtml(p.status || '')} · ${escapeHtml(p.created_at || '')}</p>`
        )
        .join('');
  }

  async function loadAgencyLink(action) {
    if (!adminPassword) return;
    const statusEl = $('agency-status');
    const urlEl = $('agency-url');
    const receivedEl = $('agency-received');
    try {
      const json = await api('admin-send-money', {
        adminPassword,
        target: 'agency',
        ...(action ? { action } : {}),
      });
      if (urlEl) urlEl.value = json.url || '';
      if (statusEl) {
        statusEl.textContent = json.status
          ? `Link is ${json.status}.`
          : 'No link yet. Generate one to share.';
      }
      if (receivedEl) {
        receivedEl.textContent =
          'Money received: ' + formatMoney(((json.receivedCents || 0) / 100).toFixed(2));
      }
      renderAgencyPayments(json.payments || []);
      return json;
    } catch (e) {
      if (statusEl) statusEl.textContent = e.message;
      throw e;
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
              <p class="hint" style="margin-top:16px">Send money link${c.sendLinkStatus ? ` · ${escapeHtml(c.sendLinkStatus)}` : ''} · received ${escapeHtml(formatMoney(((c.sendReceivedCents || 0) / 100).toFixed(2)))}</p>
              <input class="inp" readonly data-send-url="${emailAttr}" value="${c.sendToken ? escapeHtml(location.origin + '/send/' + c.sendToken) : ''}">
              <div class="detail-actions">
                <button type="button" class="btn btn-sm btn-outline copy-send-btn" data-email="${emailAttr}">Copy link</button>
                <button type="button" class="btn btn-sm btn-outline gen-send-btn" data-email="${emailAttr}">Generate link</button>
                <button type="button" class="btn btn-sm btn-outline disable-send-btn" data-email="${emailAttr}">Disable link</button>
              </div>
              ${(c.sendPayments || []).length
                ? `<p class="hint" style="margin-top:14px">Payments received through the link</p>${c.sendPayments
                    .slice(0, 10)
                    .map(
                      (p) =>
                        `<p class="hint">${escapeHtml(formatMoney(((p.amountCents || 0) / 100).toFixed(2)))} · ${escapeHtml(p.status)} · ${escapeHtml(p.createdAt || '')}</p>`
                    )
                    .join('')}`
                : '<p class="hint" style="margin-top:14px">No send-money payments yet.</p>'}
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

      body.querySelectorAll('.copy-send-btn').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const input = body.querySelector(`input[data-send-url="${CSS.escape(btn.dataset.email)}"]`);
          if (!input?.value) {
            showMsg('Generate a link first.', false);
            return;
          }
          try {
            await navigator.clipboard.writeText(input.value);
            showMsg('Send-money link copied.', true);
          } catch {
            input.select();
            showMsg('Copy the link from the box.', true);
          }
        });
      });

      body.querySelectorAll('.gen-send-btn').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          try {
            const json = await api('admin-send-money', {
              adminPassword,
              email: btn.dataset.email,
              action: 'generate',
            });
            showMsg('Send-money link ready for ' + json.client.name + '.', true);
            loadClientList();
          } catch (err) {
            showMsg(err.message, false);
          }
        });
      });

      body.querySelectorAll('.disable-send-btn').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          try {
            await api('admin-send-money', {
              adminPassword,
              email: btn.dataset.email,
              action: 'disable',
            });
            showMsg('Send-money link disabled.', true);
            loadClientList();
          } catch (err) {
            showMsg(err.message, false);
          }
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

  $('agency-copy-btn')?.addEventListener('click', async () => {
    const input = $('agency-url');
    if (!input?.value) {
      showMsg('Generate a link first.', false);
      return;
    }
    try {
      await navigator.clipboard.writeText(input.value);
      showMsg('Agency send-money link copied.', true);
    } catch {
      input.select();
      showMsg('Copy the link from the box.', true);
    }
  });

  $('agency-gen-btn')?.addEventListener('click', async () => {
    const btn = $('agency-gen-btn');
    setBusy(btn, true, 'Generate link');
    showMsg('');
    try {
      await loadAgencyLink('generate');
      showMsg('Agency send-money link is ready.', true);
    } catch (e) {
      showMsg(e.message, false);
    } finally {
      setBusy(btn, false, 'Generate link');
    }
  });

  $('agency-disable-btn')?.addEventListener('click', async () => {
    const btn = $('agency-disable-btn');
    setBusy(btn, true, 'Disable link');
    showMsg('');
    try {
      await loadAgencyLink('disable');
      showMsg('Agency send-money link disabled.', true);
    } catch (e) {
      showMsg(e.message, false);
    } finally {
      setBusy(btn, false, 'Disable link');
    }
  });

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

  $('logout-btn')?.addEventListener('click', () => {
    adminPassword = '';
    toolsSec.hidden = true;
    loginSec.hidden = false;
    $('admin-pw').value = '';
    mainEl?.classList.remove('wide');
    showMsg('');
  });
})();
