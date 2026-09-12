// Plain click-to-enlarge, no library — a no-op on any page without a gallery.
export const GALLERY_LIGHTBOX_SCRIPT = `<script>
(function () {
  var tiles = document.querySelectorAll('[data-lp-lightbox-src]');
  if (!tiles.length) return;
  var items = Array.prototype.map.call(tiles, function (el) {
    return { src: el.getAttribute('data-lp-lightbox-src'), caption: el.getAttribute('data-lp-lightbox-caption') || '' };
  });
  var box = null;
  function close() { if (box) { box.remove(); box = null; } }
  function open(index) {
    close();
    var item = items[index];
    box = document.createElement('div');
    box.className = 'lp-lightbox';
    var closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'lp-lightbox-close';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.textContent = '\\u00d7';
    closeBtn.addEventListener('click', close);
    var img = document.createElement('img');
    img.src = item.src;
    img.alt = '';
    box.appendChild(closeBtn);
    box.appendChild(img);
    if (item.caption) {
      var caption = document.createElement('figcaption');
      caption.textContent = item.caption;
      box.appendChild(caption);
    }
    box.addEventListener('click', function (e) { if (e.target === box) close(); });
    document.body.appendChild(box);
  }
  tiles.forEach(function (el, i) { el.addEventListener('click', function () { open(i); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
})();
</script>`
