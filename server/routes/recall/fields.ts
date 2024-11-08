import dateTodayOrInPast from '../../validators/dateTodayOrInPast'

const fields = {
  recallDate: {
    component: 'govukDateInput',
    validate: ['required', dateTodayOrInPast],
    id: 'recallDate',
    name: 'recallDate',
    label: {
      text: 'Enter the date the person’s licence was revoked',
    },
    fieldset: {
      legend: {
        text: 'Recall date',
        classes: 'govuk-fieldset__legend--m',
      },
    },
    nameForErrors: 'Recall date',
  },
  returnToCustodyDate: {
    component: 'govukDateInput',
    validate: ['required', dateTodayOrInPast],
    id: 'returnToCustodyDate',
    name: 'returnToCustodyDate',
    label: {
      text: 'Enter the date the person returned to custody',
    },
    fieldset: {
      legend: {
        text: 'Return to custody date',
        classes: 'govuk-fieldset__legend--m',
      },
    },
    nameForErrors: 'Return to custody date',
  },
  isFixedTermRecall: {
    component: 'govukRadios',
    validate: ['required'],
    id: 'isFixedTermRecall',
    name: 'isFixedTermRecall',
    label: {
      text: 'Is this a fixed-term recall?',
    },
    fieldset: {
      legend: {
        text: 'Is this a fixed-term recall?',
        classes: 'govuk-fieldset__legend--m',
      },
    },
    nameForErrors: 'Fixed term recall',
    items: [
      { text: 'Yes', value: 'true' },
      { text: 'No', value: 'false' },
    ],
  },
  recallType: {
    component: 'govukRadios',
    validate: ['required'],
    id: 'recallType',
    name: 'recallType',
    label: {
      text: 'What is the recall type?',
    },
    fieldset: {
      legend: {
        text: 'What is the recall type?',
        classes: 'govuk-fieldset__legend--m',
      },
    },
    nameForErrors: 'Recall type',
    items: [{ text: 'set at runtime', value: '' }],
  },
}

export default fields
