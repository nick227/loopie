// State continuity, same shape and reasoning as pagesNavState.ts/adsNavState.ts/inboxNavState.ts,
// scoped to the Contacts collection (docs/strategy/03-product-principles.md's Singleton/
// Collection/Entity grammar): Contacts -> Contact -> Back must restore the collection's exact
// scroll position, search text, and source filter. Module-scoped, not React state or
// sessionStorage — only needs to survive ContactsPage unmounting while the user is on a Contact
// entity within the same SPA session.
const state = {
  scrollY: 0,
  q: '',
  source: '',
}

export function getContactsScrollY() {
  return state.scrollY
}

export function setContactsScrollY(y: number) {
  state.scrollY = y
}

export function getContactsSearch() {
  return state.q
}

export function setContactsSearch(q: string) {
  state.q = q
}

export function getContactsSourceFilter() {
  return state.source
}

export function setContactsSourceFilter(source: string) {
  state.source = source
}
