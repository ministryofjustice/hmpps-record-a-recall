import { Request } from 'express'
import { FieldEntry } from '../../types/field.types'

export default function renderConditionalFields(
  req: Request,
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

          if (!conditionalField || !req.services?.feComponentsService) {
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
