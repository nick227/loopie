import { openHtmlCaptureBrowser } from './htmlCaptureBrowser'

/** Reviewed static HTML only. No persistence, queue, or publication side effects. */
export async function openAdCreativeCaptureSession() {
  const session = await openHtmlCaptureBrowser({
    deviceScaleFactor: 1,
    javaScriptEnabled: false,
    serviceWorkers: 'block',
  })
  return {
    async capture(
      html: string,
      size: { width: number; height: number },
      opts: { omitBackground?: boolean } = {},
    ) {
      for (const value of [size.width, size.height]) {
        if (!Number.isInteger(value) || value < 1 || value > 4096) {
          throw new Error('Ad capture dimensions must be integers between 1 and 4096')
        }
      }
      const page = await session.context.newPage()
      try {
        await page.setViewportSize(size)
        const frozenHtml = html.replace(
          '</head>',
          '<style>* { animation: none !important; transition: none !important; caret-color: transparent !important; }</style></head>',
        )
        await page.setContent(frozenHtml, { waitUntil: 'domcontentloaded', timeout: 15_000 })
        // Bound readiness from Node: document timers may be disabled with creative scripts.
        let deadline: ReturnType<typeof setTimeout> | undefined
        try {
          await Promise.race([
            page.evaluate(async () => {
              await document.fonts.ready
              await Promise.all(Array.from(document.images, (img) => img.decode()))
            }),
            new Promise<never>((_, reject) => {
              deadline = setTimeout(
                () => reject(new Error('Ad fonts/images did not settle')),
                10_000,
              )
            }),
          ])
        } finally {
          clearTimeout(deadline)
        }
        await page.evaluate(() => {
          for (const el of Array.from(document.querySelectorAll<HTMLElement>('[data-ad-text]'))) {
            const rect = el.getBoundingClientRect()
            if (
              el.scrollHeight > el.clientHeight + 1 ||
              el.scrollWidth > el.clientWidth + 1 ||
              rect.left < -1 ||
              rect.top < -1 ||
              rect.right > innerWidth + 1 ||
              rect.bottom > innerHeight + 1
            ) {
              throw new Error(
                `Ad ${el.className} overflows its composition (${el.scrollWidth}×${el.scrollHeight} in ${el.clientWidth}×${el.clientHeight}); shorten the copy`,
              )
            }
          }
        })
        return {
          buffer: Buffer.from(
            await page.screenshot({
              type: 'png',
              animations: 'disabled',
              clip: { x: 0, y: 0, ...size },
              omitBackground: opts.omitBackground ?? false,
            }),
          ),
          mimeType: 'image/png' as const,
          widthPx: size.width,
          heightPx: size.height,
        }
      } finally {
        await page.close()
      }
    },
    close: session.close,
  }
}
