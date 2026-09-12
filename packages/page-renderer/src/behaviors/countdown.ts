// Purely local Date math — no fetch, no polling, matches the "accurate on load" decision.
// A no-op on any page without a webinar widget (querySelectorAll returns an empty list).
export const COUNTDOWN_SCRIPT = `<script>
(function () {
  document.querySelectorAll('[data-lp-event-date]').forEach(function (el) {
    var d = new Date(el.getAttribute('data-lp-event-date'));
    if (isNaN(d.getTime())) return;
    el.textContent = d.toLocaleString(undefined, { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
  });
  var timers = [];
  document.querySelectorAll('[data-lp-countdown-for]').forEach(function (el) {
    var target = new Date(el.getAttribute('data-lp-countdown-for')).getTime();
    if (isNaN(target)) return;
    function render() {
      var diff = target - Date.now();
      if (diff <= 0) { el.textContent = 'This event has started'; return false; }
      var days = Math.floor(diff / 86400000);
      var hours = Math.floor((diff % 86400000) / 3600000);
      var minutes = Math.floor((diff % 3600000) / 60000);
      var seconds = Math.floor((diff % 60000) / 1000);
      function unit(v, label) { return '<span><span class="lp-cd-value">' + String(v).padStart(2, '0') + '</span><span class="lp-cd-label">' + label + '</span></span>'; }
      el.innerHTML = unit(days, 'Days') + unit(hours, 'Hrs') + unit(minutes, 'Min') + unit(seconds, 'Sec');
      return true;
    }
    if (render()) timers.push(setInterval(render, 1000));
  });
})();
</script>`
