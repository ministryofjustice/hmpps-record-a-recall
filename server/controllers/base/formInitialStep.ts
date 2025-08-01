/* eslint-disable  @typescript-eslint/no-explicit-any */

import { NextFunction, Response } from 'express'
import FormWizard from 'hmpo-form-wizard'
import { flattenConditionalFields, reduceDependentFields, renderConditionalFields } from '../../helpers/field'
import validateDateInput from '../../helpers/field/validateDateInput'
import { FieldEntry } from '../../helpers/field/renderConditionalFields'

export default class FormInitialStep extends FormWizard.Controller {
  middlewareSetup() {
    super.middlewareSetup()
    this.use(this.setupConditionalFields)
  }

  getInitialValues(_req: FormWizard.Request, _res: Response): { [key: string]: any } {
    // Override in subclass to return initial values for form
    return {}
  }

  // @ts-nocheck
  getValues(req: FormWizard.Request, res: Response, callback: (err: any, values?: any) => void) {
    return super.getValues(req, res, (err, values) => {
      if (err) return callback(err)

      const initialValues = this.getInitialValues(req, res)
      // @ts-expect-error spread
      const formValues = { ...values }

      Object.keys(initialValues).forEach(fieldName => {
        if (formValues[fieldName] === undefined) {
          formValues[fieldName] = initialValues[fieldName]
        }
      })

      return callback(null, formValues)
    })
  }

  valueOrFieldName(arg: number | { field: string }, fields: Record<string, { label: { text: string } }>) {
    return typeof arg === 'number' ? arg : `the ${fields[arg?.field]?.label?.text?.toLowerCase()}`
  }

  getErrorDetail(error: { args: any; key: string; type: string }, res: Response): { text: string; href: string } {
    const { fields } = res.locals.options
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

  renderConditionalFields(req: FormWizard.Request, res: Response) {
    const { options } = req.form

    options.fields = Object.fromEntries(
      Object.entries(options.fields).map(([key, field]: FieldEntry, _, obj: FieldEntry[]) =>
        renderConditionalFields(req, [key, field], obj),
      ),
    )
    res.locals.fields = options.fields
  }

  setupConditionalFields(req: FormWizard.Request, res: Response, next: NextFunction) {
    const { options } = req.form

    const stepFieldsArray = Object.entries(options.fields)
    const stepFields = stepFieldsArray.map(flattenConditionalFields)
    const dependentFields = stepFieldsArray.reduce(reduceDependentFields(options.allFields), {})

    options.fields = {
      ...Object.fromEntries(stepFields),
      ...dependentFields,
    }

    next()
  }

  locals(req: FormWizard.Request, res: Response): Record<string, any> {
    const { options, values } = res.locals
    if (!options?.fields) {
      return {}
    }

    const { allFields } = options
    const fields = this.setupFields(req, allFields, options.fields, values, res.locals.errorlist)

    const validationErrors: { text: string; href: string }[] = []

    res.locals.errorlist.forEach((error: { args: any; key: string; type: string }) => {
      const errorDetail = this.getErrorDetail(error, res)
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

  formError(fieldName: string, type: string): FormWizard.Controller.Error {
    return new FormWizard.Controller.Error(fieldName, { args: {}, type, url: '/' })
  }

  setupDateInputFields(fields: FormWizard.Fields, errorlist: FormWizard.Controller.Error[]): FormWizard.Fields {
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

        // @ts-expect-error This is fine
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
        ] as unknown
      })

    return fields
  }

  setupFields(
    req: FormWizard.Request,
    allFields: { [field: string]: FormWizard.Field },
    originalFields: FormWizard.Fields,
    values: { [field: string]: any },
    errorlist: FormWizard.Controller.Error[],
  ): FormWizard.Fields {
    const fields = originalFields

    Object.keys(fields).forEach(fieldName => {
      const value = values[fieldName]
      fields[fieldName].value = value?.value || value
    })

    return this.setupDateInputFields(fields, errorlist)
  }

  render(req: FormWizard.Request, res: Response, next: NextFunction) {
    this.renderConditionalFields(req, res)

    return super.render(req, res, next)
  }

  populateDateInputFieldValues(req: FormWizard.Request) {
    Object.values(req.form.options.fields)
      .filter(field => field.component === 'govukDateInput')
      .map(field => field.id)
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

  validateDateInputFields(req: FormWizard.Request, validationErrors: any) {
    const { values } = req.form

    Object.values(req.form.options.fields)
      .filter(field => field.component === 'govukDateInput')
      .forEach(field => {
        const { id } = field
        if (values[id]) {
          const day = req.body[`${id}-day`]
          const month = req.body[`${id}-month`]
          const year = req.body[`${id}-year`]
          const error = validateDateInput(day, month, year, values[id] as string)
          if (error) {
            // eslint-disable-next-line no-param-reassign
            validationErrors[field.id] = this.formError(field.id, error)
          }
        }
      })
  }

  validateFields(req: FormWizard.Request, res: Response, callback: (errors: any) => void) {
    this.populateDateInputFieldValues(req)

    super.validateFields(req, res, errors => {
      const validationErrors: any = {}

      this.validateDateInputFields(req, validationErrors)

      callback({ ...errors, ...validationErrors })
    })
  }
}
