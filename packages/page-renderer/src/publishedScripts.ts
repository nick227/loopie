// Vanilla interactivity for published /p/{slug} HTML — mirrors editor React widgets
// (service tabs, testimonial carousel) without shipping a React bundle. No-ops when
// the matching markup is absent on the page.

export const serviceTabsScript = `<script>
(function () {
  document.querySelectorAll('[data-lp-service-tabs]').forEach(function (root) {
    var tabs = root.querySelectorAll('[data-lp-tab]');
    var panels = root.querySelectorAll('[data-lp-panel]');
    if (!tabs.length || !panels.length) return;
    function activate(index) {
      tabs.forEach(function (tab, i) {
        var on = i === index;
        tab.classList.toggle('is-active', on);
        tab.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      panels.forEach(function (panel, i) {
        var on = i === index;
        panel.classList.toggle('is-active', on);
        if (on) panel.removeAttribute('hidden');
        else panel.setAttribute('hidden', '');
      });
    }
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        activate(Number(tab.getAttribute('data-lp-tab') || 0));
      });
    });
  });
})();
</script>`

export const carouselScript = `<script>
(function () {
  document.querySelectorAll('[data-lp-carousel]').forEach(function (root) {
    var slides = root.querySelectorAll('[data-lp-slide]');
    if (slides.length < 2) return;
    var dots = root.querySelectorAll('[data-lp-carousel-dot]');
    var index = 0;
    function show(next) {
      index = (next + slides.length) % slides.length;
      slides.forEach(function (slide, i) {
        var on = i === index;
        slide.classList.toggle('is-active', on);
        if (on) slide.removeAttribute('hidden');
        else slide.setAttribute('hidden', '');
      });
      dots.forEach(function (dot, i) {
        dot.classList.toggle('is-active', i === index);
      });
    }
    var prev = root.querySelector('[data-lp-carousel-prev]');
    var next = root.querySelector('[data-lp-carousel-next]');
    if (prev) prev.addEventListener('click', function () { show(index - 1); });
    if (next) next.addEventListener('click', function () { show(index + 1); });
    dots.forEach(function (dot) {
      dot.addEventListener('click', function () {
        show(Number(dot.getAttribute('data-lp-carousel-dot') || 0));
      });
    });
  });
})();
</script>`
