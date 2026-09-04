import { useEffect, useState } from 'react'
import { motion, useTransform } from 'framer-motion'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useAsset } from '@project/sdk'
import { CanvasText } from '../../../../pages/landing-pages/components/CanvasText'
import { GalleryAddButton } from '../../../../pages/landing-pages/components/editable/GalleryAddButton'
import type { GalleryItem } from '../../../../pages/landing-pages/components/types'
import { mediaSrc } from '@/lib/media'
import { Eyebrow, type SectionProps } from './shared'
import { FrameInner, SnapPanel, useMotionPanel } from './SnapPanel'
import { useStudioMotionDisabled } from './motion'
import { ink, TITLE } from './tokens'

function useResolvedGallerySrc(item: GalleryItem | undefined): string | null {
  const assetQuery = useAsset(item?.assetId ?? '')
  if (!item) return null
  if (item.src) return item.src
  if (item.assetId) return assetQuery.data?.data ? mediaSrc(assetQuery.data.data.url) : null
  if (item.url) return mediaSrc(item.url)
  return null
}

function Lightbox({
  items,
  index,
  onIndex,
  onClose,
}: {
  items: GalleryItem[]
  index: number
  onIndex: (i: number) => void
  onClose: () => void
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') onIndex((index + 1) % items.length)
      if (e.key === 'ArrowLeft') onIndex((index - 1 + items.length) % items.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, items.length, onClose, onIndex])

  const item = items[index]
  const src = useResolvedGallerySrc(item)
  if (!item) return null
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Photo"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-black/92 p-6"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-5 top-5 text-white/70 hover:text-white"
      >
        <X className="h-6 w-6" />
      </button>
      {items.length > 1 ? (
        <>
          <button
            type="button"
            aria-label="Previous photo"
            onClick={(e) => {
              e.stopPropagation()
              onIndex((index - 1 + items.length) % items.length)
            }}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white sm:left-6"
          >
            <ChevronLeft className="h-8 w-8" />
          </button>
          <button
            type="button"
            aria-label="Next photo"
            onClick={(e) => {
              e.stopPropagation()
              onIndex((index + 1) % items.length)
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white sm:right-6"
          >
            <ChevronRight className="h-8 w-8" />
          </button>
        </>
      ) : null}
      {src ? (
        <img
          src={src}
          alt={item.alt ?? ''}
          className="max-h-[80vh] max-w-[92vw] object-contain"
          onClick={(e) => e.stopPropagation()}
        />
      ) : null}
      {item.caption ? (
        <p className="max-w-lg text-center text-sm text-white/70">{item.caption}</p>
      ) : null}
    </div>
  )
}

function GalleryTile({
  item,
  editable,
  onOpen,
  onCaptionChange,
  onRemove,
  captionLabel,
}: {
  item: GalleryItem
  editable: boolean
  onOpen: () => void
  onCaptionChange: (caption: string) => void
  onRemove: () => void
  captionLabel: string
}) {
  const src = useResolvedGallerySrc(item)
  return (
    <div className="group relative w-[min(72vw,420px)] shrink-0 sm:w-[320px]">
      {src ? (
        <img
          src={src}
          alt={item.alt ?? ''}
          onClick={() => !editable && onOpen()}
          className={`aspect-[4/5] w-full object-cover ${editable ? '' : 'cursor-zoom-in'}`}
        />
      ) : (
        <div className="aspect-[4/5] w-full" style={{ backgroundColor: ink(8) }} />
      )}
      {editable ? (
        <>
          <CanvasText
            ariaLabel={captionLabel}
            value={item.caption ?? ''}
            onChange={onCaptionChange}
            placeholder="Caption"
            className="mt-2 text-xs"
            style={{ color: ink(55) }}
          />
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remove"
            className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white opacity-0 group-hover:opacity-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </>
      ) : item.caption ? (
        <p className="mt-2 text-xs" style={{ color: ink(55) }}>
          {item.caption}
        </p>
      ) : null}
    </div>
  )
}

/**
 * Frame gesture: vertical scroll drives a horizontal strip — the classic
 * side-scroll feel without leaving the snap sequence.
 */
export function GallerySection({ content, editable, onChange }: SectionProps<'gallery'>) {
  const items = content?.items ?? []
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const { ref, progress } = useMotionPanel()
  const disabled = useStudioMotionDisabled()
  const x = useTransform(progress, [0.1, 0.9], ['0%', '-35%'])

  if (!items.length && !editable) return null

  return (
    <SnapPanel ref={ref} tone="bg" className="flex flex-col justify-center">
      <FrameInner className="pb-6">
        <Eyebrow muted>Selected work</Eyebrow>
        {editable ? (
          <CanvasText
            ariaLabel="Gallery title"
            value={content?.title ?? ''}
            onChange={(title) => onChange({ title })}
            placeholder="From the studio floor"
            style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
            className={TITLE}
          />
        ) : (
          <h2 className={TITLE} style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}>
            {content?.title}
          </h2>
        )}
      </FrameInner>

      <div className="overflow-hidden pb-16">
        <motion.div
          className="flex gap-4 px-6 sm:gap-5 sm:px-8 lg:px-12"
          style={disabled || editable ? undefined : { x }}
        >
          {items.map((item, i) => (
            <GalleryTile
              key={i}
              item={item}
              editable={editable}
              onOpen={() => setLightboxIndex(i)}
              onCaptionChange={(caption) =>
                onChange({
                  items: items.map((row, idx) => (idx === i ? { ...row, caption } : row)),
                })
              }
              onRemove={() => onChange({ items: items.filter((_, idx) => idx !== i) })}
              captionLabel={`Photo ${i + 1} caption`}
            />
          ))}
        </motion.div>
      </div>

      {editable ? (
        <div className="px-6 pb-12 sm:px-8 lg:px-12">
          <GalleryAddButton
            className="inline-flex items-center gap-1.5 text-sm font-medium underline underline-offset-4"
            onAdd={(assetIds) =>
              onChange({ items: [...items, ...assetIds.map((assetId) => ({ assetId }))] })
            }
            label="Add photos"
          />
        </div>
      ) : null}

      {!editable && lightboxIndex !== null ? (
        <Lightbox
          items={items}
          index={lightboxIndex}
          onIndex={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      ) : null}
    </SnapPanel>
  )
}
