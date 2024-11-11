import maxLength from '../../validators/maxLength'

const fields = {
  nomisId: {
    component: 'govukInput',
    validate: ['required', maxLength(7)],
    errorMessages: { required: 'Enter a NOMIS ID' },
    id: 'nomisId',
    name: 'nomisId',
    classes: 'govuk-!-width-three-quarters nomis-id-text-input',
    label: {
      text: 'NOMIS ID',
      classes: 'govuk-fieldset__legend--m govuk-!-display-none',
    },
    autocomplete: 'off',
  },
}

export default fields
