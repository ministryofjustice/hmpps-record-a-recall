import dateTodayOrInPast from '../../validators/dateTodayOrInPast'

const fields = {
  revocationDate: {
    component: 'govukDateInput',
    validate: ['required', dateTodayOrInPast],
    id: 'revocationDate',
    name: 'revocationDate',
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
    errorMessages: { required: 'Select whether the person was in prison when the recall was made' },
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
        classes: 'govuk-fieldset__legend--s',
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
  courtCases: {
    component: 'govukCheckboxes',
    validate: ['required'],
    multiple: true,
    id: 'courtCases',
    name: 'courtCases',
    hint: {
      text: 'Select all the court cases to recall the prisoner on',
    },
    fieldset: {
      legend: {
        text: 'Select court cases',
        isPageHeading: true,
        classes: 'govuk-fieldset__legend--l',
      },
    },
    nameForErrors: 'Court cases',
    // @ts-expect-error set at runtime
    items: [],
  },
  confirmCancel: {
    component: 'govukRadios',
    validate: ['required'],
    id: 'confirmCancel',
    name: 'confirmCancel',
    fieldset: {
      legend: {
        text: 'Are you sure you want to cancel recording a recall?',
        classes: 'govuk-fieldset__legend--l',
      },
    },
    nameForErrors: 'if you are sure you want to cancel recording a recall',
    items: [
      { text: 'Yes, cancel the recall', value: 'true' },
      { text: 'No, go back to the recall', value: 'false' },
    ],
  },
  sentenceType: {
    component: 'govukRadios',
    validate: ['required'],
    id: 'sentenceType',
    name: 'sentenceType',
    fieldset: {
      legend: {
        text: 'Select the sentence type',
        classes: 'govuk-visually-hidden',
      },
    },
    errorMessages: { required: 'Select a sentence type' },
    nameForErrors: 'Sentence type',
    // @ts-expect-error Items are set dynamically in the controller based on applicable sentence types
    items: [],
  },
}

export default fields
