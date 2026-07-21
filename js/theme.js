(function () {
  var KEY = 'mgt_theme';

  function getTheme() {
    try {
      return localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light';
    } catch (e) {
      return 'light';
    }
  }

  function applyTheme(theme) {
    var t = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', t);
    document.querySelectorAll('.theme-toggle').forEach(function (btn) {
      var isDark = t === 'dark';
      btn.classList.toggle('is-dark', isDark);
      btn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
      btn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
      var lbl = btn.querySelector('.theme-toggle-label');
      if (lbl) lbl.textContent = isDark ? 'Dark' : 'Light';
    });
  }

  function toggleTheme() {
    var next = getTheme() === 'dark' ? 'light' : 'dark';
    try {
      localStorage.setItem(KEY, next);
    } catch (e) {}
    applyTheme(next);
  }

  window.MGTTheme = { getTheme: getTheme, applyTheme: applyTheme, toggleTheme: toggleTheme };

  function bindToggles() {
    document.querySelectorAll('.theme-toggle').forEach(function (btn) {
      if (btn.dataset.bound) return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', toggleTheme);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      applyTheme(getTheme());
      bindToggles();
    });
  } else {
    applyTheme(getTheme());
    bindToggles();
  }
})();
