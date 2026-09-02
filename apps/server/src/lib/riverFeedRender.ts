import { riverPostClickUrl, riverPostVisitProfileUrl } from './urls'
import type { RiverFeedCard } from '../services/RiverPostService'

// Shared between renderRiver.ts (the global /river feed) and renderBusinessProfile.ts (a
// business-scoped "Latest from this business" section) — same hand-rolled-HTML convention as
// renderBusinessProfile.ts's original small-card version (its own escapeHtml, its own inline
// <style>, no dependency on @project/page-renderer). Extracted in slice 4 so both surfaces render
// River content identically instead of a second hand-copied implementation — see the slice-4 plan
// doc: "River is the reference implementation, not a special-case."
const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

export function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (char) => HTML_ESCAPES[char] ?? char)
}

export function formatTimestamp(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

// A relative action path + a `returnTo` baked into the query string, no other form fields — see
// the slice-2 plan doc: this contract-first API has no form-urlencoded body parser registered
// (only JSON), so a plain <form method="post"> can't carry a body field. Baking returnTo into the
// action URL itself sidesteps that with no new parser needed.
export function actionUrl(path: string, currentUrl: string): string {
  return `${path}?returnTo=${encodeURIComponent(currentUrl)}`
}

// Position is 1-indexed, repeating in groups of 6 — see the River feed v2 plan doc: 1 = hero,
// 2-5 = grid, 6 = full-width. Pure presentation, independent of feed order/ranking. Mirrored
// verbatim (not shared — one's TS, one's inline browser JS) in feedScript's client-side script
// below so server-rendered and client-appended cards get identical rhythm.
export function layoutClassForPosition(position: number): 'hero' | 'grid' | 'full' {
  const m = position % 6 || 6
  if (m === 1) return 'hero'
  if (m === 6) return 'full'
  return 'grid'
}

// Base page reset — shared by any hand-rolled public page that wants it. Deliberately no `main`
// max-width here (slice 5) — River and the business profile want different widths (a narrow,
// feed-centric column vs. a wide destination-page layout), so each sets its own via its own page-
// specific styles (renderRiver.ts's RIVER_PAGE_STYLES, renderBusinessProfile.ts's PROFILE_STYLES).
export const BASE_PAGE_STYLES = `
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    padding: 24px 16px 64px;
    background: #f7f7f5;
    color: #1c1c1a;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Roboto, sans-serif;
  }
`

export const CARD_FEED_STYLES = `
  .new-posts-banner {
    display: block;
    width: 100%;
    margin: 0 0 16px;
    padding: 10px 16px;
    border-radius: 999px;
    border: 1px solid #1c1c1a;
    background: #1c1c1a;
    color: #fff;
    font: inherit;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
  }
  #river-feed { display: grid; grid-template-columns: 1fr; gap: 16px; }
  #river-feed .card.grid { grid-column: span 1; }
  @media (min-width: 640px) {
    #river-feed { grid-template-columns: 1fr 1fr; }
    #river-feed .card.hero, #river-feed .card.full { grid-column: 1 / -1; }
  }
  .card {
    background: #fff;
    border: 1px solid #e5e5e0;
    border-radius: 16px;
    padding: 20px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  }
  .card-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
  .card-header { display: flex; align-items: center; gap: 10px; text-decoration: none; color: inherit; }
  .avatar {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    object-fit: cover;
    display: block;
    border: 1px solid #e5e5e0;
    flex-shrink: 0;
  }
  .avatar-fallback {
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f0f0ec;
    font-size: 14px;
    font-weight: 600;
  }
  .business-name { font-weight: 650; font-size: 14px; }
  .sponsored-label { font-size: 11px; font-weight: 600; color: #8a6d1a; background: #fdf3d8; border-radius: 999px; padding: 1px 8px; margin-left: 6px; }
  .featured-label { font-size: 11px; font-weight: 600; color: #1c5a8a; background: #dcedfb; border-radius: 999px; padding: 1px 8px; margin-left: 6px; }
  .timestamp { font-size: 12px; color: #6b6b64; }
  .body { margin: 14px 0 0; font-size: 15px; line-height: 1.5; white-space: pre-wrap; }
  .creative-link { display: block; margin-top: 14px; text-decoration: none; }
  .creative-image { width: 100%; border-radius: 10px; display: block; border: 1px solid #e5e5e0; }
  .gallery { margin-top: 14px; display: grid; gap: 4px; border-radius: 10px; overflow: hidden; }
  .gallery.count-1 { grid-template-columns: 1fr; }
  .gallery.count-2 { grid-template-columns: 1fr 1fr; }
  .gallery.count-3, .gallery.count-4 { grid-template-columns: 1fr 1fr; }
  .gallery img { width: 100%; height: 100%; aspect-ratio: 1; object-fit: cover; display: block; }
  .gallery.count-1 img { aspect-ratio: 16/10; }
  .post-video { width: 100%; border-radius: 10px; margin-top: 14px; display: block; background: #000; }
  .link-preview-card {
    display: block;
    margin-top: 14px;
    border: 1px solid #e5e5e0;
    border-radius: 10px;
    text-decoration: none;
    color: inherit;
    overflow: hidden;
  }
  .link-preview-card img { width: 100%; aspect-ratio: 2/1; object-fit: cover; display: block; }
  .link-preview-body { padding: 10px 14px; }
  .link-preview-title { font-size: 14px; font-weight: 650; margin: 0; }
  .link-preview-description { font-size: 13px; color: #6b6b64; margin: 4px 0 0; }
  .link-preview-domain { font-size: 12px; color: #6b6b64; margin: 4px 0 0; text-transform: uppercase; letter-spacing: 0.02em; }
  .page-card { margin-top: 14px; border: 1px solid #e5e5e0; border-radius: 10px; padding: 14px; }
  .page-card-name { font-size: 14px; font-weight: 650; margin: 0; }
  .cta-row { margin-top: 12px; }
  a.cta-btn {
    display: inline-block;
    font-size: 13px;
    font-weight: 650;
    color: #fff;
    background: #1c1c1a;
    text-decoration: none;
    border-radius: 999px;
    padding: 8px 18px;
  }
  .empty { text-align: center; color: #6b6b64; padding: 40px 0; }
  .more { display: block; text-align: center; margin-top: 16px; font-size: 14px; color: #1c1c1a; text-decoration: none; font-weight: 600; }
  .engagement-row { margin-top: 14px; display: flex; align-items: center; gap: 12px; }
  .reaction-count { font-size: 13px; color: #6b6b64; }
  .follow-form, .pin-form { margin: 0; flex-shrink: 0; }
  form.inline-action { display: inline; margin: 0; }
  button.action-btn {
    font: inherit;
    font-size: 13px;
    font-weight: 600;
    border: 1px solid #e5e5e0;
    background: #fff;
    color: #1c1c1a;
    border-radius: 999px;
    padding: 6px 14px;
    cursor: pointer;
  }
  button.action-btn.active { background: #1c1c1a; color: #fff; border-color: #1c1c1a; }
  button.follow-btn, button.pin-btn { font: inherit; font-size: 12px; font-weight: 600; border: 1px solid #e5e5e0; background: #fff; color: #1c1c1a; border-radius: 999px; padding: 4px 12px; cursor: pointer; }
  button.pin-btn.active { background: #1c5a8a; color: #fff; border-color: #1c5a8a; }
`

export function renderCard(
  card: RiverFeedCard & { featured?: boolean },
  currentUrl: string,
  position: number,
): string {
  const avatar = card.business.logoUrl
    ? `<img class="avatar" src="${escapeHtml(card.business.logoUrl)}" alt="" />`
    : `<div class="avatar avatar-fallback" aria-hidden="true">${escapeHtml(initials(card.business.name))}</div>`

  const profileHref = card.business.slug ? riverPostVisitProfileUrl(card.id) : null
  const badge = card.featured
    ? `<span class="featured-label">Featured</span>`
    : card.sponsored
      ? `<span class="sponsored-label">Sponsored</span>`
      : ''
  const header = `
    <a class="card-header" href="${profileHref ? escapeHtml(profileHref) : '#'}">
      ${avatar}
      <span>
        <span class="business-name">${escapeHtml(card.business.name)}</span>${badge}<br />
        <span class="timestamp">${escapeHtml(formatTimestamp(card.createdAt))}</span>
      </span>
    </a>`

  // Only rendered for a recognized viewer who isn't looking at their own post — see the slice-2
  // plan doc's viewerFollowsBusiness === null (anonymous) vs boolean (recognized) contract.
  const followControl =
    !card.isOwnPost && card.viewerFollowsBusiness !== null
      ? `<form class="follow-form inline-action" method="post" action="${escapeHtml(
          actionUrl(
            `/river/businesses/${card.business.id}/${card.viewerFollowsBusiness ? 'unfollow' : 'follow'}`,
            currentUrl,
          ),
        )}"><button type="submit" class="follow-btn">${card.viewerFollowsBusiness ? 'Following' : 'Follow'}</button></form>`
      : ''

  const bodyHtml = card.body ? `<p class="body">${escapeHtml(card.body)}</p>` : ''

  const clickUrl = card.hasClickThrough ? riverPostClickUrl(card.id) : null

  // Video and images can both be set on one TEXT post (the composer allows picking both, and
  // RiverPostService#create has no XOR between them) — render both, video first, rather than
  // silently dropping the gallery. An AD's single image comes from card.imageUrls[0] the same as
  // before. PAGE posts get their own text-only card below instead (no fabricated thumbnail — see
  // the slice-6 plan doc).
  let media = ''
  if (card.videoUrl) {
    media += `<video class="post-video" src="${escapeHtml(card.videoUrl)}" controls preload="metadata"></video>`
  }
  if (card.imageUrls.length === 1) {
    const img = `<img class="creative-image" src="${escapeHtml(card.imageUrls[0]!)}" alt="" />`
    media += clickUrl
      ? `<a class="creative-link" href="${escapeHtml(clickUrl)}">${img}</a>`
      : `<div style="margin-top:14px">${img}</div>`
  } else if (card.imageUrls.length > 1) {
    const shown = card.imageUrls.slice(0, 4)
    media += `<div class="gallery count-${shown.length}">${shown
      .map((url) => `<img src="${escapeHtml(url)}" alt="" />`)
      .join('')}</div>`
  }

  const linkPreview = card.linkPreview
    ? `<a class="link-preview-card" href="${escapeHtml(clickUrl ?? card.linkPreview.url)}">
        ${card.linkPreview.imageUrl ? `<img src="${escapeHtml(card.linkPreview.imageUrl)}" alt="" />` : ''}
        <div class="link-preview-body">
          ${card.linkPreview.title ? `<p class="link-preview-title">${escapeHtml(card.linkPreview.title)}</p>` : ''}
          ${card.linkPreview.description ? `<p class="link-preview-description">${escapeHtml(card.linkPreview.description)}</p>` : ''}
          <p class="link-preview-domain">${escapeHtml(new URL(card.linkPreview.url).hostname)}</p>
        </div>
      </a>`
    : ''

  const pageCard =
    card.type === 'PAGE' && card.pageInfo
      ? `<div class="page-card"><p class="page-card-name">${escapeHtml(card.pageInfo.name)}</p></div>`
      : ''

  const ctaRow =
    card.cta && clickUrl
      ? `<div class="cta-row"><a class="cta-btn" href="${escapeHtml(clickUrl)}">${escapeHtml(card.cta.label)}</a></div>`
      : card.type === 'PAGE' && clickUrl
        ? `<div class="cta-row"><a class="cta-btn" href="${escapeHtml(clickUrl)}">View page</a></div>`
        : ''

  const reactionCountLabel = `${card.reactionCount} reaction${card.reactionCount === 1 ? '' : 's'}`
  const reactControl =
    card.viewerHasReacted !== null
      ? `<form class="inline-action" method="post" action="${escapeHtml(
          actionUrl(
            `/river/posts/${card.id}/${card.viewerHasReacted ? 'unreact' : 'react'}`,
            currentUrl,
          ),
        )}"><button type="submit" class="action-btn${card.viewerHasReacted ? ' active' : ''}">${card.viewerHasReacted ? 'Reacted' : 'React'}</button></form>`
      : ''
  const engagementRow = `<div class="engagement-row"><span class="reaction-count">${reactionCountLabel}</span>${reactControl}</div>`

  return `<article class="card ${layoutClassForPosition(position)}"><div class="card-top">${header}${followControl}</div>${bodyHtml}${media}${pageCard}${linkPreview}${ctaRow}${engagementRow}</article>`
}

// Vanilla JS, no build step — same inline-<script> convention EmbedServingService's embed pages
// already use for impression/click postMessage handling. Freshness without WebSockets: infinite
// scroll + a click-to-insert "N new posts" banner, both fetching GET /river/feed (JSON). See the
// River feed v2 plan doc.
//
// Pin controls are deliberately NOT rendered here for client-appended/polled cards (infinite
// scroll or the "N new posts" banner) — RiverFeedItem carries no pin-eligibility field, and
// pinning is a rare, deliberate curation action, not something a business needs mid-scroll. Pin
// only ever appears on the initial server-rendered page — see renderBusinessProfile.ts.
export function feedScript(opts: {
  viewerBusinessId: string | null
  latestPublishedAt: string | null
  nextCursor: string | null
  following: boolean
  // Scopes every /river/feed fetch this script makes (pagination + polling) to one business —
  // set only on the profile page's embedded feed section, never on the global /river feed.
  scopeBusinessId?: string | null
  // The profile page's pinned/Featured post id, if any — kept out of the regular list below it
  // on every subsequent page/poll too, not just the initial server-rendered one.
  excludePostId?: string | null
}): string {
  // Only IDs/timestamps/cursors ever land here — no free-text business/user content — so a plain
  // JSON.stringify is safe with no </script>-breakout concern.
  const bootstrap = JSON.stringify({
    viewerBusinessId: opts.viewerBusinessId,
    latestPublishedAt: opts.latestPublishedAt,
    nextCursor: opts.nextCursor,
    following: opts.following,
    scopeBusinessId: opts.scopeBusinessId ?? null,
    excludePostId: opts.excludePostId ?? null,
  })
  return `<script>
(function () {
  var STATE = ${bootstrap};
  var feed = document.getElementById('river-feed');
  var sentinel = document.getElementById('river-load-more-sentinel');
  var banner = document.getElementById('river-new-posts-banner');
  var loadingMore = false;
  var pendingBatch = null;

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function initials(name) {
    return (name || '').split(' ').filter(Boolean).map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase();
  }
  function layoutClass(position) {
    var m = position % 6 || 6;
    if (m === 1) return 'hero';
    if (m === 6) return 'full';
    return 'grid';
  }
  function currentUrl() {
    return encodeURIComponent(location.pathname + location.search);
  }
  function scopeQuery() {
    var qs = STATE.scopeBusinessId ? '&business=' + encodeURIComponent(STATE.scopeBusinessId) : '';
    if (STATE.excludePostId) qs += '&exclude=' + encodeURIComponent(STATE.excludePostId);
    return qs;
  }

  function renderItem(item, position) {
    var avatar = item.business.logoUrl
      ? '<img class="avatar" src="' + escapeHtml(item.business.logoUrl) + '" alt="" />'
      : '<div class="avatar avatar-fallback" aria-hidden="true">' + escapeHtml(initials(item.business.name)) + '</div>';
    var badge = item.type === 'SPONSORED' ? '<span class="sponsored-label">Sponsored</span>' : '';
    var profileHref = item.business.slug ? ('/river/posts/' + item.id + '/visit-profile') : '#';
    var header = '<a class="card-header" href="' + profileHref + '">' + avatar +
      '<span><span class="business-name">' + escapeHtml(item.business.name) + '</span>' + badge +
      '<br /><span class="timestamp">' + escapeHtml(String(item.publishedAt).slice(0, 10)) + '</span></span></a>';

    var followControl = '';
    if (item.viewer && STATE.viewerBusinessId && item.business.id !== STATE.viewerBusinessId) {
      var followAction = '/river/businesses/' + item.business.id + '/' + (item.viewer.following ? 'unfollow' : 'follow') + '?returnTo=' + currentUrl();
      followControl = '<form class="follow-form inline-action" method="post" action="' + followAction + '"><button type="submit" class="follow-btn">' + (item.viewer.following ? 'Following' : 'Follow') + '</button></form>';
    }

    var bodyHtml = item.body ? '<p class="body">' + escapeHtml(item.body) + '</p>' : '';
    var clickUrl = item.clickUrl || null;

    // Gallery / video / AD creative — same rendering as renderCard (lib/riverFeedRender.ts): video
    // and images can both be set on one TEXT post, so both render rather than one dropping the other.
    var media = '';
    var images = (item.media || []).filter(function (m) { return m.type === 'IMAGE'; }).map(function (m) { return m.url; });
    var video = (item.media || []).filter(function (m) { return m.type === 'VIDEO'; })[0];
    if (video) {
      media += '<video class="post-video" src="' + escapeHtml(video.url) + '" controls preload="metadata"></video>';
    }
    if (images.length === 1) {
      var img = '<img class="creative-image" src="' + escapeHtml(images[0]) + '" alt="" />';
      media += clickUrl
        ? '<a class="creative-link" href="' + escapeHtml(clickUrl) + '">' + img + '</a>'
        : '<div style="margin-top:14px">' + img + '</div>';
    } else if (images.length > 1) {
      var shown = images.slice(0, 4);
      media += '<div class="gallery count-' + shown.length + '">' + shown.map(function (url) {
        return '<img src="' + escapeHtml(url) + '" alt="" />';
      }).join('') + '</div>';
    }

    var linkPreview = '';
    if (item.linkPreview) {
      var lp = item.linkPreview;
      var domain = '';
      try { domain = new URL(lp.url).hostname; } catch (e) { domain = lp.url; }
      linkPreview = '<a class="link-preview-card" href="' + escapeHtml(clickUrl || lp.url) + '">'
        + (lp.imageUrl ? '<img src="' + escapeHtml(lp.imageUrl) + '" alt="" />' : '')
        + '<div class="link-preview-body">'
        + (lp.title ? '<p class="link-preview-title">' + escapeHtml(lp.title) + '</p>' : '')
        + (lp.description ? '<p class="link-preview-description">' + escapeHtml(lp.description) + '</p>' : '')
        + '<p class="link-preview-domain">' + escapeHtml(domain) + '</p>'
        + '</div></a>';
    }

    var pageCard = item.type === 'PAGE' && item.pageInfo
      ? '<div class="page-card"><p class="page-card-name">' + escapeHtml(item.pageInfo.name) + '</p></div>'
      : '';

    var ctaRow = '';
    if (item.cta && clickUrl) {
      ctaRow = '<div class="cta-row"><a class="cta-btn" href="' + escapeHtml(clickUrl) + '">' + escapeHtml(item.cta.label) + '</a></div>';
    } else if (item.type === 'PAGE' && clickUrl) {
      ctaRow = '<div class="cta-row"><a class="cta-btn" href="' + escapeHtml(clickUrl) + '">View page</a></div>';
    }

    var reactionCount = (item.metrics && item.metrics.reactions) || 0;
    var reactionLabel = reactionCount + ' reaction' + (reactionCount === 1 ? '' : 's');
    var reactControl = '';
    if (item.viewer) {
      var reactAction = '/river/posts/' + item.id + '/' + (item.viewer.reacted ? 'unreact' : 'react') + '?returnTo=' + currentUrl();
      reactControl = '<form class="inline-action" method="post" action="' + reactAction + '"><button type="submit" class="action-btn' + (item.viewer.reacted ? ' active' : '') + '">' + (item.viewer.reacted ? 'Reacted' : 'React') + '</button></form>';
    }
    var engagementRow = '<div class="engagement-row"><span class="reaction-count">' + reactionLabel + '</span>' + reactControl + '</div>';

    var article = document.createElement('article');
    article.className = 'card ' + layoutClass(position);
    article.innerHTML = '<div class="card-top">' + header + followControl + '</div>' + bodyHtml + media + pageCard + linkPreview + ctaRow + engagementRow;
    return article;
  }

  function reclassifyLayout() {
    var cards = feed.querySelectorAll('.card');
    for (var i = 0; i < cards.length; i++) cards[i].className = 'card ' + layoutClass(i + 1);
  }

  function trackLatest(items) {
    for (var i = 0; i < items.length; i++) {
      if (!STATE.latestPublishedAt || items[i].publishedAt > STATE.latestPublishedAt) {
        STATE.latestPublishedAt = items[i].publishedAt;
      }
    }
  }

  function appendBelow(items) {
    var startPosition = feed.querySelectorAll('.card').length + 1;
    items.forEach(function (item, idx) {
      feed.appendChild(renderItem(item, startPosition + idx));
    });
    trackLatest(items);
  }

  function prependAbove(items) {
    var frag = document.createDocumentFragment();
    items.forEach(function (item) { frag.appendChild(renderItem(item, 1)); });
    feed.insertBefore(frag, feed.firstChild);
    reclassifyLayout();
    trackLatest(items);
  }

  // Infinite scroll
  if (sentinel && 'IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting || loadingMore || !STATE.nextCursor) return;
      loadingMore = true;
      var qs = 'cursor=' + encodeURIComponent(STATE.nextCursor) + (STATE.following ? '&following=1' : '') + scopeQuery();
      fetch('/river/feed?' + qs)
        .then(function (r) { return r.json(); })
        .then(function (data) {
          appendBelow(data.items || []);
          STATE.nextCursor = data.nextCursor;
          loadingMore = false;
          if (!STATE.nextCursor) observer.disconnect();
        })
        .catch(function () { loadingMore = false; });
    }, { rootMargin: '400px' });
    observer.observe(sentinel);
  }

  // Polling — "the feeling of a live network without needing sockets." Never auto-inserts while
  // the visitor is mid-read; a click on the banner is required.
  function poll() {
    if (!STATE.latestPublishedAt) return;
    fetch('/river/feed?after=' + encodeURIComponent(STATE.latestPublishedAt) + scopeQuery())
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var items = data.items || [];
        if (items.length && banner) {
          pendingBatch = items;
          banner.textContent = '\\u2191 ' + items.length + ' new post' + (items.length === 1 ? '' : 's');
          banner.hidden = false;
        }
      })
      .catch(function () {});
  }
  if (banner) {
    banner.addEventListener('click', function () {
      if (!pendingBatch) return;
      prependAbove(pendingBatch.slice().reverse());
      pendingBatch = null;
      banner.hidden = true;
    });
  }
  setInterval(poll, 25000);
})();
</script>`
}
