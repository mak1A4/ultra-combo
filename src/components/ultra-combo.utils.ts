/**
 * Access a nested property in an object using dot notation path
 * @example getByPath({ a: { b: 1 } }, 'a.b') // returns 1
 */
export function getByPath(obj: unknown, path: string): unknown {
  if (!path) return obj
  return path.split('.').reduce((o: unknown, k: string) => {
    if (o && typeof o === 'object') {
      return (o as Record<string, unknown>)[k]
    }
    return undefined
  }, obj)
}

/**
 * Format a template string by replacing {key} placeholders with values from data
 * Supports nested paths like {user.name}
 * @example formatTemplate('{name} ({email})', { name: 'John', email: 'john@example.com' })
 */
export function formatTemplate(template: string, data: Record<string, unknown>): string {
  return template.replace(/\{(\w+(?:\.\w+)*)\}/g, (_, key) => {
    const value = getByPath(data, key)
    return value !== undefined ? String(value) : ''
  })
}
