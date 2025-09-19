import { z } from 'zod'
import {
  formatFieldName,
  getFieldNameFromPath,
  formatErrorMessage,
  formatZodErrorsForView,
  mergeErrors,
  createFieldError,
  hasErrors,
  GovUkErrorSummaryItem,
} from './errorFormatting'

describe('errorFormatting', () => {
  describe('formatFieldName', () => {
    it('should convert camelCase to human-readable format', () => {
      expect(formatFieldName('firstName')).toBe('First name')
      expect(formatFieldName('dateOfBirth')).toBe('Date of birth')
      expect(formatFieldName('nomisId')).toBe('Nomis id')
    })

    it('should use custom field labels when provided', () => {
      const labels = { nomisId: 'NOMIS ID', dateOfBirth: 'Birth date' }
      expect(formatFieldName('nomisId', labels)).toBe('NOMIS ID')
      expect(formatFieldName('dateOfBirth', labels)).toBe('Birth date')
      expect(formatFieldName('firstName', labels)).toBe('First name')
    })
  })

  describe('getFieldNameFromPath', () => {
    it('should extract field name from simple path', () => {
      expect(getFieldNameFromPath(['firstName'])).toBe('firstName')
      expect(getFieldNameFromPath(['address', 'postcode'])).toBe('address.postcode')
    })

    it('should filter out array indices', () => {
      expect(getFieldNameFromPath(['items', 0, 'name'])).toBe('items.name')
      expect(getFieldNameFromPath(['users', 2, 'email'])).toBe('users.email')
    })
  })

  describe('formatErrorMessage', () => {
    it('should format required field error', () => {
      const issue = {
        code: 'invalid_type' as const,
        path: ['firstName'],
        message: 'Required',
        expected: 'string' as const,
        received: 'undefined' as const,
      }
      expect(formatErrorMessage(issue)).toBe('First name is invalid')
    })

    it('should use custom message when provided', () => {
      const issue = {
        code: 'custom' as const,
        path: ['email'],
        message: 'Please provide a valid email address',
      }
      expect(formatErrorMessage(issue)).toBe('Please provide a valid email address')
    })

    it('should format date validation errors', () => {
      const issue = {
        code: 'custom' as const,
        path: ['dateOfBirth'],
        params: { error: 'dateMissingDay' },
        message: '',
      }
      expect(formatErrorMessage(issue)).toBe('Date of birth must include a day')
    })
  })

  describe('formatZodErrorsForView', () => {
    it('should format Zod errors for GOV.UK templates', () => {
      const schema = z.object({
        firstName: z.string().min(1, 'Enter your first name'),
        age: z.number().min(18, 'You must be at least 18'),
      })

      const result = schema.safeParse({ firstName: '', age: 16 })
      expect(result.success).toBe(false)

      if (!result.success) {
        const formatted = formatZodErrorsForView(result.error)

        expect(formatted.errors).toHaveProperty('firstName')
        expect(formatted.errors.firstName.text).toBe('Enter your first name')

        expect(formatted.errors).toHaveProperty('age')
        expect(formatted.errors.age.text).toBe('You must be at least 18')

        expect(formatted.errorSummary).toHaveLength(2)
        expect(formatted.errorSummary[0]).toEqual({
          text: 'Enter your first name',
          href: '#firstName',
        })
        expect(formatted.errorSummary[1]).toEqual({
          text: 'You must be at least 18',
          href: '#age',
        })
      }
    })

    it('should only show first error per field', () => {
      const schema = z.object({
        email: z.string().min(1, 'Enter your email').email('Enter a valid email'),
      })

      const result = schema.safeParse({ email: '' })
      expect(result.success).toBe(false)

      if (!result.success) {
        const formatted = formatZodErrorsForView(result.error)

        expect(formatted.errors).toHaveProperty('email')
        expect(formatted.errorSummary).toHaveLength(1)
        expect(formatted.errorSummary[0].text).toBe('Enter your email')
      }
    })
  })

  describe('mergeErrors', () => {
    it('should merge two error objects', () => {
      const errors1 = {
        errors: { field1: { text: 'Error 1' } },
        errorSummary: [{ text: 'Error 1', href: '#field1' }],
      }

      const errors2 = {
        errors: { field2: { text: 'Error 2' } },
        errorSummary: [{ text: 'Error 2', href: '#field2' }],
      }

      const merged = mergeErrors(errors1, errors2)

      expect(merged.errors).toHaveProperty('field1')
      expect(merged.errors).toHaveProperty('field2')
      expect(merged.errorSummary).toHaveLength(2)
    })
  })

  describe('createFieldError', () => {
    it('should create a formatted error for a single field', () => {
      const error = createFieldError('username', 'Username is already taken')

      expect(error.errors).toHaveProperty('username')
      expect(error.errors.username.text).toBe('Username is already taken')
      expect(error.errorSummary).toHaveLength(1)
      expect(error.errorSummary[0]).toEqual({
        text: 'Username is already taken',
        href: '#username',
      })
    })
  })

  describe('hasErrors', () => {
    it('should return true when errors exist', () => {
      const errors = {
        errors: { field1: { text: 'Error' } },
        errorSummary: [{ text: 'Error', href: '#field1' }],
      }
      expect(hasErrors(errors)).toBe(true)
    })

    it('should return false when no errors', () => {
      const errors = {
        errors: {},
        errorSummary: [] as GovUkErrorSummaryItem[],
      }
      expect(hasErrors(errors)).toBe(false)
    })
  })
})
