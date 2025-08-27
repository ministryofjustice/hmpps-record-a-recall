import { Request } from 'express'
import logger from '../../logger'

interface SessionData {
  formData?: Record<string, unknown>
  formErrors?: Record<string, unknown>
  formValues?: Record<string, unknown>
  journeyHistory?: string[]
}

export default class SessionWrapper {
  constructor(private req: Request & { session: SessionData }) {}

  getFormData(): Record<string, unknown> {
    return this.req.session.formData || {}
  }

  setFormData(data: Record<string, unknown>): void {
    if (!this.req.session.formData) {
      this.req.session.formData = {}
    }
    this.req.session.formData = { ...this.req.session.formData, ...data }
  }

  updateFormData(field: string, value: unknown): void {
    if (!this.req.session.formData) {
      this.req.session.formData = {}
    }
    this.req.session.formData[field] = value
  }

  clearFormData(fields?: string[]): void {
    if (!fields) {
      this.req.session.formData = {}
    } else if (this.req.session.formData) {
      fields.forEach(field => {
        delete this.req.session.formData![field]
      })
    }
  }

  getErrors(): Record<string, unknown> {
    return this.req.session.formErrors || {}
  }

  setErrors(errors: Record<string, unknown>): void {
    this.req.session.formErrors = errors
  }

  clearErrors(): void {
    delete this.req.session.formErrors
  }

  getFormValues(): Record<string, unknown> {
    return this.req.session.formValues || {}
  }

  setFormValues(values: Record<string, unknown>): void {
    this.req.session.formValues = values
  }

  clearFormValues(): void {
    delete this.req.session.formValues
  }

  getJourneyHistory(): string[] {
    return this.req.session.journeyHistory || []
  }

  addToJourneyHistory(path: string): void {
    if (!this.req.session.journeyHistory) {
      this.req.session.journeyHistory = []
    }
    if (!this.req.session.journeyHistory.includes(path)) {
      this.req.session.journeyHistory.push(path)
    }
  }

  clearJourneyHistory(): void {
    this.req.session.journeyHistory = []
  }

  destroy(): void {
    this.req.session.destroy(err => {
      if (err) {
        logger.error('Error destroying session:', err)
      }
    })
  }
}
