import { escapeHtml, safeHttpUrl } from '../core/escape'
import { sectionIdAttr } from '../core/context'
import type { SectionRenderInput } from '../core/types'

// Only the Webinar Signup Starter ever declares this section type — no per-renderer branching
// existed here even before this extraction.
export function renderWebinarWidget({
  section,
  content,
  formHtml,
  submissionCount,
}: SectionRenderInput): string {
  const c = (content && typeof content === 'object' ? content : {}) as Record<string, unknown>
  const eventDate = typeof c.eventDate === 'string' ? c.eventDate : ''
  const durationMinutes = typeof c.durationMinutes === 'number' ? c.durationMinutes : null
  const seatsTotal = typeof c.seatsTotal === 'number' ? c.seatsTotal : null
  const hostName = typeof c.hostName === 'string' ? c.hostName : ''
  const hostTitle = typeof c.hostTitle === 'string' ? c.hostTitle : ''
  const hostAvatarUrl = safeHttpUrl(c.hostAvatarUrl)
  const hostBio = typeof c.hostBio === 'string' ? c.hostBio : ''
  const pct = seatsTotal ? Math.min(100, Math.round((submissionCount / seatsTotal) * 100)) : null
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
  return `<section class="lp-section lp-webinar"${sectionIdAttr(section)}>
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
