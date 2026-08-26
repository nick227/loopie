export function MetricStrip({
  cells,
}: {
  cells: { label: string; value: string; hint?: string }[]
}) {
  return (
    <div className="flex flex-wrap gap-x-10 gap-y-4 border-y border-border py-5">
      {cells.map((cell) => (
        <div key={cell.label} className="min-w-[4.5rem]">
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            {cell.label}
          </p>
          <p className="text-2xl font-medium tabular-nums tracking-tight leading-none mt-1">
            {cell.value}
          </p>
          {cell.hint ? <p className="text-[11px] text-muted-foreground mt-1">{cell.hint}</p> : null}
        </div>
      ))}
    </div>
  )
}
