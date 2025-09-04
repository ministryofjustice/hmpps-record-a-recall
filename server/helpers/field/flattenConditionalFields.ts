import { FieldEntry } from '../../types/field.types'

export default function flattenConditionalFields([key, field]: FieldEntry) {
  if (!field.items) {
    return [key, field]
  }

  const items = field.items.map((item: { conditional?: unknown }) => {
    if (!item.conditional) {
      return item
    }

    const conditionals = [item.conditional || []].flat()
    const conditionalKeys = conditionals.map(conditional => {
      if (conditional instanceof Object && typeof conditional === 'object' && 'name' in conditional) {
        return (conditional as { name: string }).name
      }

      return conditional
    })

    return { ...item, conditional: conditionalKeys }
  })

  return [key, { ...field, items }]
}
