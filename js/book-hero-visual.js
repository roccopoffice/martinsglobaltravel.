/**
 * Expedia-style flight path — plane travels along a curved route
 */
(function () {
  const path = document.getElementById('hero-flight-path');
  const plane = document.getElementById('hero-plane');
  const trail = document.getElementById('hero-flight-trail');
  if (!path || !plane) return;

  const len = path.getTotalLength();
  if (trail) {
    trail.setAttribute('stroke-dasharray', String(len));
    trail.setAttribute('stroke-dashoffset', String(len));
  }

  let progress = 0;
  const speed = 0.00055;

  function frame() {
    progress += speed;
    if (progress > 1) progress = 0;

    const at = progress * len;
    const pt = path.getPointAtLength(at);
    const ahead = path.getPointAtLength(Math.min(at + len * 0.015, len));
    const angle = (Math.atan2(ahead.y - pt.y, ahead.x - pt.x) * 180) / Math.PI;

    plane.setAttribute('transform', `translate(${pt.x},${pt.y}) rotate(${angle})`);

    if (trail) {
      trail.setAttribute('stroke-dashoffset', String(len - at));
    }

    requestAnimationFrame(frame);
  }

  frame();
})();
