import {
  youtubeEmbedUrl,
  SECTION_TYPE_TO_SLOT_GROUP,
  type PageContent,
  type LayoutConfig,
} from '@project/db'

type TemplateSection = {
  key?: string
  type: string
  order: number
  hideable?: boolean
  editable?: string[]
}

type RenderFormField = {
  label: string
  fieldKey: string
  type: string
  required: boolean
  options: unknown
  defaultValue?: string | null
}

export type RenderForm = {
  id: string
  submitLabel: string
  successMessage?: string | null
  fields: RenderFormField[]
} | null

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export type AdSlotEmbedItem = { embedUrl: string; format?: string | null }

function renderAdSlot(item: AdSlotEmbedItem, context: string, sessionToken?: string): string {
  const src = sessionToken
    ? `${item.embedUrl}?sid=${encodeURIComponent(sessionToken)}`
    : item.embedUrl
  const contextClass = `lp-ad--${context.toLowerCase()}`
  const formatClass = item.format ? `lp-ad--format-${item.format.toLowerCase()}` : ''
  return `<section class="lp-section lp-ad ${contextClass} ${formatClass}"><iframe src="${escapeHtml(src)}" title="Ad" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></section>`
}

function slotsAt(
  slots: { placement: string; context?: string; items: AdSlotEmbedItem[] }[],
  placement: string,
  sessionToken?: string,
) {
  return slots
    .filter((slot) => slot.placement === placement)
    .flatMap((slot) =>
      slot.items.map((item) => renderAdSlot(item, slot.context ?? 'CONTAINED', sessionToken)),
    )
    .join('\n')
}

export function renderBody(
  sections: TemplateSection[],
  content: PageContent,
  layoutConfig: LayoutConfig | null | undefined,
  formHtml: string,
  adSlots: { placement: string; context?: string; items: AdSlotEmbedItem[] }[],
  sessionToken?: string,
  // Real count of this page's own FormSubmission rows, computed fresh per request by the caller
  // — never polled/pushed. See "webinar-widget"'s case: this is the one place a section render
  // needs a number that isn't part of authored content.
  submissionCount = 0,
  renderer = 'standard',
) {
  const chunks: string[] = []
  for (const section of sections) {
    if (section.key && layoutConfig?.sections?.[section.key]?.hidden) continue
    if (section.type === 'form-embed') chunks.push(slotsAt(adSlots, 'BEFORE_FORM', sessionToken))
    const slotGroup = SECTION_TYPE_TO_SLOT_GROUP[section.type]
    const slotContent = slotGroup ? ((content as Record<string, unknown>)[slotGroup] ?? {}) : {}
    chunks.push(renderSection(section, slotContent, formHtml, submissionCount, renderer))
    if (section.type === 'hero') chunks.push(slotsAt(adSlots, 'AFTER_HERO', sessionToken))
    if (section.type === 'form-embed' || section.type === 'split-capture') {
      chunks.push(slotsAt(adSlots, 'AFTER_FORM', sessionToken))
    }
  }
  chunks.push(slotsAt(adSlots, 'BOTTOM', sessionToken))
  if (renderer === 'email-outreach') {
    chunks.push(
      `<p class="lp-email-foot">Sent with care · Reply only if useful · Same-day response on business days</p>`,
    )
  }
  return chunks.filter(Boolean).join('\n')
}

function safeHttpUrl(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) return ''
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? value : ''
  } catch {
    return ''
  }
}

function renderCta(cta: unknown): string {
  if (!cta || typeof cta !== 'object') return ''
  const { label, url } = cta as { label?: unknown; url?: unknown }
  if (typeof label !== 'string' || !label) return ''
  return `<a class="lp-cta" href="${escapeHtml(typeof url === 'string' && url ? url : '#')}">${escapeHtml(label)}</a>`
}

function sectionIdAttr(section: TemplateSection): string {
  if (section.type === 'studio-contact') return ' id="contact"'
  if (section.type === 'webinar-widget') return ' id="signup"'
  if (section.type === 'form-embed' || section.type === 'split-capture') return ' id="form"'
  if (section.key && section.key !== 'nav' && section.key !== 'hero' && section.key !== 'footer') {
    return ` id="${escapeHtml(section.key)}"`
  }
  return ''
}

function isNavAskUrl(url: string | undefined): boolean {
  return url === '#contact' || url === '#signup' || url === '#products'
}

export function renderSection(
  section: TemplateSection,
  content: unknown,
  formHtml: string,
  submissionCount = 0,
  renderer = 'standard',
): string {
  const c = (content && typeof content === 'object' ? content : {}) as Record<string, unknown>
  const idAttr = sectionIdAttr(section)

  switch (section.type) {
    case 'nav': {
      const brand = typeof c.brand === 'string' ? c.brand : ''
      const links = Array.isArray(c.links) ? (c.links as { label?: string; url?: string }[]) : []
      if (renderer === 'email-outreach') {
        return `<nav class="lp-nav"><a class="lp-brand" href="#">${escapeHtml(brand)}</a><span class="lp-email-chip">First note</span></nav>`
      }
      const askIndex = links.findIndex((link) => isNavAskUrl(link.url))
      const ask = askIndex >= 0 ? links[askIndex] : null
      const menuLinks = askIndex >= 0 ? links.filter((_, index) => index !== askIndex) : links
      const linksHtml = menuLinks
        .map(
          (link) => `<a href="${escapeHtml(link.url || '#')}">${escapeHtml(link.label || '')}</a>`,
        )
        .join('')
      const askHtml = ask?.label
        ? `<a class="lp-nav-cta" href="${escapeHtml(ask.url || '#')}">${escapeHtml(ask.label)}</a>`
        : ''
      return `<nav class="lp-nav"><a class="lp-brand" href="#">${escapeHtml(brand)}</a><div class="lp-nav-links">${linksHtml}</div>${askHtml}</nav>`
    }
    case 'hero': {
      const eyebrow = c.eyebrow ? `<p class="lp-hero-eyebrow">${escapeHtml(c.eyebrow)}</p>` : ''
      const badges = Array.isArray(c.badges)
        ? (c.badges as string[])
            .map((badge) => `<span class="lp-hero-badge">${escapeHtml(badge)}</span>`)
            .join('')
        : ''
      const headline = c.headline ? `<h1>${escapeHtml(c.headline)}</h1>` : ''
      const body = c.body ? `<p class="lp-subheadline">${escapeHtml(c.body)}</p>` : ''
      const cta = renderCta(c.primaryCta)
      const media = (c.media && typeof c.media === 'object' ? c.media : {}) as Record<
        string,
        unknown
      >
      const src = safeHttpUrl(media.src) || safeHttpUrl(media.url)
      const mediaHtml = src
        ? `<div class="lp-hero-media"><img src="${escapeHtml(src)}" alt="${escapeHtml(media.alt ?? '')}" /></div>`
        : ''
      return `<section class="lp-section lp-hero"><div class="lp-hero-copy">${badges || eyebrow || '<p class="lp-kicker">Now booking</p>'}${headline}${body}${cta}</div>${mediaHtml}</section>`
    }
    case 'feature-grid': {
      const items = Array.isArray(c.items) ? (c.items as { title: string; body: string }[]) : []
      const itemsHtml = items
        .map(
          (item) =>
            `<div class="lp-feature"><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.body)}</p></div>`,
        )
        .join('')
      const headline = c.headline ? `<h2>${escapeHtml(c.headline)}</h2>` : ''
      const body = c.body ? `<p class="lp-section-intro">${escapeHtml(c.body)}</p>` : ''
      return `<section class="lp-section lp-features"${idAttr}><div class="lp-section-heading">${headline}${body}</div><div class="lp-feature-grid">${itemsHtml}</div></section>`
    }
    case 'form-embed':
      return `<section class="lp-section lp-form"${idAttr}><div class="lp-form-card"><p class="lp-form-title">Tell us what you need</p>${formHtml}</div></section>`
    case 'split-capture': {
      const media = (c.media && typeof c.media === 'object' ? c.media : {}) as Record<
        string,
        unknown
      >
      const src = safeHttpUrl(media.src) || safeHttpUrl(media.url)
      const mediaHtml = src
        ? `<div class="lp-split-media"><img src="${escapeHtml(src)}" alt="" /></div>`
        : `<div class="lp-split-media lp-split-media-empty"></div>`
      const pitch = c.headline ? `<h1>${escapeHtml(c.headline)}</h1>` : ''
      return `<section class="lp-split"${idAttr}>${mediaHtml}<div class="lp-split-copy">${pitch}${formHtml}</div></section>`
    }
    case 'footer':
    case 'cta-band': {
      const headline = c.headline ? `<h2>${escapeHtml(c.headline)}</h2>` : ''
      const body = c.body ? `<p>${escapeHtml(c.body)}</p>` : ''
      const cta = renderCta(c.cta)
      return `<footer class="lp-section lp-footer">${headline}${body}${cta}</footer>`
    }
    case 'studio-contact': {
      const headline = c.headline ? `<h2>${escapeHtml(c.headline)}</h2>` : ''
      const body = c.body ? `<p>${escapeHtml(c.body)}</p>` : ''
      const cta = renderCta(c.cta)
      return `<section class="lp-section lp-studio-contact"${idAttr}><div>${headline}${body}${cta}</div><div class="lp-form-card">${formHtml}</div></section>`
    }
    case 'media-image': {
      const src = safeHttpUrl(c.src) || safeHttpUrl(c.url)
      if (!src) return ''
      return `<section class="lp-section lp-media"><img src="${escapeHtml(src)}" alt="" /></section>`
    }
    case 'media-audio': {
      const src = typeof c.src === 'string' ? c.src : typeof c.url === 'string' ? c.url : ''
      if (!src) return ''
      return `<section class="lp-section lp-media"><audio controls src="${escapeHtml(src)}"></audio></section>`
    }
    case 'media-youtube': {
      const url = typeof c.youtubeUrl === 'string' ? c.youtubeUrl : ''
      const embed = youtubeEmbedUrl(url)
      if (!embed) return ''
      return `<section class="lp-section lp-media"><iframe src="${escapeHtml(embed)}" title="YouTube" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe></section>`
    }
    case 'logo-cloud': {
      const items = Array.isArray(c.items) ? (c.items as { name: string }[]) : []
      if (!items.length) return ''
      const title = c.title ? `<p class="lp-kicker">${escapeHtml(c.title)}</p>` : ''
      const logos = items
        .map((item) => `<span class="lp-logo">${escapeHtml(item.name)}</span>`)
        .join('')
      if (renderer === 'studio' || renderer === 'store') {
        return `<section class="lp-section lp-logos"${idAttr}>${title}<div class="lp-logo-marquee" data-lp-marquee><div class="lp-logo-marquee-track">${logos}${logos}</div></div></section>`
      }
      return `<section class="lp-section lp-logos"${idAttr}>${title}<div class="lp-logo-row">${logos}</div></section>`
    }
    case 'service-selector': {
      const items = Array.isArray(c.items)
        ? (c.items as {
            label: string
            headline?: string
            description?: string
            media?: { url?: string; src?: string; alt?: string }
            cta?: unknown
          }[])
        : []
      if (!items.length) return ''
      const title = c.title ? `<h2>${escapeHtml(c.title)}</h2>` : ''
      const body = c.body ? `<p>${escapeHtml(c.body)}</p>` : ''

      if (renderer === 'corporate-professional') {
        const tabs = items
          .map(
            (item, index) =>
              `<button type="button" class="lp-service-tab${index === 0 ? ' is-active' : ''}" role="tab" aria-selected="${index === 0 ? 'true' : 'false'}" data-lp-tab="${index}">${escapeHtml(item.label)}</button>`,
          )
          .join('')
        const panels = items
          .map((item, index) => {
            const src = safeHttpUrl(item.media?.src) || safeHttpUrl(item.media?.url)
            const media = src
              ? `<img src="${escapeHtml(src)}" alt="${escapeHtml(item.media?.alt ?? '')}" />`
              : ''
            return `<div class="lp-service-panel${index === 0 ? ' is-active' : ''}" role="tabpanel" data-lp-panel="${index}"${index === 0 ? '' : ' hidden'}>${media}<div class="lp-service-copy">${item.headline ? `<h4>${escapeHtml(item.headline)}</h4>` : ''}<p>${escapeHtml(item.description ?? '')}</p>${renderCta(item.cta)}</div></div>`
          })
          .join('')
        return `<section class="lp-section lp-services"${idAttr}><div class="lp-section-heading">${title}${body}</div><div class="lp-service-tabs" data-lp-service-tabs><div class="lp-service-tablist" role="tablist">${tabs}</div><div class="lp-service-panels">${panels}</div></div></section>`
      }

      const rows = items
        .map((item, index) => {
          const src = safeHttpUrl(item.media?.src) || safeHttpUrl(item.media?.url)
          const media = src
            ? `<img src="${escapeHtml(src)}" alt="${escapeHtml(item.media?.alt ?? '')}" />`
            : ''
          const indexHtml =
            renderer === 'studio'
              ? `<span class="lp-service-index">${String(index + 1).padStart(2, '0')}</span>`
              : ''
          const kicker =
            renderer === 'studio' || renderer === 'portfolio'
              ? `<p class="lp-kicker">${escapeHtml(item.label)}</p>`
              : `<h3>${escapeHtml(item.label)}</h3>`
          return `<article class="lp-service">${media}<div class="lp-service-copy">${indexHtml}${kicker}${item.headline ? `<h3>${escapeHtml(item.headline)}</h3>` : ''}<p>${escapeHtml(item.description ?? '')}</p>${renderCta(item.cta)}</div></article>`
        })
        .join('')
      return `<section class="lp-section lp-services"${idAttr}><div class="lp-section-heading">${title}${body}</div><div class="lp-service-grid">${rows}</div></section>`
    }
    case 'metrics': {
      const items = Array.isArray(c.items)
        ? (c.items as { value: string; label: string; description?: string }[])
        : []
      if (!items.length) return ''
      const rows = items
        .map(
          (item) =>
            `<div class="lp-metric"><span class="lp-metric-value">${escapeHtml(item.value)}</span><span class="lp-metric-label">${escapeHtml(item.label)}</span>${item.description ? `<p>${escapeHtml(item.description)}</p>` : ''}</div>`,
        )
        .join('')
      return `<section class="lp-section lp-metrics">${rows}</section>`
    }
    case 'comparison': {
      const items = Array.isArray(c.items)
        ? (c.items as { feature: string; us: string | boolean; them: string | boolean }[])
        : []
      if (!items.length) return ''
      const title = c.title ? `<h2>${escapeHtml(c.title)}</h2>` : ''
      const rows = items
        .map(
          (item) =>
            `<tr><td>${escapeHtml(item.feature)}</td><td>${typeof item.us === 'boolean' ? (item.us ? 'Yes' : 'No') : escapeHtml(item.us)}</td><td>${typeof item.them === 'boolean' ? (item.them ? 'Yes' : 'No') : escapeHtml(item.them)}</td></tr>`,
        )
        .join('')
      return `<section class="lp-section lp-comparison">${title}<table>${rows}</table></section>`
    }
    case 'testimonials': {
      const items = Array.isArray(c.items)
        ? (c.items as { quote: string; author: string; role?: string }[])
        : []
      if (!items.length) return ''
      const headline = c.headline ? `<h2>${escapeHtml(c.headline)}</h2>` : ''
      const body = c.body ? `<p class="lp-section-intro">${escapeHtml(c.body)}</p>` : ''
      const useCarousel = renderer === 'studio' || renderer === 'portfolio'
      if (useCarousel) {
        const slides = items
          .map(
            (item, index) =>
              `<blockquote class="lp-testimonial${index === 0 ? ' is-active' : ''}" data-lp-slide="${index}"${index === 0 ? '' : ' hidden'}><p>${escapeHtml(item.quote)}</p><cite>${escapeHtml(item.author)}${item.role ? `, ${escapeHtml(item.role)}` : ''}</cite></blockquote>`,
          )
          .join('')
        const controls =
          items.length > 1
            ? `<div class="lp-carousel-controls"><button type="button" data-lp-carousel-prev aria-label="Previous testimonial">‹</button><div class="lp-carousel-dots">${items
                .map(
                  (_, index) =>
                    `<button type="button" class="lp-carousel-dot${index === 0 ? ' is-active' : ''}" data-lp-carousel-dot="${index}" aria-label="Show testimonial ${index + 1}"></button>`,
                )
                .join(
                  '',
                )}</div><button type="button" data-lp-carousel-next aria-label="Next testimonial">›</button></div>`
            : ''
        return `<section class="lp-section lp-testimonials"${idAttr} data-lp-carousel><div class="lp-section-heading">${headline}${body}</div><div class="lp-carousel-viewport">${slides}</div>${controls}</section>`
      }
      const rows = items
        .map(
          (item) =>
            `<blockquote class="lp-testimonial"><p>${escapeHtml(item.quote)}</p><cite>${escapeHtml(item.author)}${item.role ? `, ${escapeHtml(item.role)}` : ''}</cite></blockquote>`,
        )
        .join('')
      return `<section class="lp-section lp-testimonials"${idAttr}><div class="lp-section-heading">${headline}${body}</div><div class="lp-testimonial-grid">${rows}</div></section>`
    }
    case 'webinar-widget': {
      const eventDate = typeof c.eventDate === 'string' ? c.eventDate : ''
      const durationMinutes = typeof c.durationMinutes === 'number' ? c.durationMinutes : null
      const seatsTotal = typeof c.seatsTotal === 'number' ? c.seatsTotal : null
      const hostName = typeof c.hostName === 'string' ? c.hostName : ''
      const hostTitle = typeof c.hostTitle === 'string' ? c.hostTitle : ''
      const hostAvatarUrl = safeHttpUrl(c.hostAvatarUrl)
      const hostBio = typeof c.hostBio === 'string' ? c.hostBio : ''
      const pct = seatsTotal
        ? Math.min(100, Math.round((submissionCount / seatsTotal) * 100))
        : null
      const dateHtml = eventDate
        ? `<time class="lp-webinar-date" datetime="${escapeHtml(eventDate)}" data-lp-event-date="${escapeHtml(eventDate)}"></time>`
        : ''
      const durationHtml = durationMinutes
        ? `<p class="lp-webinar-duration">${durationMinutes} minutes, live</p>`
        : ''
      const seatsHtml = `<div class="lp-webinar-seats">
        <p class="lp-webinar-seats-count">${submissionCount}${seatsTotal ? ` / ${seatsTotal} seats reserved` : ' seats reserved'}</p>
        ${pct !== null ? `<div class="lp-webinar-bar"><div class="lp-webinar-bar-fill" style="width:${pct}%"></div></div>` : ''}
      </div>`
      const hostHtml =
        hostName || hostAvatarUrl
          ? `<div class="lp-webinar-host">
              ${hostAvatarUrl ? `<img src="${escapeHtml(hostAvatarUrl)}" alt="" />` : ''}
              <div><p class="lp-webinar-host-name">${escapeHtml(hostName)}</p><p class="lp-webinar-host-title">${escapeHtml(hostTitle)}</p></div>
            </div>${hostBio ? `<p class="lp-webinar-host-bio">${escapeHtml(hostBio)}</p>` : ''}`
          : ''
      const countdownHtml = eventDate
        ? `<div class="lp-webinar-countdown" data-lp-countdown-for="${escapeHtml(eventDate)}"></div>`
        : ''
      return `<section class="lp-section lp-webinar"${idAttr}>
        <div class="lp-webinar-meta">
          ${countdownHtml}
          ${dateHtml}
          ${durationHtml}
          ${seatsHtml}
          ${hostHtml}
        </div>
        <div class="lp-webinar-form"><div class="lp-form-card"><p class="lp-form-title">Reserve your seat</p><p class="lp-form-reassure">Free to attend — we'll email your link and a reminder.</p>${formHtml}</div></div>
      </section>`
    }
    case 'photo-gallery': {
      const items = Array.isArray(c.items)
        ? (c.items as { url?: string; src?: string; alt?: string; caption?: string }[])
        : []
      if (!items.length) return ''
      const title = c.title ? `<h2>${escapeHtml(c.title)}</h2>` : ''
      const tiles = items
        .map((item) => {
          const src = safeHttpUrl(item.src) || safeHttpUrl(item.url)
          if (!src) return ''
          const caption = item.caption ? `<figcaption>${escapeHtml(item.caption)}</figcaption>` : ''
          return `<figure class="lp-gallery-tile" data-lp-lightbox-src="${escapeHtml(src)}" data-lp-lightbox-caption="${escapeHtml(item.caption ?? '')}"><img src="${escapeHtml(src)}" alt="${escapeHtml(item.alt ?? '')}" loading="lazy" />${caption}</figure>`
        })
        .join('')
      return `<section class="lp-section lp-gallery">${title}<div class="lp-gallery-grid">${tiles}</div></section>`
    }
    case 'team': {
      const items = Array.isArray(c.items)
        ? (c.items as {
            name: string
            role?: string
            bio?: string
            media?: { url?: string; src?: string; alt?: string }
          }[])
        : []
      if (!items.length) return ''
      const headline = c.headline ? `<h2>${escapeHtml(c.headline)}</h2>` : ''
      const body = c.body ? `<p class="lp-section-intro">${escapeHtml(c.body)}</p>` : ''
      const rows = items
        .map((item) => {
          const src = safeHttpUrl(item.media?.src) || safeHttpUrl(item.media?.url)
          const photo = src
            ? `<img src="${escapeHtml(src)}" alt="${escapeHtml(item.media?.alt ?? item.name)}" />`
            : `<div class="lp-team-photo-empty"></div>`
          return `<div class="lp-team-member">${photo}<h3>${escapeHtml(item.name)}</h3>${item.role ? `<p class="lp-team-role">${escapeHtml(item.role)}</p>` : ''}${item.bio ? `<p class="lp-team-bio">${escapeHtml(item.bio)}</p>` : ''}</div>`
        })
        .join('')
      return `<section class="lp-section lp-team"><div class="lp-section-heading">${headline}${body}</div><div class="lp-team-grid">${rows}</div></section>`
    }
    case 'product-grid': {
      const items = Array.isArray(c.items)
        ? (c.items as {
            name: string
            price?: string
            badge?: string
            media?: { url?: string; src?: string; alt?: string }
            cta?: unknown
          }[])
        : []
      if (!items.length) return ''
      const headline = c.headline ? `<h2>${escapeHtml(c.headline)}</h2>` : ''
      const body = c.body ? `<p class="lp-section-intro">${escapeHtml(c.body)}</p>` : ''
      const cards = items
        .map((item) => {
          const src = safeHttpUrl(item.media?.src) || safeHttpUrl(item.media?.url)
          const media = src
            ? `<img src="${escapeHtml(src)}" alt="${escapeHtml(item.media?.alt ?? item.name)}" />`
            : `<div class="lp-product-media-empty"></div>`
          const badge = item.badge
            ? `<span class="lp-product-badge">${escapeHtml(item.badge)}</span>`
            : ''
          const price = item.price
            ? `<p class="lp-product-price">${escapeHtml(item.price)}</p>`
            : ''
          return `<article class="lp-product">${badge}<div class="lp-product-media">${media}</div><h3>${escapeHtml(item.name)}</h3>${price}${renderCta(item.cta)}</article>`
        })
        .join('')
      return `<section class="lp-section lp-products"${idAttr}><div class="lp-section-heading">${headline}${body}</div><div class="lp-product-grid">${cards}</div></section>`
    }
    case 'category-grid': {
      const items = Array.isArray(c.items)
        ? (c.items as {
            label: string
            url?: string
            media?: { url?: string; src?: string; alt?: string }
          }[])
        : []
      if (!items.length) return ''
      const headline = c.headline ? `<h2>${escapeHtml(c.headline)}</h2>` : ''
      const tiles = items
        .map((item) => {
          const src = safeHttpUrl(item.media?.src) || safeHttpUrl(item.media?.url)
          const media = src
            ? `<img src="${escapeHtml(src)}" alt="${escapeHtml(item.media?.alt ?? item.label)}" />`
            : `<div class="lp-category-media-empty"></div>`
          const href = typeof item.url === 'string' && item.url ? item.url : '#'
          return `<a class="lp-category-tile" href="${escapeHtml(href)}">${media}<span class="lp-category-label">${escapeHtml(item.label)}</span></a>`
        })
        .join('')
      return `<section class="lp-section lp-categories">${headline ? `<div class="lp-section-heading">${headline}</div>` : ''}<div class="lp-category-grid">${tiles}</div></section>`
    }
    case 'story': {
      const headline = c.headline ? `<h2>${escapeHtml(c.headline)}</h2>` : ''
      const body = c.body ? `<p>${escapeHtml(c.body)}</p>` : ''
      const media = (c.media && typeof c.media === 'object' ? c.media : {}) as Record<
        string,
        unknown
      >
      const src = safeHttpUrl(media.src) || safeHttpUrl(media.url)
      const mediaHtml = src
        ? `<div class="lp-story-media"><img src="${escapeHtml(src)}" alt="${escapeHtml((media.alt as string) ?? '')}" /></div>`
        : ''
      return `<section class="lp-section lp-story">${mediaHtml}<div class="lp-story-copy">${headline}${body}</div></section>`
    }
    case 'faq': {
      const items = Array.isArray(c.items)
        ? (c.items as { question: string; answer: string }[])
        : []
      if (!items.length) return ''
      const rows = items
        .map(
          (item) =>
            `<details class="lp-faq-item"><summary>${escapeHtml(item.question)}</summary><p>${escapeHtml(item.answer)}</p></details>`,
        )
        .join('')
      const headline = c.headline ? `<h2>${escapeHtml(c.headline)}</h2>` : ''
      const body = c.body ? `<p class="lp-section-intro">${escapeHtml(c.body)}</p>` : ''
      return `<section class="lp-section lp-faq"><div class="lp-section-heading">${headline}${body}</div><div class="lp-faq-list">${rows}</div></section>`
    }
    default:
      return ''
  }
}
