// State continuity, same shape and reasoning as pagesNavState.ts/inboxNavState.ts, scoped to the
// Advertising collection (docs/strategy/03-product-principles.md's Singleton/Collection/Entity
// grammar): Advertising -> Ad -> Back must restore the collection's exact scroll position, search
// text, and status filter. Module-scoped, not React state or sessionStorage — only needs to
// survive AdsPage unmounting while the user is on an Ad entity within the same SPA session.
const state = {
  scrollY: 0,
  q: '',
  status: '',
}

export function getAdsScrollY() {
  return state.scrollY
}

export function setAdsScrollY(y: number) {
  state.scrollY = y
}

export function getAdsSearch() {
  return state.q
}

export function setAdsSearch(q: string) {
  state.q = q
}

export function getAdsStatusFilter() {
  return state.status
}

export function setAdsStatusFilter(status: string) {
  state.status = status
}
