;(function () {
  // Prefer the origin of this script tag so the same file works on localhost:3002,
  // Railway staging, and production without baking a domain into the loader.
  const scriptTag = document.currentScript || document.querySelector('script[src*="v1.js"]')
  const baseUrl = scriptTag
    ? new URL(scriptTag.src).origin
    : typeof location !== 'undefined'
      ? location.origin
      : ''

  function parseAspectRatio(host) {
    const raw =
      host.style.aspectRatio ||
      host.getAttribute('data-aspect-ratio') ||
      getComputedStyle(host).aspectRatio ||
      '1 / 1'
    if (!raw || raw === 'auto') return 1
    const parts = raw.split('/').map(function (p) {
      return parseFloat(p.trim())
    })
    if (parts.length === 2 && parts[0] > 0 && parts[1] > 0) return parts[0] / parts[1]
    const n = parseFloat(raw)
    return n > 0 ? n : 1
  }

  // Absolute iframes remove in-flow content; some hosts then collapse aspect-ratio to 0 height.
  // Pin an explicit pixel height from width × ratio so the slot always has a box.
  function sizeHost(host) {
    const ratio = parseAspectRatio(host)
    const width = host.getBoundingClientRect().width || host.parentElement?.clientWidth || 400
    host.style.height = Math.round(width / ratio) + 'px'
  }

  function initEmbeds() {
    const nodes = document.querySelectorAll('.loopie-embed:not([data-loopie-initialized])')

    nodes.forEach((node) => {
      node.setAttribute('data-loopie-initialized', 'true')
      const publicId = node.getAttribute('data-public-id')
      if (!publicId) return

      fetch(`${baseUrl}/v1/embeds/${publicId}/authorize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: window.location.href, referrer: document.referrer }),
      })
        .then((res) => {
          if (!res.ok) throw new Error('Not authorized')
          return res.json()
        })
        .then((data) => {
          const token = data.data.nonce
          if (!token) return

          const host = node
          if (getComputedStyle(host).position === 'static') {
            host.style.position = 'relative'
          }
          host.style.overflow = 'hidden'
          host.style.display = 'block'
          host.style.maxWidth = host.style.maxWidth || '400px'
          host.style.width = host.style.width || '100%'
          host.style.background = '#111'
          sizeHost(host)
          window.addEventListener('resize', function () {
            sizeHost(host)
          })

          const iframe = document.createElement('iframe')
          iframe.src = `${baseUrl}/e/${publicId}?token=${encodeURIComponent(token)}`
          iframe.style.position = 'absolute'
          iframe.style.inset = '0'
          iframe.style.width = '100%'
          iframe.style.height = '100%'
          iframe.style.border = 'none'
          iframe.style.overflow = 'hidden'
          iframe.setAttribute('title', 'LOOPIE embed')
          iframe.sandbox =
            'allow-scripts allow-top-navigation-by-user-activation allow-same-origin allow-popups allow-forms'

          let iframeReady = false

          function postToIframe(payload) {
            if (!iframeReady || !iframe.contentWindow) return
            try {
              iframe.contentWindow.postMessage(payload, baseUrl)
            } catch {
              // Cross-origin/teardown races can make postMessage throw — safe to ignore.
            }
          }

          host.appendChild(iframe)

          window.addEventListener('message', (event) => {
            if (event.source !== iframe.contentWindow) return
            if (event.origin !== baseUrl) return

            const msg = event.data
            if (msg?.type === 'loopie:ready') {
              iframeReady = true
              postToIframe({
                type: 'loopie:init',
                protocolVersion: '1',
                publicId: publicId,
                bootstrapToken: token,
                context: {
                  hostUrl: window.location.href,
                  referrer: document.referrer,
                },
              })
            }
          })

          if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver(
              (entries) => {
                entries.forEach((entry) => {
                  postToIframe({
                    type: 'loopie:visibility',
                    intersectionRatio: entry.intersectionRatio,
                    visibleWidth: entry.intersectionRect.width,
                    visibleHeight: entry.intersectionRect.height,
                    documentVisible: !document.hidden,
                    durationMs: 0,
                  })
                })
              },
              { threshold: [0, 0.25, 0.5, 0.75, 1.0] },
            )
            observer.observe(iframe)

            document.addEventListener('visibilitychange', () => {
              postToIframe({
                type: 'loopie:visibility',
                intersectionRatio: 1,
                visibleWidth: iframe.clientWidth,
                visibleHeight: iframe.clientHeight,
                documentVisible: !document.hidden,
                durationMs: 0,
              })
            })
          }
        })
        .catch((err) => {
          console.error('Loopie Embed Error:', err)
        })
    })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEmbeds)
  } else {
    initEmbeds()
  }
})()
