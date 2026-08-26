import { Link } from 'react-router-dom'

type LandingPage = { id: string; name: string; hostedUrl: string }

const ghost =
  'bg-transparent border-0 border-b border-border p-0 h-8 shadow-none outline-none focus-visible:ring-0 rounded-none text-sm w-full max-w-xl'

export function CampaignDestination({
  destinationUrl,
  landingPages,
  onSave,
}: {
  destinationUrl: string | null
  landingPages: LandingPage[]
  onSave: (destinationUrl: string) => void
}) {
  const matched = landingPages.find((page) => page.hostedUrl === destinationUrl)

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium tracking-wide uppercase">Destination</h2>
      <label className="flex flex-col gap-1 max-w-xl">
        <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          Landing page
        </span>
        <select
          aria-label="Landing page"
          defaultValue={matched?.id ?? ''}
          onChange={(e) => {
            const page = landingPages.find((item) => item.id === e.target.value)
            onSave(page?.hostedUrl ?? '')
          }}
          className={ghost}
        >
          <option value="">None</option>
          {landingPages.map((page) => (
            <option key={page.id} value={page.id}>
              {page.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 max-w-xl">
        <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          Destination URL
        </span>
        <input
          aria-label="Destination URL"
          type="url"
          defaultValue={destinationUrl ?? ''}
          onBlur={(e) => {
            const next = e.target.value.trim()
            if (next === (destinationUrl ?? '')) return
            onSave(next)
          }}
          placeholder="https://"
          className={ghost}
        />
      </label>
      {matched ? (
        <p className="text-xs text-muted-foreground">
          <Link to={`/landing-pages/${matched.id}`} className="underline underline-offset-4">
            {matched.name}
          </Link>
        </p>
      ) : null}
    </section>
  )
}
