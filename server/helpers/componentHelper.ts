import { SummaryListRow } from '../@types/govuk'

export default function toSummaryListRow(
  labelText: string,
  formValue: string | string[] | undefined,
  actionHref?: string,
  actionText = 'change',
): SummaryListRow {
  const value = formValue && (typeof formValue === 'string' ? { text: formValue } : { html: formValue?.join('<br>') })
  if (!value) {
    return undefined
  }
  if (actionHref) {
    return {
      key: {
        text: labelText,
      },
      value,
      actions: {
        items: [
          {
            href: actionHref,
            text: actionText,
            classes: 'govuk-link--no-visited-state',
          },
        ],
      },
    }
  }

  return {
    key: {
      text: labelText,
    },
    value,
  }
}
