#!/usr/bin/env python3
"""Restore inline SPA script removed by build-i18n patch."""
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INDEX = ROOT / "index.html"

html_head = subprocess.check_output(
    ["git", "show", "HEAD:index.html"], text=True, encoding="utf-8"
)
m = re.search(r"(<script>\n// World Cup home popup.*?</script>)", html_head, re.S)
if not m:
    raise SystemExit("Inline script not found in HEAD")

script = m.group(1)
listener = """
document.addEventListener('martins:langchange', function () {
  var active = document.querySelector('.fb.on');
  if (active && typeof filterDest === 'function') {
    var match = (active.getAttribute('onclick') || '').match(/filterDest\\('([^']+)'/);
    filterDest(match ? match[1] : 'all', active);
  }
});
"""
if "martins:langchange" not in script:
    script = script.replace("</script>", listener + "</script>", 1)

index = INDEX.read_text(encoding="utf-8")
if "function go(id)" in index:
    print("Inline script already present")
else:
    marker = '<script src="i18n/translations.js"></script>\n<script src="i18n.js"></script>\n<script src="js/contact-form.js"></script>\n'
    if marker not in index:
        raise SystemExit("Expected script marker not found in index.html")
    tail = script + "\n" + marker
    index = index.replace(marker, tail, 1)
    INDEX.write_text(index, encoding="utf-8")
    print("Restored inline SPA script")
