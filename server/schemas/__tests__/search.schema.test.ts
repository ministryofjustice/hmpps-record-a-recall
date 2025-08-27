import { searchSchema } from '../search.schema'

describe('searchSchema', () => {
  describe('validation', () => {
    it('should validate a valid NOMIS ID', () => {
      const result = searchSchema.safeParse({ nomisId: 'A1234BC' })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.nomisId).toBe('A1234BC')
      }
    })

    it('should reject an empty NOMIS ID', () => {
      const result = searchSchema.safeParse({ nomisId: '' })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.nomisId).toContain('Enter a NOMIS ID')
      }
    })

    it('should reject a NOMIS ID longer than 7 characters', () => {
      const result = searchSchema.safeParse({ nomisId: 'A1234BCD' })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.nomisId).toContain('NOMIS ID must be 7 characters or less')
      }
    })

    it('should reject missing NOMIS ID field', () => {
      const result = searchSchema.safeParse({})
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.nomisId).toBeDefined()
      }
    })
  })

  describe('transformations', () => {
    it('should trim whitespace from NOMIS ID', () => {
      const result = searchSchema.safeParse({ nomisId: '  A123BC  ' })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.nomisId).toBe('A123BC')
      }
    })

    it('should convert NOMIS ID to uppercase', () => {
      const result = searchSchema.safeParse({ nomisId: 'a123bc' })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.nomisId).toBe('A123BC')
      }
    })

    it('should apply both trim and uppercase transformations', () => {
      const result = searchSchema.safeParse({ nomisId: '  a123bc  ' })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.nomisId).toBe('A123BC')
      }
    })
  })

  describe('edge cases', () => {
    it('should accept exactly 7 characters', () => {
      const result = searchSchema.safeParse({ nomisId: '1234567' })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.nomisId).toBe('1234567')
      }
    })

    it('should accept 1 character', () => {
      const result = searchSchema.safeParse({ nomisId: 'A' })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.nomisId).toBe('A')
      }
    })

    it('should handle mixed case and spaces', () => {
      const result = searchSchema.safeParse({ nomisId: ' AbC123 ' })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.nomisId).toBe('ABC123')
      }
    })
  })
})
