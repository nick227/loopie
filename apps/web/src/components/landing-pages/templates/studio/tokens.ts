export const TOKEN_DEFAULTS = {
  primaryColor: '#FF2D6A',
  onPrimaryColor: '#FFFFFF',
  backgroundColor: '#FFFFFF',
  inkColor: '#0A0A0A',
  cardColor: '#F5F5F5',
  fontFamily: '"DM Sans", ui-sans-serif, system-ui, sans-serif',
  headingFont: 'Syne, ui-sans-serif, system-ui, sans-serif',
  radius: '9999px',
}

export const ink = (mix: number) => `color-mix(in srgb, var(--lp-ink) ${mix}%, var(--lp-bg))`
export const inv = (mix: number) => `color-mix(in srgb, var(--lp-bg) ${mix}%, var(--lp-ink))`

/** Shared layout rhythm — every frame uses the same gutter + measure. */
export const FRAME = 'relative mx-auto w-full max-w-[1280px] px-6 py-16 sm:px-8 lg:px-12 lg:py-20'

export const DISPLAY =
  'font-bold leading-[0.92] tracking-[-0.04em] text-[clamp(2.75rem,8vw,6.5rem)]'

export const TITLE =
  'font-bold leading-[1.05] tracking-[-0.03em] text-[clamp(1.75rem,3.5vw,2.75rem)]'

export const LABEL = 'text-[11px] font-semibold uppercase tracking-[0.22em]'

export const BODY = 'text-base leading-relaxed sm:text-[1.05rem]'
