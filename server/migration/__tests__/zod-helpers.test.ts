import { z } from 'zod'
import { migrateFieldToZod, createFieldDependencies, formatZodErrors } from '../zod-helpers'

describe('zod-helpers', () => {
  describe('migrateFieldToZod', () => {
    it('should handle required validator', () => {
      const fieldConfig = {
        validate: 'required',
      }
      const schema = migrateFieldToZod(fieldConfig)
      const result = schema.safeParse('')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('This field is required')
      }
    })

    it('should handle email validator', () => {
      const fieldConfig = {
        validate: 'email',
      }
      const schema = migrateFieldToZod(fieldConfig)
      const result = schema.safeParse('invalid-email')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid email address')
      }
    })

    it('should handle minlength validator', () => {
      const fieldConfig = {
        validate: [{ type: 'minlength', arguments: [5] }],
      }
      const schema = migrateFieldToZod(fieldConfig)
      const result = schema.safeParse('ab')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Must be at least 5 characters')
      }
    })

    it('should handle maxlength validator', () => {
      const fieldConfig = {
        validate: [{ type: 'maxlength', arguments: [3] }],
      }
      const schema = migrateFieldToZod(fieldConfig)
      const result = schema.safeParse('abcd')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Must be at most 3 characters')
      }
    })

    it('should handle trim formatter', () => {
      const fieldConfig = {
        formatter: ['trim'],
      }
      const schema = migrateFieldToZod(fieldConfig)
      const result = schema.safeParse('  text  ')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('text')
      }
    })

    it('should handle singlespaces formatter', () => {
      const fieldConfig = {
        formatter: ['singlespaces'],
      }
      const schema = migrateFieldToZod(fieldConfig)
      const result = schema.safeParse('text   with    spaces')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('text with spaces')
      }
    })

    it('should handle uppercase formatter', () => {
      const fieldConfig = {
        formatter: ['uppercase'],
      }
      const schema = migrateFieldToZod(fieldConfig)
      const result = schema.safeParse('text')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('TEXT')
      }
    })

    it('should handle default values', () => {
      const fieldConfig = {
        default: 'default value',
      }
      const schema = migrateFieldToZod(fieldConfig)
      const result = schema.safeParse(undefined)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('default value')
      }
    })

    it('should combine formatters and validators', () => {
      const fieldConfig = {
        validate: ['required', { type: 'minlength', arguments: [3] }],
        formatter: ['trim', 'uppercase'],
      }
      const schema = migrateFieldToZod(fieldConfig)

      // Test validation failure - trimmed "ab" is only 2 characters
      const result = schema.safeParse('  ab  ')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Must be at least 3 characters')
      }

      // Test validation success with formatting
      const validResult = schema.safeParse('  abc  ')
      expect(validResult.success).toBe(true)
      if (validResult.success) {
        expect(validResult.data).toBe('ABC')
      }
    })
  })

  describe('createFieldDependencies', () => {
    it('should extract dependent fields', () => {
      const fields = {
        country: {
          validate: 'required',
        },
        state: {
          dependent: { field: 'country', value: 'US' },
        },
        province: {
          dependent: { field: 'country', value: 'CA' },
        },
      }

      const { dependencies } = createFieldDependencies(fields)

      expect(dependencies.country).toEqual(['state', 'province'])
    })

    it('should extract field invalidations', () => {
      const fields = {
        country: {
          invalidates: ['state', 'province'],
        },
        employmentStatus: {
          invalidates: ['employerName'],
        },
      }

      const { invalidations } = createFieldDependencies(fields)

      expect(invalidations.country).toEqual(['state', 'province'])
      expect(invalidations.employmentStatus).toEqual(['employerName'])
    })

    it('should handle fields with no dependencies', () => {
      const fields = {
        name: { validate: 'required' },
        email: { validate: 'email' },
      }

      const { dependencies, invalidations } = createFieldDependencies(fields)

      expect(dependencies).toEqual({})
      expect(invalidations).toEqual({})
    })
  })

  describe('formatZodErrors', () => {
    it('should format single field error', () => {
      const schema = z.object({
        name: z.string().min(1, 'Name is required'),
      })

      const result = schema.safeParse({ name: '' })

      if (!result.success) {
        const formatted = formatZodErrors(result.error)
        expect(formatted).toEqual({
          name: {
            type: 'validation',
            message: 'Name is required',
          },
        })
      }
    })

    it('should format multiple field errors', () => {
      const schema = z.object({
        name: z.string().min(1, 'Name is required'),
        email: z.string().email('Invalid email'),
      })

      const result = schema.safeParse({ name: '', email: 'invalid' })

      if (!result.success) {
        const formatted = formatZodErrors(result.error)
        expect(formatted).toHaveProperty('name')
        expect(formatted).toHaveProperty('email')
        expect(formatted.name.type).toBe('validation')
        expect(formatted.email.type).toBe('validation')
      }
    })

    it('should use first error message for multiple errors on same field', () => {
      const schema = z.object({
        password: z.string().min(8, 'Must be at least 8 characters').regex(/[A-Z]/, 'Must contain uppercase'),
      })

      const result = schema.safeParse({ password: 'short' })

      if (!result.success) {
        const formatted = formatZodErrors(result.error)
        expect(formatted.password.message).toBe('Must be at least 8 characters')
      }
    })
  })
})
