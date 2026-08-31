export type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue }

function assertPlainObject(value: object): asserts value is Record<string, unknown> {
  const prototype = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError('Canonical JSON accepts only plain objects')
  }
}

function serialize(value: unknown, ancestors: Set<object>): string {
  if (value === null) return 'null'

  switch (typeof value) {
    case 'string':
    case 'boolean':
      return JSON.stringify(value)
    case 'number':
      if (!Number.isFinite(value)) throw new TypeError('Canonical JSON rejects non-finite numbers')
      return JSON.stringify(Object.is(value, -0) ? 0 : value)
    case 'object': {
      if (ancestors.has(value)) throw new TypeError('Canonical JSON rejects cyclic values')
      assertPlainObjectOrArray(value)
      ancestors.add(value)
      try {
        if (Array.isArray(value)) {
          return `[${value.map((item) => serialize(item, ancestors)).join(',')}]`
        }

        const entries = Object.keys(value)
          .sort()
          .map((key) => `${JSON.stringify(key)}:${serialize(value[key], ancestors)}`)
        return `{${entries.join(',')}}`
      } finally {
        ancestors.delete(value)
      }
    }
    default:
      throw new TypeError(`Canonical JSON rejects ${typeof value} values`)
  }
}

function assertPlainObjectOrArray(
  value: object,
): asserts value is Record<string, unknown> | unknown[] {
  if (!Array.isArray(value)) assertPlainObject(value)
}

/**
 * LOOPIE Canonical JSON v1.
 *
 * Object keys are sorted lexicographically, array order is retained, negative zero is normalized
 * to zero, and values outside JSON's data model are rejected instead of silently omitted.
 */
export function canonicalJson(value: JsonValue): string {
  return serialize(value, new Set())
}
