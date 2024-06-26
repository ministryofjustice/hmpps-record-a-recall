function trimItem(value: unknown): unknown {
  if (typeof value === 'string') {
    return value.trim()
  }
  if (Array.isArray(value)) {
    return value.map(trimItem)
  }
  if (value && typeof value === 'object') {
    return trimForm(value as Record<string, unknown>)
  }
  return value
}

export default function trimForm<T>(form: Record<string, unknown>): T {
  return Object.entries(form).reduce((acc, [key, value]) => {
    acc[key as keyof T] = trimItem(value) as T[keyof T]
    return acc
  }, {} as T)
}
