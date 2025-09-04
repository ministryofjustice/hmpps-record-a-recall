/**
 * Initial form step controller
 * Provides compatibility layer between FormWizard and Express patterns
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { Response } from 'express'
import ExpressBaseController, { ExtendedRequest, Field, Fields, FormError } from './ExpressBaseController'
import validateDateInput from '../../helpers/field/validateDateInput'

export default class FormInitialStep extends ExpressBaseController {
  middlewareSetup() {
    super.middlewareSetup()
    this.use(this.setupConditionalFields.bind(this))
  }

  // Compatibility methods for FormWizard interface
  // Using 'any' intentionally for backward compatibility during migration
  getValues(req: any, res: any, callback?: (err: any, values?: any) => void): any {
    if (callback) {
      try {
        const values = super.getValues(req, res)
        callback(null, values)
      } catch (err) {
        callback(err)
      }
      return undefined
    }
    return super.getValues(req, res)
  }

  validateFields(req: any, res: any, callback?: (errors: any) => void): any {
    if (callback) {
      try {
        const errors = super.validateFields?.(req, res) || {}
        callback(errors)
      } catch (err) {
        callback(err)
      }
      return undefined
    }
    return super.validateFields?.(req, res) || {}
  }

  successHandler(req: any, res: any, callback?: (err?: any) => void) {
    if (callback) {
      callback()
    }
  }

  saveValues(req: any, res: any, callback?: (err?: any) => void) {
    if (callback) {
      callback()
    }
  }

  get(req: any, res: any, next?: any) {
    next?.()
  }

  post(req: any, res: any, next?: any) {
    next?.()
  }

  configure(req: any, res: any, next?: any) {
    next?.()
  }

  use(middleware: any) {
    super.use(middleware)
  }

  protected getErrorDetail(error: FormError, fields: Fields): { text: string; href: string } {
    const field = fields[error.key]
    const fieldName: string = field?.nameForErrors || field?.label?.text
    const errorMessageOverrides = field?.errorMessages || {}

    const errorMessages: Record<string, string> = {
      alphanumeric: `${fieldName} must not contain special characters`,
      dateTodayOrInPast: `${fieldName} must be today or in the past`,
      dateInvalid: `${fieldName} must be a real date`,
      dateInvalidDay: `${fieldName} must be a real date`,
      dateInvalidMonth: `${fieldName} must be a real date`,
      dateInvalidYear: `${fieldName} must be a real date`,
      dateMissingDay: `${fieldName} must include a day`,
      dateMissingDayAndMonth: `${fieldName} must include a day and month`,
      dateMissingDayAndYear: `${fieldName} must include a day and year`,
      dateMissingMonth: `${fieldName} must include a month`,
      dateMissingMonthAndYear: `${fieldName} must include a month and year`,
      dateMissingYear: `${fieldName} must include a year`,
      lessThanOrEqualTo: `${fieldName} cannot be more than ${this.valueOrFieldName(error.args?.lessThanOrEqualTo, fields)}`,
      maxLength: `${fieldName} must be ${error.args?.maxLength} characters or less`,
      minLength: `${fieldName} must be at least ${error.args?.minLength} characters`,
      numericString: `${fieldName} must only include numbers`,
      numeric: `${fieldName} must be a number`,
      required: `Enter a ${fieldName?.toLowerCase()}`,
      selectRequired: `Select ${fieldName?.toLowerCase()}`,
      mustBeEqualOrAfterRevDate: `${fieldName} must be equal to or after the revocation date`,
      mustBeAfterEarliestSentenceDate: `${fieldName} must be after the earliest sentence start date`,
      prisonerDetailsNotFound: `Prisoner details could not be found for the provided NOMIS ID`,
      conflictingAdjustment: `There is a conflicting adjustment for these dates`,
      cannotBeWithinAdjustmentPeriod: `${fieldName} must be outside existing adjustment window`,
      multipleConflictingAdjustment: `There are multiple existing adjustments for the dates provided`,
      revocationDateOverlapsFixedTermRecall: `${fieldName} falls within the Fixed Term Recall period of an existing recall`,
      revocationDateOnOrBeforeExistingRecall: `${fieldName} cannot be on or before the revocation date of an existing recall`,
    }

    const errorMessage = errorMessageOverrides[error.type] || errorMessages[error.type] || `${fieldName} is invalid`
    return {
      text: errorMessage,
      href: `#${field?.id}`,
    }
  }

  public locals(req: ExtendedRequest, res: Response): Record<string, any> {
    const { options, values } = res.locals
    if (!options?.fields) {
      return {}
    }

    const { allFields } = options
    const fields = this.setupFields(req, options.fields, values, res.locals.errorlist)

    const validationErrors: { text: string; href: string }[] = []

    res.locals.errorlist.forEach((error: FormError) => {
      const errorDetail = this.getErrorDetail(error, fields)
      validationErrors.push(errorDetail)
      const field = fields[error.key]
      if (field) {
        fields[error.key].errorMessage = errorDetail
      }
    })

    return {
      fields,
      validationErrors,
    }
  }

  protected formError(fieldName: string, type: string): FormError {
    return {
      key: fieldName,
      type,
    }
  }

  protected setupDateInputFields(fields: Fields, errorlist: FormError[]): Fields {
    Object.values(fields)
      .filter(field => field.component === 'govukDateInput')
      .forEach(field => {
        const { value } = field
        const error = errorlist.find(e => e.key === field.id)
        let errorFields = error?.type?.match(/(Day|Month|Year)/g)?.slice()
        if (!errorFields) {
          errorFields = ['*']
        }
        const [year, month, day] = value ? (value as string).split('-') : []

        // eslint-disable-next-line no-param-reassign
        field.items = [
          {
            classes: `govuk-input--width-2 ${error && ['*', 'Day'].filter(s => errorFields.includes(s)).length ? 'govuk-input--error' : ''}`,
            label: 'Day',
            id: `${field.id}-day`,
            name: `${field.id}-day`,
            value: day || '',
          },
          {
            classes: `govuk-input--width-2 ${error && ['*', 'Month'].filter(s => errorFields.includes(s)).length ? 'govuk-input--error' : ''}`,
            label: 'Month',
            id: `${field.id}-month`,
            name: `${field.id}-month`,
            value: month || '',
          },
          {
            classes: `govuk-input--width-4 ${error && ['*', 'Year'].filter(s => errorFields.includes(s)).length ? 'govuk-input--error' : ''}`,
            label: 'Year',
            id: `${field.id}-year`,
            name: `${field.id}-year`,
            value: year || '',
          },
        ]
      })

    return fields
  }

  protected populateDateInputFieldValues(req: ExtendedRequest) {
    Object.values(req.form.options.fields)
      .filter((field: Field) => field.component === 'govukDateInput')
      .map((field: Field) => field.id)
      .forEach(id => {
        const day = req.body[`${id}-day`]
        const month = req.body[`${id}-month`]
        const year = req.body[`${id}-year`]
        if (!day && !month && !year) {
          return
        }

        req.form.values[id] = [
          year,
          month !== '' ? month.toString().padStart(2, '0') : '',
          day !== '' ? day.toString().padStart(2, '0') : '',
        ].join('-')
      })
  }

  protected validateDateInputFields(req: ExtendedRequest, fields: Fields): Record<string, FormError> {
    const validationErrors: Record<string, FormError> = {}
    const values = req.form?.values || {}

    Object.values(fields)
      .filter((field: Field) => field.component === 'govukDateInput')
      .forEach((field: Field) => {
        const { id } = field
        if (values[id]) {
          const day = req.body[`${id}-day`]
          const month = req.body[`${id}-month`]
          const year = req.body[`${id}-year`]
          const error = validateDateInput(day, month, year, values[id] as string)
          if (error) {
            validationErrors[field.id as string] = {
              key: field.id as string,
              type: error,
            }
          }
        }
      })

    return validationErrors
  }
}
