/**
 * Base controller for Express-based form handling
 * Replaces HMPO FormWizard base controller functionality
 *
 * NOTE: Contains intentional 'any' types for backward compatibility
 * during migration from HMPO to Express + Zod
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-param-reassign */

import { Request, Response, NextFunction } from 'express'
import { flattenConditionalFields, reduceDependentFields, renderConditionalFields } from '../../helpers/field'
import validateDateInput from '../../helpers/field/validateDateInput'
import type { Field, Fields, FieldEntry } from '../../types/field.types'

export interface FormOptions {
  fields: Fields
  allFields?: Fields
}

export interface FormValues {
  [key: string]: any
}

export interface FormError {
  key: string
  type: string
  args?: any
  text?: string
  href?: string
}

export interface ExtendedRequest extends Request {
  form?: {
    values: FormValues
    errors?: Record<string, any>
    options?: FormOptions
  }
}

export default class ExpressBaseController {
  protected middlewares: Array<(req: ExtendedRequest, res: Response, next: NextFunction) => void> = []

  constructor(options?: any) {
    // Accept options for compatibility with tests but don't use them
    this.middlewareSetup()
  }

  protected middlewareSetup() {
    this.use(this.setupConditionalFields.bind(this))
  }

  protected use(middleware: (req: ExtendedRequest, res: Response, next: NextFunction) => void) {
    this.middlewares.push(middleware)
  }

  public getMiddlewares(): Array<(req: ExtendedRequest, res: Response, next: NextFunction) => void> {
    return this.middlewares
  }

  protected getInitialValues(_req: ExtendedRequest, _res: Response): FormValues {
    return {}
  }

  protected getValues(req: ExtendedRequest, res: Response): FormValues {
    const sessionValues = req.session?.formData || {}
    const initialValues = this.getInitialValues(req, res)
    const formValues = { ...sessionValues }

    Object.keys(initialValues).forEach(fieldName => {
      if (formValues[fieldName] === undefined) {
        formValues[fieldName] = initialValues[fieldName]
      }
    })

    return formValues
  }

  protected valueOrFieldName(arg: number | { field: string }, fields: Fields) {
    return typeof arg === 'number' ? arg : `the ${fields[arg?.field]?.label?.text?.toLowerCase()}`
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

  protected renderConditionalFields(req: ExtendedRequest, res: Response) {
    if (!req.form?.options) return

    const { options } = req.form

    options.fields = Object.fromEntries(
      Object.entries(options.fields).map(([key, field]: FieldEntry, _, obj: FieldEntry[]) =>
        renderConditionalFields(req as any, [key, field], obj),
      ),
    )
    res.locals.fields = options.fields
  }

  protected setupConditionalFields(req: ExtendedRequest, res: Response, next: NextFunction) {
    if (!req.form?.options) {
      next()
      return
    }

    const { options } = req.form

    const stepFieldsArray = Object.entries(options.fields)
    const stepFields = stepFieldsArray.map(flattenConditionalFields)
    const dependentFields = stepFieldsArray.reduce(reduceDependentFields(options.allFields || {}), {})

    options.fields = {
      ...Object.fromEntries(stepFields),
      ...dependentFields,
    }

    next()
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

  protected setupFields(
    req: ExtendedRequest,
    originalFields: Fields,
    values: FormValues,
    errorlist: FormError[],
  ): Fields {
    const fields = { ...originalFields }

    Object.keys(fields).forEach(fieldName => {
      const value = values[fieldName]
      fields[fieldName].value = value?.value || value
    })

    return this.setupDateInputFields(fields, errorlist)
  }

  protected populateDateInputFieldValues(req: ExtendedRequest, fields: Fields): void {
    Object.values(fields)
      .filter((field: Field) => field.component === 'govukDateInput')
      .map((field: Field) => field.id)
      .forEach(id => {
        const day = req.body[`${id}-day`]
        const month = req.body[`${id}-month`]
        const year = req.body[`${id}-year`]
        if (!day && !month && !year) {
          return
        }

        if (req.form) {
          req.form.values[id] = [
            year,
            month !== '' ? month.toString().padStart(2, '0') : '',
            day !== '' ? day.toString().padStart(2, '0') : '',
          ].join('-')
        }
      })
  }

  protected validateDateInputFields(req: ExtendedRequest, fields: Fields): Record<string, FormError> {
    const validationErrors: Record<string, FormError> = {}
    const values = req.form?.values || {}

    Object.values(fields)
      .filter((field: Field) => field.component === 'govukDateInput')
      .forEach((field: Field) => {
        const { id } = field
        if (id && values[id]) {
          const day = req.body[`${id}-day`]
          const month = req.body[`${id}-month`]
          const year = req.body[`${id}-year`]
          const error = validateDateInput(day, month, year, values[id] as string)
          if (error) {
            validationErrors[id] = {
              key: id,
              type: error,
            }
          }
        }
      })

    return validationErrors
  }

  public locals(req: ExtendedRequest, res: Response): Record<string, any> {
    const options = res.locals.options || {}
    const values = res.locals.values || this.getValues(req, res)
    const errorlist = res.locals.errorlist || []

    if (!options.fields) {
      return {}
    }

    const { allFields = {} } = options
    const fields = this.setupFields(req, options.fields, values, errorlist)

    const validationErrors: { text: string; href: string }[] = []

    errorlist.forEach((error: FormError) => {
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

  public render(req: ExtendedRequest, res: Response, next: NextFunction) {
    this.renderConditionalFields(req, res)

    const locals = this.locals(req, res)
    Object.assign(res.locals, locals)

    next()
  }

  protected validateFields(req: ExtendedRequest, res: Response): Record<string, FormError> {
    const fields = req.form?.options?.fields || {}
    this.populateDateInputFieldValues(req, fields)

    return this.validateDateInputFields(req, fields)
  }
}

// Re-export types for backward compatibility
export type { Field, Fields, FieldEntry } from '../../types/field.types'
