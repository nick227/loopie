;(function () {
  const AD_SERVER_URL = 'https://ad.loopie.up' // Assuming this is set up or proxied
  // In a real environment, this might be injected during build, but we'll use a relative base or hardcoded for now.
  // Actually, let's use the origin of the script tag if possible.
  const scriptTag = document.currentScript || document.querySelector('script[src*="v1.js"]')
  const baseUrl = scriptTag ? new URL(scriptTag.src).origin : AD_SERVER_URL

  function initEmbeds() {
    const nodes = document.querySelectorAll('.loopie-embed:not([data-loopie-initialized])')

    nodes.forEach((node) => {
      node.setAttribute('data-loopie-initialized', 'true')
      const publicId = node.getAttribute('data-public-id')
      if (!publicId) return

      // Authorize
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
          const iframe = document.createElement('iframe')
          // e/:publicId with token
          iframe.src = `${baseUrl}/e/${publicId}?token=${encodeURIComponent(token)}`
          iframe.style.width = '100%'
          iframe.style.height = '100%'
          iframe.style.border = 'none'
          iframe.style.overflow = 'hidden'
          iframe.sandbox =
            'allow-scripts allow-top-navigation-by-user-activation allow-same-origin allow-popups allow-forms'

          node.appendChild(iframe)

          // Listen for messages from this iframe
          window.addEventListener('message', (event) => {
            if (event.source !== iframe.contentWindow) return
            // Validate origin
            if (event.origin !== baseUrl) return

            const msg = event.data
            if (msg?.type === 'loopie:ready') {
              // Send init
              iframe.contentWindow.postMessage(
                {
                  type: 'loopie:init',
                  protocolVersion: '1',
                  publicId: publicId,
                  bootstrapToken: token,
                  context: {
                    hostUrl: window.location.href,
                    referrer: document.referrer,
                  },
                },
                baseUrl,
              )
            } else if (msg?.type === 'loopie:resize') {
              iframe.style.height = `${msg.height}px`
            }
          })

          // Setup visibility tracking
          if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver(
              (entries) => {
                entries.forEach((entry) => {
                  try {
                    iframe.contentWindow.postMessage(
                      {
                        type: 'loopie:visibility',
                        intersectionRatio: entry.intersectionRatio,
                        visibleWidth: entry.intersectionRect.width,
                        visibleHeight: entry.intersectionRect.height,
                        documentVisible: !document.hidden,
                        durationMs: 0, // Simplification for now
                      },
                      baseUrl,
                    )
                  } catch (e) {
                    // Ignore if origin not yet initialized
                  }
                })
              },
              { threshold: [0, 0.25, 0.5, 0.75, 1.0] },
            )

            observer.observe(iframe)

            document.addEventListener('visibilitychange', () => {
              try {
                iframe.contentWindow.postMessage(
                  {
                    type: 'loopie:visibility',
                    intersectionRatio: 1, // Assume still same ratio
                    visibleWidth: iframe.clientWidth,
                    visibleHeight: iframe.clientHeight,
                    documentVisible: !document.hidden,
                    durationMs: 0,
                  },
                  baseUrl,
                )
              } catch (e) {
                // Ignore if origin not yet initialized
              }
            })
          }
        })
        .catch((err) => {
          console.error('Loopie Embed Error:', err)
        })
    })
  }

  // Run on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEmbeds)
  } else {
    initEmbeds()
  }
})()
