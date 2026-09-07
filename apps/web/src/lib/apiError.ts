/** SDK mutation hooks in this codebase throw either an ApiError/Error, or (several older hand-
 * written hooks) the raw `{ error: string }` body straight from the server's error handler — see
 * apps/server/src/plugins/errorHandler.ts. Extracts a human-readable message from either shape. */
export function apiErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message
  if (err && typeof err === 'object' && 'error' in err) {
    const value = (err as { error?: unknown }).error
    if (typeof value === 'string' && value) return value
  }
  return fallback
}
