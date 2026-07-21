(function () {
  const $ = (id) => document.getElementById(id);
  const API = {
    search: '/api/flight-search',
    airports: '/api/airport-search',
    flightCheckout: '/api/create-flight-checkout',
  };

  let selectedOffer = null;
  let searchResults = [];
  let calendar = null;

  const params = new URLSearchParams(window.location.search);
  if (params.get('booked') === '1') {
    showBanner('Payment received! Jeanie will confirm your booking within 24 hours.', 'success');
    history.replaceState({}, '', 'book.html');
  } else if (params.get('canceled') === '1') {
    showBanner('Checkout canceled — no charge was made.', 'warn');
    history.replaceState({}, '', 'book.html');
  }

  function showBanner(text, type) {
    const el = $('book-banner');
    if (!el) return;
    el.textContent = text;
    el.className = 'book-banner ' + (type || '');
    el.hidden = !text;
  }

  document.querySelectorAll('.trip-type-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.trip-type-btn').forEach((b) => b.classList.remove('on'));
      btn.classList.add('on');
      calendar?.setTripType(btn.dataset.trip === 'oneway' ? 'oneway' : 'roundtrip');
    });
  });

  if (window.BookCalendar) {
    calendar = new BookCalendar({
      departHidden: $('flight-depart'),
      returnHidden: $('flight-return'),
      datesTrigger: $('dates-trigger'),
      popover: $('calendar-popover'),
      minLeadDays: 1,
    });
  }

  function renderAcList(list, airports, onPick) {
    list.innerHTML = '';
    airports.forEach((a) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ac-item';
      const cityLine = a.city || a.name;
      const loc = [a.stateName || a.state, a.country].filter(Boolean).join(' · ');
      const nameLine = a.name + (loc ? ' · ' + loc : '');
      btn.innerHTML =
        '<span class="ac-code">' +
        a.code +
        '</span><span class="ac-detail"><span class="ac-city">' +
        cityLine +
        '</span><span class="ac-name">' +
        nameLine +
        '</span></span>';
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        onPick(a);
      });
      list.appendChild(btn);
    });
    list.hidden = !list.children.length;
  }

  const AC_MIN_CHARS = 2;
  const AC_DEBOUNCE_MS = 350;

  function setupAirportInput(inputId, listId, hiddenId) {
    const input = $(inputId);
    const list = $(listId);
    const hidden = $(hiddenId);
    if (!input || !list) return;

    let timer = null;
    let activeIdx = -1;
    let reqId = 0;

    function pick(a) {
      const displayCity = a.city || a.name || a.code;
      input.value = displayCity + ' (' + a.code + ')';
      hidden.value = a.code;
      list.hidden = true;
      activeIdx = -1;
    }

    function hideList() {
      list.hidden = true;
      list.innerHTML = '';
      activeIdx = -1;
    }

    async function showSuggestions(q) {
      if (q.length < AC_MIN_CHARS) {
        hideList();
        return;
      }

      if (window.MGTAirportSearch) await MGTAirportSearch.ready;

      const myReq = ++reqId;
      const airports = window.MGTAirportSearch
        ? MGTAirportSearch.search(q, 22)
        : [];

      if (myReq !== reqId) return;
      renderAcList(list, airports, pick);
      activeIdx = -1;
    }

    input.addEventListener('input', () => {
      hidden.value = '';
      clearTimeout(timer);
      const q = input.value.trim();
      if (q.length < AC_MIN_CHARS) {
        hideList();
        return;
      }
      timer = setTimeout(() => showSuggestions(q), AC_DEBOUNCE_MS);
    });

    input.addEventListener('focus', () => {
      const q = input.value.trim();
      if (q.length >= AC_MIN_CHARS) showSuggestions(q);
    });

    input.addEventListener('keydown', (e) => {
      const items = list.querySelectorAll('.ac-item');
      if (list.hidden || !items.length) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeIdx = Math.min(activeIdx + 1, items.length - 1);
        items.forEach((el, i) => el.classList.toggle('active', i === activeIdx));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeIdx = Math.max(activeIdx - 1, 0);
        items.forEach((el, i) => el.classList.toggle('active', i === activeIdx));
      } else if (e.key === 'Enter' && activeIdx >= 0) {
        e.preventDefault();
        items[activeIdx].click();
      } else if (e.key === 'Escape') list.hidden = true;
    });

    input.addEventListener('blur', () => setTimeout(() => (list.hidden = true), 200));
  }

  setupAirportInput('from-input', 'from-list', 'from-code');
  setupAirportInput('to-input', 'to-list', 'to-code');

  $('swap-airports')?.addEventListener('click', () => {
    const fi = $('from-input');
    const ti = $('to-input');
    const fc = $('from-code');
    const tc = $('to-code');
    [fi.value, ti.value] = [ti.value, fi.value];
    [fc.value, tc.value] = [tc.value, fc.value];
  });

  function getTripType() {
    return document.querySelector('.trip-type-btn.on')?.dataset.trip || 'roundtrip';
  }

  function formatTime(iso) {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  }

  function renderResults(offers) {
    const wrap = $('flight-results');
    const empty = $('flight-empty');
    if (!wrap) return;

    $('dest-showcase')?.toggleAttribute('hidden', offers.length > 0);

    if (!offers.length) {
      wrap.innerHTML = '';
      if (empty) empty.hidden = false;
      return;
    }

    if (empty) empty.hidden = true;
    wrap.innerHTML = offers
      .map(
        (o, i) => `
      <article class="result-card" data-idx="${i}">
        <div class="result-main">
          <div class="result-airline">${o.airline || 'Flight'}</div>
          <div class="result-legs">
            <div class="result-leg">
              <div class="leg-label">Depart</div>
              <div class="leg-route">${o.outbound?.from} → ${o.outbound?.to}</div>
              <div class="leg-time">${formatTime(o.outbound?.departAt)}</div>
              <div class="leg-meta">${o.outbound?.duration || ''} · ${o.outbound?.stops === 0 ? 'Nonstop' : o.outbound?.stops + ' stop(s)'}</div>
            </div>
            ${
              o.inbound
                ? `<div class="result-leg">
              <div class="leg-label">Return</div>
              <div class="leg-route">${o.inbound.from} → ${o.inbound.to}</div>
              <div class="leg-time">${formatTime(o.inbound.departAt)}</div>
              <div class="leg-meta">${o.inbound.duration || ''} · ${o.inbound.stops === 0 ? 'Nonstop' : o.inbound.stops + ' stop(s)'}</div>
            </div>`
                : ''
            }
          </div>
        </div>
        <div class="result-buy">
          <div class="result-price">${o.priceDisplay}</div>
          <div class="result-per">total per person · incl. 6% service fee</div>
          <button type="button" class="result-select" data-idx="${i}">Select</button>
        </div>
      </article>`
      )
      .join('');

    wrap.querySelectorAll('.result-select').forEach((btn) => {
      btn.addEventListener('click', () => openCheckout(parseInt(btn.dataset.idx, 10)));
    });
  }

  function sortResults(mode) {
    if (!searchResults.length) return;
    const sorted = [...searchResults];
    if (mode === 'price') sorted.sort((a, b) => a.priceTotal - b.priceTotal);
    else if (mode === 'duration') {
      sorted.sort((a, b) => (a.outbound?.duration || '').localeCompare(b.outbound?.duration || ''));
    }
    searchResults = sorted;
    renderResults(searchResults);
  }

  document.querySelectorAll('.sort-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.sort-btn').forEach((b) => b.classList.remove('on'));
      btn.classList.add('on');
      sortResults(btn.dataset.sort);
    });
  });

  $('flight-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('flight-search-err');
    if (err) err.hidden = true;

    if (!$('flight-depart').value) {
      if (err) {
        err.textContent = 'Please select your travel dates.';
        err.hidden = false;
      }
      return;
    }

    if (getTripType() === 'roundtrip' && !$('flight-return').value) {
      if (err) {
        err.textContent = 'Please select a return date on the calendar.';
        err.hidden = false;
      }
      return;
    }

    const origin = $('from-code').value || $('from-input').value.trim().slice(0, 3).toUpperCase();
    const destination = $('to-code').value || $('to-input').value.trim().slice(0, 3).toUpperCase();

    if (origin.length !== 3 || destination.length !== 3) {
      if (err) {
        err.textContent = 'Pick an airport from the suggestions (city name or code).';
        err.hidden = false;
      }
      return;
    }

    const tripType = getTripType();
    const btn = $('flight-search-btn');
    btn.disabled = true;
    btn.textContent = 'Searching…';
    $('flight-results-wrap').hidden = false;
    $('dest-showcase')?.setAttribute('hidden', '');
    $('flight-results-wrap').scrollIntoView({ behavior: 'smooth', block: 'start' });

    try {
      const res = await fetch(API.search, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin,
          destination,
          departureDate: $('flight-depart').value,
          returnDate: tripType === 'roundtrip' ? $('flight-return').value : '',
          adults: $('flight-adults').value,
          travelClass: $('flight-class').value,
          tripType,
          nonStop: $('flight-nonstop').checked,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Search failed');

      searchResults = data.offers || [];
      renderResults(searchResults);
      $('results-count').textContent =
        searchResults.length + ' flight' + (searchResults.length !== 1 ? 's' : '') + ' found';
    } catch (ex) {
      searchResults = [];
      renderResults([]);
      if (err) {
        err.textContent = ex.message;
        err.hidden = false;
      }
    } finally {
      btn.disabled = false;
      btn.textContent = 'Search flights';
    }
  });

  function flightRouteLabel(offer) {
    if (!offer?.outbound) return 'Flight';
    let label = `${offer.outbound.from} → ${offer.outbound.to}`;
    if (offer.inbound) {
      label += ` · Return ${offer.inbound.from} → ${offer.inbound.to}`;
    }
    return label;
  }

  function renderCheckoutReceipt(offer) {
    return (
      '<div class="receipt-route">' +
      flightRouteLabel(offer) +
      '</div>' +
      '<table class="price-receipt">' +
      '<tbody>' +
      '<tr><td>Base fare</td><td>' +
      (offer.baseFareDisplay || '—') +
      '</td></tr>' +
      '<tr><td>Taxes &amp; carrier fees</td><td>' +
      (offer.taxesFeesDisplay || '—') +
      '</td></tr>' +
      '<tr class="receipt-sub"><td>Airline subtotal</td><td>' +
      (offer.airlineTotalDisplay || '—') +
      '</td></tr>' +
      '<tr><td>MGT service fee (6%)</td><td>' +
      (offer.serviceFeeDisplay || '—') +
      '</td></tr>' +
      '<tr class="receipt-total"><td>Total due</td><td>' +
      (offer.priceDisplay || '—') +
      '</td></tr>' +
      '</tbody></table>' +
      '<p class="receipt-note">Per traveler. Fare is subject to change until ticketed. Jeanie confirms within 24 hours.</p>'
    );
  }

  function checkoutPayload(offer) {
    return {
      id: offer.id,
      currency: offer.currency,
      airline: offer.airline,
      outbound: offer.outbound,
      inbound: offer.inbound,
      airlineTotalCents: offer.airlineTotalCents,
      baseFareCents: offer.baseFareCents,
      priceCents: offer.priceCents,
    };
  }

  function openCheckout(idx) {
    selectedOffer = searchResults[idx];
    if (!selectedOffer) return;
    $('checkout-summary').innerHTML = renderCheckoutReceipt(selectedOffer);
    $('checkout-pay').textContent = 'Pay ' + (selectedOffer.priceDisplay || '') + ' & book flight';
    $('checkout-modal').hidden = false;
    document.body.classList.add('modal-open');
  }

  function closeCheckout() {
    $('checkout-modal').hidden = true;
    document.body.classList.remove('modal-open');
  }

  $('checkout-close')?.addEventListener('click', closeCheckout);
  $('checkout-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'checkout-modal') closeCheckout();
  });

  $('checkout-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('checkout-pay');
    btn.disabled = true;
    btn.textContent = 'Redirecting to Stripe…';
    try {
      const res = await fetch(API.flightCheckout, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offer: checkoutPayload(selectedOffer),
          firstName: $('co-first').value.trim(),
          lastName: $('co-last').value.trim(),
          email: $('co-email').value.trim(),
          phone: $('co-phone').value.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Checkout failed');
      if (data.url) window.location.href = data.url;
    } catch (ex) {
      showBanner(ex.message, 'error');
      btn.disabled = false;
      btn.textContent = 'Pay ' + (selectedOffer?.priceDisplay || '') + ' & book flight';
    }
  });

  document.querySelectorAll('.route-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      $('from-input').value = chip.dataset.fromLabel || chip.dataset.from;
      $('from-code').value = chip.dataset.from;
      $('to-input').value = chip.dataset.toLabel || chip.dataset.to;
      $('to-code').value = chip.dataset.to;
    });
  });
})();
