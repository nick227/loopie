export async function jsonFetch(
  url: string,
  init: RequestInit & { errorLabel: string },
): Promise<Record<string, unknown>> {
  const res = await fetch(url, init)
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) {
    const message =
      (json.message as string | undefined) ??
      (json.error as string | undefined) ??
      `${init.errorLabel} ${res.status}`
    throw { statusCode: 502, message }
  }
  return json
}

export function formBody(fields: Record<string, string>) {
  return new URLSearchParams(fields).toString()
}
