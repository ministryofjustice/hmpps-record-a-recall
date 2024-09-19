import Joi, { CustomHelpers } from 'joi'
import type { DateForm } from 'forms'
import type { Recall } from 'models'
import { getDateFromForm } from '../utils/utils'

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

  validateRecallDateForm(recallDateForm: DateForm, recall: Recall) {
    const error = this.commonDateFormValidation(recallDateForm, 'Recall')
    if (error) {
      return [{ text: error.details[0].message, href: '#recallDate' }]
    }

    const recallDate = getDateFromForm(recallDateForm)
    if (recall.returnToCustodyDate && recall.returnToCustodyDate < recallDate) {
      return [{ text: 'The Recall Date cannot be after the Return to Custody Date', href: '#recallDate' }]
    }

    return []
  }

  validateReturnToCustodyDateForm(returnToCustodyDateForm: DateForm, recall: Recall) {
    const error = this.commonDateFormValidation(returnToCustodyDateForm, 'Return to Custody')
    if (error) {
      return [{ text: error.details[0].message, href: '#returnToCustodyDate' }]
    }

    const returnToCustodyDate = getDateFromForm(returnToCustodyDateForm)
    if (recall.recallDate && returnToCustodyDate < recall.recallDate) {
      return [{ text: 'The Recall Date cannot be after the Return to Custody Date', href: '#returnToCustodyDate' }]
    }

    return []
  }

  validateFtrQuestion(isFixedTermRecall?: boolean) {
    if (isFixedTermRecall == null) {
      return [{ text: 'You must select whether the recall is a fixed term.', href: '#isFixedTermRecall' }]
    }
    return []
  }
}
