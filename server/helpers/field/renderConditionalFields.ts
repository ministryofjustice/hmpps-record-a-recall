import { Request } from 'express'
import { Field, FieldEntry } from '../../types/field.types'

// Re-export FieldEntry for backward compatibility
export type { FieldEntry }

export default function renderConditionalFields(
  req: Request & { services?: { feComponentsService?: { getComponent: (component: string, field: Field) => string } } },
  [key, field]: FieldEntry,
  allFieldsEntries: FieldEntry[],
) {
  if (!field.items) {
    return [key, field]
  }

  const fields = Object.fromEntries(allFieldsEntries)

  return [
    key,
    {
      ...field,
      items: field.items.map((item: { conditional?: unknown }) => {
        const conditionalFields = [item.conditional || []].flat()
        const components = conditionalFields.map(conditionalFieldKey => {
          const conditionalField = field.prefix
            ? fields[`${field.prefix}[${conditionalFieldKey}]`]
            : fields[conditionalFieldKey as string]

          if (!conditionalField) {
            return undefined
          }

          return req.services.feComponentsService.getComponent(conditionalField.component, conditionalField)
        })

        if (!components.filter(i => i).length) {
          return item
        }

        return { ...item, conditional: { html: components.join('') } }
      }),
    },
  ]
}
