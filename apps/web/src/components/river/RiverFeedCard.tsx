import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Heart, MessageCircle, FileText, ArrowUpRight } from 'lucide-react'
import type { components } from '@project/sdk'
import {
  useReactToRiverPost,
  useUnreactToRiverPost,
  useRiverComments,
  useCreateRiverComment,
} from '@project/sdk'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { relativeTime } from '@/components/home/homeFormat'
import { trackRiverProfileVisit } from '@/lib/river'
import { cn } from '@/lib/utils'
import {
  RiverPostMedia,
  RiverPostHeaderChrome,
  AdCreativeVisual,
  useIsPortrait,
} from '@/components/river/RiverPostPresentation'

const CommentSheet = lazy(() =>
  import('@/components/river/CommentSheet').then((m) => ({ default: m.CommentSheet })),
)

type RiverFeedItem = components['schemas']['RiverFeedItem']

// Card anatomy, redesign pass (see the dated "River item + composer redesign" plan): header →
// media (full-bleed) → engagement icons → caption → comments, matching how Instagram lays a post
// out — no detached/boxed header, no card-in-a-card border. The actual geometry (media sizing,
// header layout) now lives in RiverPostPresentation.tsx, shared verbatim with the composer's own
// live preview so "what you compose" can never visually drift from "what gets posted."

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

function Media({ item }: { item: RiverFeedItem }) {
  const media = item.media ?? []
  const video = media.find((m) => m.type === 'VIDEO')?.url
  const images = media.filter((m) => m.type === 'IMAGE').map((m) => m.url)
  // The media *is* the shared artifact for an AD/SPONSORED post — clickable, badged, distinct
  // from a native photo someone just posted. Not applied to a TEXT post that happens to have both
  // media and a linkUrl — LinkPreview already owns that click affordance, and wrapping the photo
  // too would just be two things pointing at the same place.
  const isAdCreative = item.type === 'AD' || item.type === 'SPONSORED'

  // A real Ad Designer creative (format set) renders through the shared renderer, in its own
  // format's shape — not flattened into the generic image treatment below. Pre-Ad-Designer AD
  // posts (adCreative absent) keep rendering exactly as before.
  if (item.adCreative) {
    const badge = (
      <span className="absolute left-2.5 top-2.5 rounded-full bg-background/85 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground backdrop-blur-sm">
        Ad
      </span>
    )
    return <AdCreativeVisual adCreative={item.adCreative} badge={badge} />
  }

  if (!video && images.length === 0) return null

  const badge = isAdCreative ? (
    <span className="absolute left-2.5 top-2.5 rounded-full bg-background/85 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground backdrop-blur-sm">
      Ad
    </span>
  ) : undefined

  const visual = <RiverPostMedia images={images} video={video} badge={badge} />

  return isAdCreative && item.clickUrl ? (
    <a href={item.clickUrl} target="_blank" rel="noopener noreferrer" className="block">
      {visual}
    </a>
  ) : (
    visual
  )
}

// The bottom-of-card caption line — bold business name + post body, inline like Instagram's own
// caption. Only used where there's a real artifact above it (media/Page/Ad); a text-only post's
// body IS the content and stays in its own larger treatment right under the header instead.
function Caption({ item }: { item: RiverFeedItem }) {
  if (!item.body) return null
  return <p className="whitespace-pre-wrap text-sm leading-snug text-foreground">{item.body}</p>
}

function LinkPreview({ item }: { item: RiverFeedItem }) {
  if (!item.linkPreview) return null
  const { linkPreview } = item
  const domain = hostnameOf(linkPreview.url)
  const href = item.clickUrl ?? linkPreview.url
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-4 flex gap-3 overflow-hidden rounded-[14px] border border-border transition-colors hover:bg-accent"
    >
      {linkPreview.imageUrl ? (
        <img src={linkPreview.imageUrl} alt="" className="h-24 w-24 shrink-0 object-cover" />
      ) : null}
      <div className="min-w-0 flex-1 py-2.5 pr-3">
        {linkPreview.title ? (
          <p className="truncate text-sm font-medium text-foreground">{linkPreview.title}</p>
        ) : null}
        {linkPreview.description ? (
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
            {linkPreview.description}
          </p>
        ) : null}
        <p className="mt-1 text-xs text-muted-foreground">{domain}</p>
      </div>
    </a>
  )
}

// A shared Page's "artifact chip" — background tint, no border of its own (the post's own
// outline already provides a boundary; a second border here was reading as a card nested inside
// a card). The whole chip is the click target now, folding in what CtaRow used to render
// separately as "View page" underneath it — one artifact, one action, not two stacked elements.
function PageCard({ item }: { item: RiverFeedItem }) {
  if (item.type !== 'PAGE' || !item.pageInfo) return null
  const content = (
    <>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground">
        <FileText size={17} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Page
        </span>
        <span className="block truncate text-sm font-semibold text-foreground">
          {item.pageInfo.name}
        </span>
      </span>
      <ArrowUpRight size={16} className="shrink-0 text-muted-foreground" />
    </>
  )
  return item.clickUrl ? (
    <a
      href={item.clickUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-4 flex items-center gap-3 rounded-[14px] bg-muted/50 px-4 py-3.5 transition-colors hover:bg-muted"
    >
      {content}
    </a>
  ) : (
    <div className="mt-4 flex items-center gap-3 rounded-[14px] bg-muted/50 px-4 py-3.5">
      {content}
    </div>
  )
}

function CtaRow({ item }: { item: RiverFeedItem }) {
  // PAGE's click affordance is folded into the artifact chip above (PageCard) — one action, not
  // a second button repeating it underneath. A real Ad Designer creative already renders its own
  // CTA per its ctaPlacement preset (see AdCreativeVisual/StageFrame above) — same reasoning.
  if (item.type === 'PAGE') return null
  if (item.adCreative) return null
  if (!item.clickUrl) return null
  const label =
    item.cta?.label ?? (item.type === 'AD' || item.type === 'SPONSORED' ? 'Learn more' : null)
  if (!label) return null
  return (
    <div className="">
      <a href={item.clickUrl} target="_blank" rel="noopener noreferrer" className="block">
        <Button variant="outline" size="sm" className="w-full sm:w-auto">
          {label}
        </Button>
      </a>
    </div>
  )
}

// --- Stage variant helpers ---------------------------------------------------------------
// Same underlying data (media/pageInfo/linkPreview) as the components above, rendered into one
// fixed-footprint frame instead of Media/PageCard/LinkPreview's own independently-sized boxes —
// see RiverPage's "normalized River stage" note. A fixed aspect box, not a flex-1 fill: letting
// height come from width (via aspect-ratio) rather than from the parent's resolved flex height
// keeps this self-contained and correct even where the parent's height is itself still settling.
//
// Refinement pass (see the dated "River stage: visual refinement" note): 4/5 alone read too
// portrait/phone-card-like once the stage sits inside a wide desktop viewport with room to spare
// on either side — sm: and up now open the frame to a squarer 4/3, wider too, since a squarer box
// can afford more width without reading tall. Mobile keeps 4/5 (portrait phone media is genuinely
// portrait-shaped most of the time). Every content type — text, media, Page, Ad — shares this one
// sizing class, just with a different fill/overflow treatment layered on top.
const STAGE_FRAME_SIZE_CLASS = 'relative w-full aspect-[4/5] max-h-full sm:aspect-[4/3]'

function stageTextSizeClass(length: number) {
  if (length <= 40) return 'text-4xl'
  if (length <= 90) return 'text-3xl'
  if (length <= 160) return 'text-2xl'
  if (length <= 280) return 'text-xl'
  return 'text-lg'
}

// Text-only posts now render *inside* the same frame footprint as media, per the refinement
// note's "text-only typography treatment inside the 4:5 frame" — a quiet tinted card rather than
// bare centered text floating in whitespace, so it reads as the same kind of "artifact slot" every
// other post type fills. overflow-y-auto (not hidden, unlike the media frame) is the safety valve
// for a long body at a still-large font — it scrolls inside its own box rather than clipping.
function StageTextFrame({ body }: { body: string }) {
  return (
    <div className={cn(STAGE_FRAME_SIZE_CLASS, 'overflow-y-auto bg-muted/40')}>
      <div className="flex w-full items-center justify-center p-8">
        <p
          className={cn(
            'whitespace-pre-wrap text-center font-medium leading-snug text-foreground',
            stageTextSizeClass(body.length),
          )}
        >
          {body}
        </p>
      </div>
    </div>
  )
}

function StageFrame({ item }: { item: RiverFeedItem }) {
  const media = item.media ?? []
  const video = media.find((m) => m.type === 'VIDEO')
  const images = media.filter((m) => m.type === 'IMAGE').map((m) => m.url)
  const singleImage = images.length === 1 ? images[0] : undefined
  const portrait = useIsPortrait(singleImage)
  const isAdCreative = item.type === 'AD' || item.type === 'SPONSORED'

  // Same shared-renderer branch as Media() above — a real creative gets its own natural shape,
  // never squeezed into STAGE_FRAME_SIZE_CLASS's fixed box (see AdCreativeVisual's doc comment).
  // Not wrapped in the clickable <a> below either — the fragment already carries its own href.
  if (item.adCreative) {
    return (
      <AdCreativeVisual
        adCreative={item.adCreative}
        className="max-w-[420px]"
        badge={
          <span className="absolute left-3 top-3 rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
            Ad
          </span>
        }
      />
    )
  }

  let visual: React.ReactNode = null
  if (video) {
    visual = (
      <video
        src={video.url}
        controls
        preload="metadata"
        className="h-full w-full bg-black object-contain"
      />
    )
  } else if (singleImage) {
    // Intentional cropping, not flat letterboxing: a portrait image that can't fill the frame gets
    // its own blurred, oversized copy behind it instead of a plain gray bar either side — same
    // "blurred backdrop" treatment music/video apps use, still clearly the same photo, no dead
    // space. A landscape/near-square image just covers the frame outright, no backdrop needed.
    visual = portrait ? (
      <div className="relative h-full w-full overflow-hidden">
        <img
          src={singleImage}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full scale-110 object-cover opacity-50 blur-2xl"
        />
        <img src={singleImage} alt="" className="relative h-full w-full object-contain" />
      </div>
    ) : (
      <img src={singleImage} alt="" className="h-full w-full object-cover" />
    )
  } else if (images.length > 1) {
    visual = (
      <div className="grid h-full w-full grid-cols-2 gap-1">
        {images.slice(0, 4).map((url, i) => (
          <img key={url + i} src={url} alt="" className="h-full w-full object-cover" />
        ))}
      </div>
    )
  } else if (item.type === 'PAGE' && item.pageInfo) {
    // A literal "this is a web destination" cue — a mini browser-chrome bar — differentiates Page
    // from Ad at a glance without touching the shared frame footprint: neutral dots, not a real
    // traffic-light red/yellow/green (that reads like a screenshot chrome, not this app's own
    // editorial voice), just enough of the metaphor to land.
    visual = (
      <div className="flex h-full w-full flex-col bg-muted/40">
        <div className="flex shrink-0 items-center gap-1.5 border-b border-border/60 px-3 py-2.5">
          <span className="h-2 w-2 rounded-full bg-muted-foreground/25" />
          <span className="h-2 w-2 rounded-full bg-muted-foreground/25" />
          <span className="h-2 w-2 rounded-full bg-muted-foreground/25" />
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-background text-muted-foreground">
            <FileText size={26} />
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Page
          </span>
          <span className="text-xl font-semibold text-foreground">{item.pageInfo.name}</span>
        </div>
      </div>
    )
  } else if (item.linkPreview) {
    const domain = hostnameOf(item.linkPreview.url)
    visual = (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-muted/50 p-8 text-center">
        {item.linkPreview.imageUrl ? (
          <img
            src={item.linkPreview.imageUrl}
            alt=""
            className="max-h-[55%] w-full rounded-lg object-cover"
          />
        ) : null}
        {item.linkPreview.title ? (
          <span className="line-clamp-2 text-lg font-semibold text-foreground">
            {item.linkPreview.title}
          </span>
        ) : null}
        <span className="text-xs text-muted-foreground">{domain}</span>
      </div>
    )
  }

  if (!visual) return null

  const frame = (
    <div className={cn(STAGE_FRAME_SIZE_CLASS, 'overflow-hidden')}>
      {visual}
      {isAdCreative ? (
        // A solid, branded badge (not a neutral translucent pill) — Ad gets the app's own accent
        // color so it reads distinctly promotional next to Page's deliberately neutral gray chrome
        // metaphor above, without either one breaking the shared frame shape.
        <span className="absolute left-3 top-3 rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
          Ad
        </span>
      ) : null}
    </div>
  )

  const clickable = (isAdCreative || item.type === 'PAGE') && item.clickUrl
  return clickable ? (
    <a href={item.clickUrl!} target="_blank" rel="noopener noreferrer" className="block w-full">
      {frame}
    </a>
  ) : (
    frame
  )
}

// A subtle focus effect so post-to-post scrolling reads as settling into place rather than a hard
// mechanical cut — the currently-centered post is fully opaque/full-scale, and posts still
// scrolling into or out of view ease down toward ~55% opacity / ~97% scale. IntersectionObserver
// (not a scroll listener) so this stays cheap with several stage posts mounted by the virtualizer
// at once; the CSS transition is what actually makes it feel smooth between observer updates.
function useStageFocus<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [focus, setFocus] = useState(1)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const thresholds = Array.from({ length: 21 }, (_, i) => i / 20)
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry) setFocus(entry.intersectionRatio)
      },
      { threshold: thresholds },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return {
    ref,
    style: {
      opacity: 0.55 + focus * 0.45,
      transform: `scale(${0.97 + focus * 0.03})`,
      transition: 'opacity 220ms ease-out, transform 220ms ease-out',
    } as const,
  }
}
function CommentPreviewRow({ comment }: { comment: components['schemas']['RiverComment'] }) {
  return (
    <div className="flex items-start gap-2.5">
      <Avatar src={comment.business.logoUrl} name={comment.business.name} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug">
          <span className="font-semibold text-foreground">{comment.business.name}</span>{' '}
          <span className="text-foreground">{comment.body}</span>
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{relativeTime(comment.createdAt)}</p>
      </div>
    </div>
  )
}

// Deliberately compact — a single-line input, not a full Textarea, per the spec ("composer stays
// compact under the post"). Exported: RiverPostPage (the full-thread permalink page) reuses this
// exact component both for a new top-level comment and, per-comment, for a reply — it's generic
// on purpose (just `onSubmit`/`pending`), the caller decides what the submitted body attaches to.
export function CommentComposer({
  onSubmit,
  pending,
}: {
  onSubmit: (body: string) => void
  pending: boolean
}) {
  const [value, setValue] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed || pending) return
    onSubmit(trimmed)
    setValue('')
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Write a comment…"
        disabled={pending}
        className="h-9 text-sm"
      />
      <Button type="submit" size="sm" disabled={pending || !value.trim()}>
        Post
      </Button>
    </form>
  )
}

// The inline expand-in-place preview: latest 2 top-level comments (reordered oldest-first for
// display — the API's own newest-first order is a pagination concern, not a reading one), a
// compact composer, and a link to the full thread. Same GET /river/posts/{id}/comments endpoint
// the full-thread permalink page uses, just with limit: 2 — one list implementation, two callers.
// Returns bare content (no outer border/spacing) — callers own the wrapper, since the stage
// variant needs to bound this inside its own scroll region while the compact variant doesn't.
function CommentsSection({ item }: { item: RiverFeedItem }) {
  const preview = useRiverComments(item.id, { limit: 2 })
  const createComment = useCreateRiverComment()
  const comments = [...(preview.data?.pages[0]?.data ?? [])].reverse()
  const [sheetOpen, setSheetOpen] = useState(false)

  const count = item.metrics.comments

  return (
    <div className="space-y-3">
      {preview.isPending ? (
        <p className="text-xs text-muted-foreground">Loading comments…</p>
      ) : comments.length === 0 ? (
        <p className="text-xs text-muted-foreground">No comments yet — be the first.</p>
      ) : (
        comments.map((comment) => <CommentPreviewRow key={comment.id} comment={comment} />)
      )}
      <CommentComposer
        pending={createComment.isPending}
        onSubmit={(body) => createComment.mutate({ riverPostId: item.id, body })}
      />
      {count > 0 ? (
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="block text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          View all {count} {count === 1 ? 'comment' : 'comments'}
        </button>
      ) : null}
      {sheetOpen ? (
        <Suspense fallback={null}>
          <CommentSheet riverPostId={item.id} onClose={() => setSheetOpen(false)} />
        </Suspense>
      ) : null}
    </div>
  )
}

// Identity always leads. `size="large"` (stage only) gives the author row real presence on the
// bigger canvas — a noticeably bigger avatar and name, not just the same compact row transplanted
// onto a taller card — per the refinement note's "stronger author row presence."
// The header sits flush against the card — no background/padding chip of its own (the
// "detached header" the redesign dropped) — via the shared RiverPostHeaderChrome.
function AuthorRow({
  item,
  size = 'default',
}: {
  item: RiverFeedItem
  size?: 'default' | 'large'
}) {
  const large = size === 'large'
  return (
    <RiverPostHeaderChrome
      avatarSrc={item.business.logoUrl}
      name={item.business.name}
      large={large}
      to={item.business.slug ? `/b/${item.business.slug}` : undefined}
      onNavigate={() => trackRiverProfileVisit(item.id)}
      subtitle={
        <span className="flex items-center gap-1.5">
          {relativeTime(item.publishedAt)}
          {item.type === 'SPONSORED' ? (
            <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Sponsored
            </span>
          ) : null}
        </span>
      }
    />
  )
}

// Reactions and comment toggle. `size="large"` (stage only) gives it slightly bigger icons/type
// on the bigger canvas, per the refinement note's "engagement row polish."
function EngagementRow({
  item,
  canInteract,
  isPending,
  onToggleReaction,
  commentsExpanded,
  onToggleComments,
  size = 'default',
}: {
  item: RiverFeedItem
  canInteract: boolean
  isPending: boolean
  onToggleReaction: () => void
  commentsExpanded: boolean
  onToggleComments: () => void
  size?: 'default' | 'large'
}) {
  const large = size === 'large'
  const iconSize = large ? 18 : 16
  const buttonClass = cn(
    'flex items-center gap-1.5 rounded-lg font-medium transition-colors active:scale-95',
    large ? 'px-2.5 py-1.5 text-[15px]' : 'px-2 py-1 text-sm',
  )
  return (
    <div className="flex items-center gap-1">
      {canInteract ? (
        <button
          type="button"
          disabled={isPending}
          onClick={onToggleReaction}
          className={cn(
            buttonClass,
            item.viewer?.reacted
              ? 'text-primary'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground',
          )}
        >
          <Heart size={iconSize} className={item.viewer?.reacted ? 'fill-current' : ''} />
          {item.metrics.reactions}
        </button>
      ) : (
        <span className={cn(buttonClass, 'text-muted-foreground')}>
          <Heart size={iconSize} />
          {item.metrics.reactions}
        </span>
      )}
      <button
        type="button"
        onClick={onToggleComments}
        className={cn(
          buttonClass,
          commentsExpanded
            ? 'text-primary'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground',
        )}
      >
        <MessageCircle size={iconSize} />
        {item.metrics.comments}
      </button>

      <div className="ml-auto">
        <CtaRow item={item} />
      </div>
    </div>
  )
}

export function RiverFeedCard({
  item,
  variant = 'compact',
}: {
  item: RiverFeedItem
  /** Retained for compatibility with existing feed callers. */
  viewerBusinessId?: string
  /** Retained for compatibility with business-profile feed callers. */
  pin?: { isPinned: boolean }
  /** 'compact' (default) is the flowing-list card every non-River-feed consumer still uses
   * (BusinessProfilePage's Featured/Latest, RiverPostPage's own post) — unchanged from the prior
   * design passes. 'stage' is the normalized full-viewport-ish post stage RiverPage alone opts
   * into — see its own dated "normalized River stage" note: every post gets the same fixed outer
   * footprint regardless of content type, so browsing River itself feels like one post is the
   * whole experience, without forcing that same treatment onto pages where a post is one of many
   * things being shown (a business's profile, a permalink's own supporting context). */
  variant?: 'compact' | 'stage'
}) {
  const react = useReactToRiverPost()
  const unreact = useUnreactToRiverPost()
  const [commentsExpanded, setCommentsExpanded] = useState(false)
  // Called unconditionally (not inside the stage/compact branch below) so hook order never
  // depends on `variant` — compact simply never attaches the returned ref, so the observer it
  // creates has nothing to watch and stays inert.
  const { ref: stageRef, style: stageStyle } = useStageFocus<HTMLElement>()

  const canInteract = item.viewer !== undefined
  const isPending = react.isPending || unreact.isPending
  const hasMedia = Boolean((item.media ?? []).length)
  const isTextOnly = !hasMedia && !item.linkPreview && item.type !== 'PAGE'
  // Short text-only posts read large and editorial; longer ones step down a size so they don't
  // sprawl — both still comfortably above the caption-weight size a media-supported post's body
  // uses, per "business identity first, post text second, media third."
  const isShortText = isTextOnly && (item.body?.length ?? 0) <= 120

  function toggleReaction() {
    if (item.viewer?.reacted) {
      unreact.mutate(item.id)
    } else {
      react.mutate(item.id)
    }
  }

  const engagement = (
    <EngagementRow
      item={item}
      canInteract={canInteract}
      isPending={isPending}
      onToggleReaction={toggleReaction}
      commentsExpanded={commentsExpanded}
      onToggleComments={() => setCommentsExpanded((v) => !v)}
      size={variant === 'stage' ? 'large' : 'default'}
    />
  )

  const authorRow = <AuthorRow item={item} size={variant === 'stage' ? 'large' : 'default'} />

  const caption = !isTextOnly ? <Caption item={item} /> : null

  if (variant === 'stage') {
    // Every post gets the same outer footprint (~85vh, a hairline peek of the next post left
    // below the fold) regardless of what it's carrying — text-only posts use this same frame with
    // dynamic font sizing instead of their own natural-height treatment, and media/Page/Ad content
    // all render into one fixed content frame (StageFrame) instead of each type's own independently
    // sized box. Content is centered vertically in the middle region; header and footer stay
    // pinned so a long body or expanded comments scroll *within* the stage rather than growing it.
    return (
      <article
        ref={stageRef}
        style={stageStyle}
        className="flex my-4 flex-col mx-auto snap-start relative w-full max-w-[480px] rounded-2xl border border-border bg-card overflow-hidden"
      >
        <div className="px-5 pt-5 pb-3 shrink-0">{authorRow}</div>

        <div className="river-card-content flex flex-col">
          {isTextOnly ? (
            <div className="px-5 pb-4">
              <StageTextFrame body={item.body ?? ''} />
            </div>
          ) : (
            <div className="w-full">
              <StageFrame item={item} />
            </div>
          )}

          {/* Icons, then caption, then comments */}
          <div className="px-5 pt-3 pb-5 flex flex-col gap-3">
            {engagement}

            {caption ? <div className="w-full text-[15px]">{caption}</div> : null}
            {commentsExpanded ? (
              <div className="mt-2 max-h-[24vh] overflow-y-auto border-t border-border/70 pt-3">
                <CommentsSection item={item} />
              </div>
            ) : null}
          </div>
        </div>
      </article>
    )
  }

  return (
    // No boxed card, no detached header chip — every post (text or media) is a flush stack
    // separated from the next by a single hairline divider, matching the reference's continuous,
    // minimal feed. Media itself is full-bleed (no horizontal inset); everything else — header,
    // chips, icons, caption — shares one consistent inset.
    <article className="border-b border-border/70 py-4">
      <div className="px-4">{authorRow}</div>

      {isTextOnly ? (
        <div className="px-4 pt-3">
          <p
            className={cn(
              'max-w-[560px] whitespace-pre-wrap text-foreground',
              isShortText ? 'text-xl leading-relaxed' : 'text-lg leading-relaxed',
            )}
          >
            {item.body}
          </p>
        </div>
      ) : (
        <>
          <div className="mt-3">
            <Media item={item} />
          </div>
          <div className="px-4">
            <PageCard item={item} />
            <LinkPreview item={item} />
          </div>
        </>
      )}

      <div className="px-4 mt-3.5">{engagement}</div>

      {caption ? <div className="px-4 mt-2">{caption}</div> : null}

      {commentsExpanded ? (
        <div className="px-4 mt-3 border-t border-border/70 pt-3">
          <CommentsSection item={item} />
        </div>
      ) : null}
    </article>
  )
}
