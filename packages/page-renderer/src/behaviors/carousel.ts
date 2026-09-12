// Mirrors the Studio/Portfolio editors' own React testimonial carousel, without shipping a React
// bundle. A no-op on any page with fewer than 2 slides.
export const CAROUSEL_SCRIPT = `<script>
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
