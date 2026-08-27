export const GRAPH_VERSION = 'v21.0'
export const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`

export type GraphJson = Record<string, unknown>

export async function graphGet(path: string, token: string, query: Record<string, string> = {}) {
  const url = new URL(`${GRAPH_BASE}${path}`)
  if (token) url.searchParams.set('access_token', token)
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value)
  return graphFetch(url)
}

export async function graphPost(path: string, token: string, body: Record<string, string>) {
  const url = new URL(`${GRAPH_BASE}${path}`)
  url.searchParams.set('access_token', token)
  const params = new URLSearchParams(body)
  return graphFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })
}

async function graphFetch(url: URL, init?: RequestInit): Promise<GraphJson> {
  const res = await fetch(url, init)
  const json = (await res.json()) as GraphJson
  if (!res.ok || json.error) {
    const err = json.error as { message?: string } | undefined
    throw { statusCode: 502, message: err?.message ?? 'Meta Graph request failed' }
  }
  return json
}

export function requireId(json: GraphJson, label: string) {
  const id = json.id
  if (typeof id !== 'string' || !id)
    throw { statusCode: 502, message: `Meta ${label} did not return an id` }
  return id
}
