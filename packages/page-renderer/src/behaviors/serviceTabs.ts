// Mirrors the Corporate Professional editor's own React tab widget, without shipping a React
// bundle. A no-op on any page without service tabs.
export const SERVICE_TABS_SCRIPT = `<script>
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
