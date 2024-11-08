import maxLength from '../../validators/maxLength'

const fields = {
  nomisId: {
    component: 'govukCharacterCount',
    validate: ['required', maxLength(8)],
    maxlength: 8,
    errorMessages: { required: 'Enter a NOMIS ID' },
    id: 'nomisId',
    name: 'nomisId',
    classes: 'govuk-!-width-three-quarters nomis-id-text-input',
    rows: 1,
    label: {
      text: 'NOMIS ID',
      classes: 'govuk-fieldset__legend--m govuk-!-display-none',
    },
    autocomplete: 'off',
  },
}

export default fields
