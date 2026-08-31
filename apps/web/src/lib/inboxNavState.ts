// State continuity, narrowly scoped to the smallest useful loop (docs/strategy/03-product-
// principles.md's Navigation Model): Inbox -> entity -> Back must restore Inbox's exact scroll
// position and filter selection. Module-scoped, not React state or sessionStorage — this only
// needs to survive InboxSummaryPage/InboxFeed unmounting while the user is on an entity page
// within the same SPA session, not a hard reload.
type InboxFilter = 'all' | 'unread'

const state = {
  scrollY: 0,
  filter: 'all' as InboxFilter,
}

export function getInboxScrollY() {
  return state.scrollY
}

export function setInboxScrollY(y: number) {
  state.scrollY = y
}

export function getInboxFilter(): InboxFilter {
  return state.filter
}

export function setInboxFilter(filter: InboxFilter) {
  state.filter = filter
}
