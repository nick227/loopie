// Canonical predicate for "a Sale that should still count as live revenue." Every reporting
// rollup that sums/counts Sale rows (campaign performance, dashboard results, landing-page
// performance, message performance) must use this instead of writing its own `reversedAt: null`
// filter — found live: four separate services had independently reimplemented (or, more often,
// simply forgotten) this exact filter, so a refunded sale kept inflating revenue/sales counts
// everywhere except nowhere consistently. One predicate, spread into whatever `where` clause a
// given query already needs, so the rule can't drift out of sync across services again.
export const ACTIVE_SALE_WHERE = { reversedAt: null } as const
