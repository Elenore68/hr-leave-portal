export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex items-center gap-3 text-secondary">
      <span
        className="h-6 w-6 animate-spin rounded-full border-2 border-lavender-deep border-t-primary"
        aria-hidden="true"
      />
      <span className="text-sm font-medium">{label}…</span>
    </div>
  )
}
