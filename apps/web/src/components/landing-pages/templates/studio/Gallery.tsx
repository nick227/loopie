import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useAsset } from '@project/sdk'
import { CanvasText } from '../../../../pages/landing-pages/components/CanvasText'
import { GalleryAddButton } from '../../../../pages/landing-pages/components/editable/GalleryAddButton'
import type { GalleryItem } from '../../../../pages/landing-pages/components/types'
import { mediaSrc } from '@/lib/media'
import { type SectionProps } from './shared'
import { KineticBackdrop, SnapPanel, useMotionPanel } from './SnapPanel'
import { ink, kineticWord } from './tokens'

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
    <div className="group relative min-h-0">
      {src ? (
        <img
          src={src}
          alt={item.alt ?? ''}
          onClick={() => !editable && onOpen()}
          className={`aspect-square h-full w-full object-cover ${editable ? '' : 'cursor-zoom-in'}`}
        />
      ) : (
        <div className="aspect-square w-full" style={{ backgroundColor: ink(8) }} />
      )}
      {editable ? (
        <>
          <CanvasText
            ariaLabel={captionLabel}
            value={item.caption ?? ''}
            onChange={onCaptionChange}
            placeholder="Caption"
            className="mt-1 text-xs"
            style={{ color: ink(60) }}
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
      ) : null}
    </div>
  )
}

export function GallerySection({ content, editable, onChange }: SectionProps<'gallery'>) {
  const items = content?.items ?? []
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const { ref, progress } = useMotionPanel()
  const word = kineticWord(content?.title, 'WORK')

  if (!items.length && !editable) return null

  return (
    <SnapPanel ref={ref} tone="bg" className="flex flex-col justify-center py-16">
      <KineticBackdrop word={word} progress={progress} mode="slide" />
      <div className="relative z-10 mx-auto w-full max-w-6xl px-6 lg:px-8">
        {editable ? (
          <CanvasText
            ariaLabel="Gallery title"
            value={content?.title ?? ''}
            onChange={(title) => onChange({ title })}
            placeholder="From the studio floor"
            style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
            className="mb-10 text-[clamp(2.5rem,8vw,5.5rem)] font-black uppercase leading-[0.9] tracking-tighter"
          />
        ) : (
          <h2
            className="mb-10 text-[clamp(2.5rem,8vw,5.5rem)] font-black uppercase leading-[0.9] tracking-tighter"
            style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
          >
            {content?.title}
          </h2>
        )}

        <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
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
        </div>

        {editable ? (
          <GalleryAddButton
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium underline underline-offset-4"
            onAdd={(assetIds) =>
              onChange({ items: [...items, ...assetIds.map((assetId) => ({ assetId }))] })
            }
            label="Add photos"
          />
        ) : null}
      </div>

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
