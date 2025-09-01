import { Request } from 'express'
import { Field } from '../../controllers/base/ExpressBaseController'

export type FieldEntry = [string, Field]

export default function renderConditionalFields(
  req: Request | any,
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
      items: field.items.map((item: any) => {
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
