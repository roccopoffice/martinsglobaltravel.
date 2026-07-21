/**
 * Expedia-style date picker — one button, range on single calendar.
 */
(function (global) {
  const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  function pad(n) {
    return n < 10 ? '0' + n : String(n);
  }

  function toIso(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function parseIso(s) {
    if (!s) return null;
    const p = s.split('-').map(Number);
    if (p.length !== 3) return null;
    return new Date(p[0], p[1] - 1, p[2]);
  }

  function fmtShort(iso) {
    const d = parseIso(iso);
    if (!d) return '';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function fmtDisplay(iso) {
    const d = parseIso(iso);
    if (!d) return '';
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  function addDays(d, n) {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
  }

  function sameDay(a, b) {
    return a && b && toIso(a) === toIso(b);
  }

  function between(d, start, end) {
    if (!start || !end || !d) return false;
    const t = d.getTime();
    return t >= start.getTime() && t <= end.getTime();
  }

  function BookCalendar(opts) {
    this.departInput = opts.departHidden;
    this.returnInput = opts.returnHidden;
    this.datesTrigger = opts.datesTrigger;
    this.popover = opts.popover;
    this.minLeadDays = opts.minLeadDays ?? 1;

    this.tripType = 'roundtrip';
    this.view = new Date();
    this.view.setDate(1);
    this.depart = null;
    this.return = null;
    this.pickStep = 'depart';

    this._bind();
    this._loadFromInputs();
    this._render();
    this._syncTrigger();
  }

  BookCalendar.prototype._loadFromInputs = function () {
    this.depart = parseIso(this.departInput?.value);
    this.return = parseIso(this.returnInput?.value);
  };

  BookCalendar.prototype.setTripType = function (type) {
    this.tripType = type;
    if (type === 'oneway') {
      this.return = null;
      if (this.returnInput) this.returnInput.value = '';
    }
    this.pickStep = 'depart';
    this._render();
    this._syncTrigger();
  };

  BookCalendar.prototype.getMinDate = function () {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return addDays(d, this.minLeadDays);
  };

  BookCalendar.prototype._bind = function () {
    const self = this;

    this.datesTrigger?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      self._loadFromInputs();
      // Always start from departure so users can change either date when reopening
      self.pickStep = 'depart';
      self._togglePopover(true);
    });

    this.popover?.querySelector('.cal-prev')?.addEventListener('click', (e) => {
      e.stopPropagation();
      self.view.setMonth(self.view.getMonth() - 1);
      self._render();
    });

    this.popover?.querySelector('.cal-next')?.addEventListener('click', (e) => {
      e.stopPropagation();
      self.view.setMonth(self.view.getMonth() + 1);
      self._render();
    });

    document.addEventListener('click', (e) => {
      if (!self.popover || self.popover.hidden) return;
      if (self.popover.contains(e.target) || self.datesTrigger?.contains(e.target)) return;
      self._togglePopover(false);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') self._togglePopover(false);
    });
  };

  BookCalendar.prototype._togglePopover = function (open) {
    if (!this.popover) return;
    this.popover.hidden = !open;
    if (open) this._render();
  };

  BookCalendar.prototype._syncTrigger = function () {
    if (!this.datesTrigger) return;
    const dep = this.departInput?.value;
    const ret = this.returnInput?.value;
    let label = 'Select dates';
    if (dep && ret && this.tripType === 'roundtrip') {
      label = fmtShort(dep) + '  →  ' + fmtShort(ret);
    } else if (dep) {
      label = this.tripType === 'oneway' ? fmtDisplay(dep) : fmtShort(dep) + '  →  Return';
    }
    this.datesTrigger.textContent = label;
    this.datesTrigger.classList.toggle('has-val', !!dep);
  };

  BookCalendar.prototype._selectDate = function (d) {
    const min = this.getMinDate();
    if (d < min) return;

    if (this.tripType === 'oneway') {
      this.depart = d;
      this.departInput.value = toIso(d);
      this._syncTrigger();
      this._togglePopover(false);
      return;
    }

    // Round-trip: first click (or reopen) always sets departure and clears return
    if (this.pickStep === 'depart') {
      this.depart = d;
      this.return = null;
      this.departInput.value = toIso(d);
      this.returnInput.value = '';
      this.pickStep = 'return';
      this._syncTrigger();
      this._render();
      return;
    }

    // Return step — pick return date
    if (d < this.depart) {
      // Clicked before current departure — treat as new departure
      this.depart = d;
      this.return = null;
      this.departInput.value = toIso(d);
      this.returnInput.value = '';
      this.pickStep = 'return';
    } else if (sameDay(d, this.depart)) {
      this.return = d;
      this.returnInput.value = toIso(d);
      this._syncTrigger();
      this._togglePopover(false);
    } else {
      this.return = d;
      this.returnInput.value = toIso(d);
      this._syncTrigger();
      this._togglePopover(false);
    }
    this._render();
    this._syncTrigger();
  };

  BookCalendar.prototype._monthHtml = function (year, month) {
    const min = this.getMinDate();
    const first = new Date(year, month, 1);
    const startPad = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let html =
      '<div class="cal-month"><div class="cal-month-title">' +
      MONTHS[month] +
      ' ' +
      year +
      '</div><div class="cal-grid">';

    DAYS.forEach((d) => {
      html += '<div class="cal-dow">' + d + '</div>';
    });

    for (let i = 0; i < startPad; i++) html += '<div class="cal-day empty"></div>';

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const iso = toIso(date);
      const disabled = date < min;
      let cls = 'cal-day';
      if (disabled) cls += ' disabled';
      if (sameDay(date, this.depart)) cls += ' start';
      if (sameDay(date, this.return)) cls += ' end';
      if (this.depart && this.return && between(date, this.depart, this.return)) cls += ' in-range';
      else if (this.depart && !this.return && sameDay(date, this.depart)) cls += ' selected';

      html +=
        '<button type="button" class="' +
        cls +
        '" data-iso="' +
        iso +
        '"' +
        (disabled ? ' disabled' : '') +
        '>' +
        day +
        '</button>';
    }

    html += '</div></div>';
    return html;
  };

  BookCalendar.prototype._render = function () {
    if (!this.popover) return;

    const hint = this.popover.querySelector('.cal-hint');
    if (hint) {
      const hasBoth = this.depart && this.return;
      const hasDepart = this.depart && !this.return;
      hint.textContent =
        this.tripType === 'oneway'
          ? 'Choose your departure date'
          : this.pickStep === 'depart'
            ? hasBoth || hasDepart
              ? 'Choose a new departure date'
              : 'Choose departure date — then return'
            : 'Choose your return date';
    }

    const monthsEl = this.popover.querySelector('.cal-months');
    if (!monthsEl) return;

    const y = this.view.getFullYear();
    const m = this.view.getMonth();
    const second = new Date(y, m + 1, 1);

    monthsEl.innerHTML =
      this._monthHtml(y, m) + this._monthHtml(second.getFullYear(), second.getMonth());

    monthsEl.querySelectorAll('.cal-day:not(.empty):not(.disabled)').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const d = parseIso(btn.dataset.iso);
        if (d) this._selectDate(d);
      });
    });
  };

  global.BookCalendar = BookCalendar;
})(window);
