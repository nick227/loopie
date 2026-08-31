// State continuity, same shape and reasoning as inboxNavState.ts, scoped to the Pages collection
// (docs/strategy/03-product-principles.md's Singleton/Collection/Entity grammar): Pages -> Page ->
// Back must restore the collection's exact scroll position, search text, and status filter.
// Module-scoped, not React state or sessionStorage — only needs to survive LandingPagesPage
// unmounting while the user is on a Page entity within the same SPA session, not a hard reload.
const state = {
  scrollY: 0,
  q: '',
  status: '',
}

export function getPagesScrollY() {
  return state.scrollY
}

export function setPagesScrollY(y: number) {
  state.scrollY = y
}

export function getPagesSearch() {
  return state.q
}

export function setPagesSearch(q: string) {
  state.q = q
}

export function getPagesStatusFilter() {
  return state.status
}

export function setPagesStatusFilter(status: string) {
  state.status = status
}
