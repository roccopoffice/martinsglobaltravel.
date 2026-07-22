#!/usr/bin/env python3
"""Add i18n + lang switcher to book.html and portal.html."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LANG_OPTS = '<option value="en">English</option><option value="es">Español</option><option value="pt">Português</option><option value="ht">Kreyòl</option><option value="kea">Kabuverdianu</option><option value="fr">Français</option><option value="zh">中文</option>'

LANG_CSS = """
.lang-switcher{display:flex;align-items:center;flex-shrink:0}
.lang-select{appearance:none;font-family:'DM Sans',sans-serif;font-size:10px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:var(--dim);background:rgba(255,255,255,.06) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23c9a84c' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E") no-repeat right 8px center/10px;border:1px solid var(--border);padding:8px 26px 8px 12px;cursor:pointer}
.lang-select option{color:var(--ink);background:#fff}
.mob .lang-switcher{padding:16px 0;border-bottom:1px solid var(--border);margin-bottom:8px}
.mob .lang-select{width:100%;font-size:12px;padding:12px 28px 12px 14px}
.visually-hidden{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
"""

LANG_DESKTOP = f'''<div class="lang-switcher">
      <label class="visually-hidden" for="lang-select-desktop" data-i18n="a11y.langSwitcher">Select language</label>
      <select id="lang-select-desktop" class="lang-select" aria-label="Select language" data-i18n-aria="a11y.langSwitcher">{LANG_OPTS}</select>
    </div>'''

LANG_MOBILE = f'''<div class="lang-switcher">
    <label class="visually-hidden" for="lang-select-mobile" data-i18n="a11y.langSwitcher">Select language</label>
    <select id="lang-select-mobile" class="lang-select" aria-label="Select language" data-i18n-aria="a11y.langSwitcher">{LANG_OPTS}</select>
  </div>'''

SCRIPTS = '\n<script src="i18n/translations.js"></script>\n<script src="i18n.js"></script>\n'

NAV_LINKS = '''    <div class="nav-links">
      <a href="index.html" data-i18n="nav.home">Home</a>
      <a href="index.html#destinations" data-i18n="nav.destinations">Destinations</a>
      <a href="index.html#packages" data-i18n="nav.packages">Packages</a>
      <a href="index.html#faq" data-i18n="nav.faq">FAQ</a>
      <a href="index.html#about" data-i18n="nav.about">About</a>
      <a href="index.html#contact" data-i18n="nav.contact">Contact</a>
      <a href="portal.html" data-i18n="nav.portal">Client Portal</a>
    </div>'''

MOB_LINKS = '''  <a href="index.html" data-i18n="nav.home">Home</a>
  <a href="index.html#destinations" data-i18n="nav.destinations">Destinations</a>
  <a href="index.html#packages" data-i18n="nav.packages">Packages</a>
  <a href="index.html#faq" data-i18n="nav.faq">FAQ</a>
  <a href="index.html#about" data-i18n="nav.about">About</a>
  <a href="index.html#contact" data-i18n="nav.contact">Contact</a>
  <a href="portal.html" data-i18n="nav.portal">Client Portal</a>'''


def patch_file(path: Path, nav_sub_key: str, nav_sub_text: str, cta_href: str):
    html = path.read_text(encoding="utf-8")
    if ".lang-select" not in html:
        html = html.replace("</style>", LANG_CSS + "</style>", 1)
    if "lang-select-desktop" not in html:
        html = html.replace(
            '<button type="button" class="theme-toggle"',
            LANG_DESKTOP + '\n    <button type="button" class="theme-toggle"',
            1,
        )
    if "lang-select-mobile" not in html:
        html = html.replace('<div class="mob" id="mob"', '<div class="mob" id="mob"\n  >' + LANG_MOBILE, 1)
        html = html.replace('<div class="mob" id="mob"\n  >', '<div class="mob" id="mob">', 1)
        html = html.replace('<div class="mob" id="mob">', '<div class="mob" id="mob">\n  ' + LANG_MOBILE, 1)

    # Brand
    html = html.replace(
        '<div class="nav-name">Martins Global Travels</div>',
        '<div class="nav-name" data-i18n="brand.name">Martins Global Travels</div>',
    )
    html = html.replace(
        f'<div class="nav-sub">{nav_sub_text}</div>',
        f'<div class="nav-sub" data-i18n="{nav_sub_key}">{nav_sub_text}</div>',
    )

    # Nav links - replace block between nav-links div
    import re
    html = re.sub(
        r'<div class="nav-links">.*?</div>\s*(?=<button type="button" class="theme-toggle"|<div class="lang-switcher")',
        NAV_LINKS + "\n    ",
        html,
        count=1,
        flags=re.S,
    )

    html = html.replace(
        'aria-label="Switch to dark mode"',
        'aria-label="Switch to dark mode" data-i18n-aria="theme.darkMode"',
    )
    html = html.replace(
        '<span class="theme-toggle-label">Light</span>',
        '<span class="theme-toggle-label" data-i18n="theme.light">Light</span>',
    )
    html = html.replace(
        f'href="{cta_href}" class="nav-cta">Book Now</a>',
        f'href="{cta_href}" class="nav-cta" data-i18n="nav.bookNow">Book Now</a>',
    )

    # Mobile menu links
    html = re.sub(
        r'(<div class="mob" id="mob">.*?)(  <a href="index.html">Home</a>.*?)(  <div class="mob-theme">)',
        r"\1" + MOB_LINKS + "\n  " + r"\3",
        html,
        count=1,
        flags=re.S,
    )
    html = html.replace('<span>Appearance</span>', '<span data-i18n="theme.appearance">Appearance</span>')

    # Footer
    html = html.replace(
        '<p class="ft-tag">"The world is a book, and those who do not travel read only one page."</p>',
        '<p class="ft-tag" data-i18n="footer.quote">"The world is a book, and those who do not travel read only one page."</p>',
    )
    html = html.replace('<div class="ft-ch">Explore</div>', '<div class="ft-ch" data-i18n="bookNav.explore">Explore</div>')
    html = html.replace('<div class="ft-ch">Company</div>', '<div class="ft-ch" data-i18n="footer.company">Company</div>')
    html = html.replace('<div class="ft-ch">Legal</div>', '<div class="ft-ch" data-i18n="bookNav.legal">Legal</div>')
    html = html.replace('<div class="ft-ch">Contact</div>', '<div class="ft-ch" data-i18n="footer.contact">Contact</div>')
    for old, key in [
        ('>Destinations</a>', ' data-i18n="nav.destinations">Destinations</a>'),
        ('>Packages</a>', ' data-i18n="nav.packages">Packages</a>'),
        ('>Book Travel</a>', ' data-i18n="bookNav.bookTravel">Book Travel</a>'),
        ('>Client Portal</a>', ' data-i18n="nav.portal">Client Portal</a>'),
        ('>About Us</a>', ' data-i18n="footer.aboutUs">About Us</a>'),
        ('>FAQ</a>', ' data-i18n="nav.faq">FAQ</a>'),
        ('>Contact</a>', ' data-i18n="nav.contact">Contact</a>'),
        ('>Privacy</a>', ' data-i18n="common.privacy">Privacy</a>'),
        ('>Terms</a>', ' data-i18n="common.terms">Terms</a>'),
    ]:
        html = html.replace(f'<a href="index.html#destinations"{old}', f'<a href="index.html#destinations"{key}', 1)
        html = html.replace(f'<a href="index.html#packages"{old}', f'<a href="index.html#packages"{key}', 1)
        html = html.replace(f'<a href="book.html"{old}', f'<a href="book.html"{key}', 1)
        html = html.replace(f'<a href="portal.html"{old}', f'<a href="portal.html"{key}', 1)
        html = html.replace(f'<a href="index.html#about"{old}', f'<a href="index.html#about"{key}', 1)
        html = html.replace(f'<a href="index.html#faq"{old}', f'<a href="index.html#faq"{key}', 1)
        html = html.replace(f'<a href="index.html#contact"{old}', f'<a href="index.html#contact"{key}', 1)
        html = html.replace(f'<a href="index.html#privacy"{old}', f'<a href="index.html#privacy"{key}', 1)
        html = html.replace(f'<a href="index.html#terms"{old}', f'<a href="index.html#terms"{key}', 1)

    html = html.replace(
        '<div class="ft-copy">© 2026 Martins Global Travels. All Rights Reserved.</div>',
        '<div class="ft-copy" data-i18n="footer.copyright">© 2026 Martins Global Travels. All Rights Reserved.</div>',
    )

    if "i18n/translations.js" not in html:
        html = html.replace("</body>", SCRIPTS + "</body>")

    path.write_text(html, encoding="utf-8")
    print(f"Patched {path.name}")


if __name__ == "__main__":
    patch_file(ROOT / "book.html", "bookNav.bookFlights", "Book flights", "index.html#contact")
    patch_file(ROOT / "portal.html", "bookNav.portalSub", "Client portal", "index.html#contact")
