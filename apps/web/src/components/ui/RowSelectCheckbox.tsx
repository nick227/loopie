/** Checkbox for UniversalRow action slot — stops Link navigation when toggled. */
export function RowSelectCheckbox({
  checked,
  label,
  onToggle,
}: {
  checked: boolean
  label: string
  onToggle: () => void
}) {
  return (
    <input
      type="checkbox"
      checked={checked}
      aria-label={label}
      className="h-4 w-4 shrink-0 accent-primary"
      onClick={(event) => event.stopPropagation()}
      onChange={(event) => {
        event.stopPropagation()
        onToggle()
      }}
    />
  )
}
