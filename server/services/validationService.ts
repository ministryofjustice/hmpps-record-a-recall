import Joi, { CustomHelpers } from 'joi'
import type { DateForm } from 'forms'

export default class ValidationService {
  getDateFormSchema(dateType: string) {
    return Joi.object<DateForm>({
      day: Joi.string()
        .regex(/^\d{1,2}$/)
        .messages({
          'string.pattern.base': 'Day must be a valid number',
          'any.required': `The ${dateType} Date must be entered`,
          'string.empty': `The ${dateType} Date must be entered`,
        }),
      month: Joi.string()
        .regex(/^\d{1,2}$/)
        .messages({
          'string.pattern.base': 'Month must be a valid number',
          'any.required': `The ${dateType} Date must be entered`,
          'string.empty': `The ${dateType} Date must be entered`,
        }),
      year: Joi.string()
        .regex(/^\d{4}$/)
        .length(4)
        .messages({
          'string.length': 'Year must be 4 characters long',
          'string.pattern.base': 'Year must be a valid number',
          'any.required': `The ${dateType} Date must be entered`,
          'string.empty': `The ${dateType} Date must be entered`,
        }),
    })
      .custom((value: DateForm, helpers: CustomHelpers) => {
        const { day, month, year } = value
        const date = new Date(`${year}-${month}-${day}`)

        if (Number.isNaN(date.getTime())) {
          return helpers.error('date.custom')
        }

        const today = new Date()
        if (date > today) {
          return helpers.error('date.future', { dateType })
        }

        return value
      }, 'Date validation')
      .messages({
        'date.custom': 'The entered date is not a valid date',
        'date.future': `The ${dateType} Date cannot be in the future`,
      })
  }

  private commonDateFormValidation(recallDateForm: DateForm, dateName: string) {
    const schema = this.getDateFormSchema(dateName)
    const { error } = schema.validate(recallDateForm, { abortEarly: true })
    return error
  }

  validateRecallDateForm(recallDateForm: DateForm) {
    const error = this.commonDateFormValidation(recallDateForm, 'Recall')
    return error ? [{ text: error.details[0].message, href: '#recallDate' }] : []
  }

  validateReturnToCustodyDateForm(returnToCustodyDateForm: DateForm) {
    const error = this.commonDateFormValidation(returnToCustodyDateForm, 'Return to Custody')
    return error ? [{ text: error.details[0].message, href: '#returnToCustodyDate' }] : []
  }
}
