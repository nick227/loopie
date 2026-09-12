// Scroll-linked motion for Studio and Portfolio's snap panels/parallax bridge (colorWash fills,
// hero-wipe clip-path, per-service slide-in, gallery horizontal drift, testimonial letter-spacing
// track-tighten) plus a generic IntersectionObserver fade-in for `.lp-fade-in-row` (Portfolio's
// service rows). Declared by both Starters' own `behaviors` list (see
// starters/studio/definition.ts and starters/portfolio/definition.ts) rather than emitted
// unconditionally — a no-op on any page with none of this markup, but not shipped to Starters
// that never produce it.
export const SCROLL_EFFECTS_SCRIPT = `<script>
(function() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.hasAttribute('data-lp-capture')) return;

  var snaps = document.querySelectorAll('[data-lp-snap]');
  var bridges = document.querySelectorAll('[data-lp-parallax-bridge]');
  var parallaxBgs = document.querySelectorAll('.lp-parallax-bg');
  var fadeInRows = document.querySelectorAll('.lp-fade-in-row');

  function panelProgress(el) {
    var rect = el.getBoundingClientRect();
    var wh = window.innerHeight || 1;
    var total = rect.height + wh;
    if (total <= 0) return 0.5;
    return Math.max(0, Math.min(1, (wh - rect.top) / total));
  }

  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp01(t) { return Math.max(0, Math.min(1, t)); }

  function applyFx(el, p) {
    var fx = el.getAttribute('data-lp-fx') || '';
    el.style.setProperty('--lp-p', String(p));

    var wash = el.querySelector('.lp-color-wash, .lp-contact-fill');
    if (wash) {
      var edge = wash.getAttribute('data-lp-wash-edge') || 'bottom';
      var amount = lerp(0, 100, clamp01((p - 0.12) / 0.43)) + '%';
      if (edge === 'left' || edge === 'right') {
        wash.style.width = amount;
        wash.style.height = '100%';
      } else {
        wash.style.height = amount;
        wash.style.width = '100%';
      }
      // Crossfade type into the wash's readable foreground (theme-safe when primary ≈ ink).
      var washColor = wash.getAttribute('data-lp-wash-color') || 'ink';
      var tone = el.getAttribute('data-lp-tone') || 'bg';
      var toneFg = { bg: '--lp-ink', card: '--lp-ink', clear: '--lp-ink', ink: '--lp-bg', primary: '--lp-on-primary' };
      var washFg = { ink: '--lp-bg', primary: '--lp-on-primary', bg: '--lp-ink', card: '--lp-ink' };
      var from = toneFg[tone] || '--lp-ink';
      var to = washFg[washColor] || '--lp-bg';
      var mixT = clamp01((p - 0.18) / 0.34);
      el.style.color = 'color-mix(in srgb, var(' + from + ') ' + ((1 - mixT) * 100) + '%, var(' + to + ') ' + (mixT * 100) + '%)';
    }

    if (fx === 'hero-wipe') {
      var t = clamp01((p - 0.15) / 0.3);
      var copy = el.querySelector('.lp-hero-copy');
      var media = el.querySelector('.lp-hero-media');
      if (copy) copy.style.clipPath = 'inset(0 ' + ((1 - t) * 100) + '% 0 0)';
      if (media) {
        media.style.transform = 'translateY(' + lerp(40, -48, p) + 'px) scale(' + lerp(1.08, 1, p) + ')';
      }
      return;
    }

    if (fx === 'rise') {
      var kids = el.querySelectorAll('.lp-metric, .lp-feature, .lp-team-member');
      kids.forEach(function(kid, i) {
        var start = 0.2 + i * 0.08;
        var local = clamp01((p - start) / 0.22);
        kid.style.transform = 'translateY(' + lerp(56, 0, local) + 'px)';
        kid.style.opacity = String(local);
      });
      return;
    }

    if (fx === 'service-slide') {
      var img = el.querySelector('img');
      var copy = el.querySelector('.lp-service-copy');
      var t2 = clamp01((p - 0.2) / 0.3);
      if (img) img.style.transform = 'scale(' + lerp(1.1, 1, t2) + ')';
      if (copy) {
        var odd = false;
        var sib = el;
        var n = 0;
        while (sib.previousElementSibling) { sib = sib.previousElementSibling; if (sib.classList && sib.classList.contains('lp-service')) n++; }
        odd = n % 2 === 1;
        copy.style.transform = 'translateX(' + lerp(odd ? 48 : -48, 0, t2) + 'px)';
        copy.style.opacity = String(t2);
      }
      return;
    }

    if (fx === 'h-drift') {
      var grid = el.querySelector('.lp-gallery-grid');
      if (grid) grid.style.transform = 'translateX(' + lerp(0, -28, clamp01((p - 0.1) / 0.8)) + '%)';
      return;
    }

    if (fx === 'track-tighten') {
      var quote = el.querySelector('.lp-testimonial.is-active p, .lp-testimonial p');
      if (quote) {
        var t3 = clamp01((p - 0.2) / 0.3);
        quote.style.letterSpacing = lerp(0.1, -0.02, t3) + 'em';
        quote.style.opacity = String(lerp(0.25, 1, t3));
      }
    }
  }

  var update = function() {
    bridges.forEach(function(bridge) {
      var rect = bridge.getBoundingClientRect();
      var total = Math.max(1, bridge.offsetHeight - window.innerHeight);
      var bp = Math.max(0, Math.min(1, -rect.top / total));
      var sticky = bridge.querySelector('.lp-parallax-sticky');
      var img = bridge.querySelector('.lp-parallax-img');
      var fade = bp < 0.5 ? 1 : Math.max(0, 1 - (bp - 0.5) / 0.42);
      if (sticky) sticky.style.opacity = String(fade);
      if (img) img.style.transform = 'translateY(' + (bp * 22) + '%)';
    });

    snaps.forEach(function(el) { applyFx(el, panelProgress(el)); });

    parallaxBgs.forEach(function(el) {
      var rect = el.parentElement.getBoundingClientRect();
      var progress = Math.max(0, Math.min(1, 1 - (rect.bottom / window.innerHeight)));
      el.style.transform = 'translateY(' + (150 * progress) + 'px)';
    });
  };

  window.addEventListener('scroll', function() { window.requestAnimationFrame(update); }, { passive: true });
  window.addEventListener('resize', function() { window.requestAnimationFrame(update); }, { passive: true });
  update();

  if (fadeInRows.length > 0 && 'IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        var ratio = entry.intersectionRatio;
        var el = entry.target;
        el.style.transform = 'translateY(' + ((1 - ratio) * 50) + 'px)';
        el.style.opacity = ratio;
      });
    }, { threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0] });
    fadeInRows.forEach(function(el) {
      el.style.transition = 'none';
      observer.observe(el);
    });
  }
})();
</script>`
