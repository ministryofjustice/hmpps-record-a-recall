import { cloneDeep } from 'lodash'
import fields from '../fields'

const editFields = {
  ...cloneDeep(fields),

  revocationDate: {
    ...cloneDeep(fields.revocationDate),
    fieldset: {
      ...cloneDeep(fields.revocationDate.fieldset),
      legend: {
        ...cloneDeep(fields.revocationDate.fieldset.legend),
        text: 'Edit the date of revocation',
      },
    },
  },
  confirmCancel: {
    component: 'govukRadios',
    validate: ['required'],
    id: 'confirmCancel',
    name: 'confirmCancel',
    fieldset: {
      legend: {
        text: 'Are you sure you want to cancel editing the recall?',
        classes: 'govuk-fieldset__legend--l',
      },
    },
    nameForErrors: 'if you are sure you want to cancel editing the recall',
    items: [
      { text: 'Yes, cancel editing the recall', value: 'true' },
      { text: 'No, go back to the recall', value: 'false' },
    ],
  },
  recallType: {
    ...cloneDeep(fields.recallType),
    isFinalPage: true,
  },
}

const pageHeading = 'Edit a Recall'

export { editFields, pageHeading }
