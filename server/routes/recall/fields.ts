import dateTodayOrInPast from '../../validators/dateTodayOrInPast'

const fields = {
  recallDate: {
    component: 'govukDateInput',
    validate: ['required', dateTodayOrInPast],
    id: 'recallDate',
    name: 'recallDate',
    fieldset: {
      legend: {
        text: 'Enter the date of revocation',
        classes: 'govuk-fieldset__legend--l',
      },
    },
    hint: {
      text: 'For example, 27 3 2007',
    },
    nameForErrors: 'Recall date',
  },
  inPrisonAtRecall: {
    component: 'govukRadios',
    validate: ['required'],
    id: 'inPrisonAtRecall',
    name: 'inPrisonAtRecall',
    fieldset: {
      legend: {
        text: 'Was this person in prison when the recall was made?',
        classes: 'govuk-fieldset__legend--l',
      },
    },
    nameForErrors: 'if they were in prison when the recall was made',
    items: [
      { text: 'Yes', value: 'true' },
      { text: 'No', value: 'false', conditional: 'returnToCustodyDate' },
    ],
  },
  returnToCustodyDate: {
    component: 'govukDateInput',
    validate: ['required', dateTodayOrInPast],
    id: 'returnToCustodyDate',
    name: 'returnToCustodyDate',
    fieldset: {
      legend: {
        text: 'Date they were arrested',
        classes: 'govuk-fieldset__legend--l',
      },
    },
    hint: {
      text: 'For example, 18 10 2007',
    },
    nameForErrors: 'Return to custody date',
  },
  recallType: {
    component: 'govukRadios',
    validate: ['required'],
    id: 'recallType',
    name: 'recallType',
    hint: {
      text: 'We’ve identified these types of recall based on this person’s sentences and offences.',
    },
    fieldset: {
      legend: {
        text: 'Select the type of recall',
        isPageHeading: true,
        classes: 'govuk-fieldset__legend--l',
      },
    },
    nameForErrors: 'Recall type',
    items: [{ text: 'set at runtime', value: '' }],
  },
}

export default fields
