import { checkSentencesSchema } from '../../recall/check-sentences.schema'

describe('checkSentencesSchema', () => {
  describe('validation', () => {
    it('should accept empty object as this is a display-only page', () => {
      const result = checkSentencesSchema.safeParse({})
      expect(result.success).toBe(true)
      expect(result.data).toEqual({})
    })

    it('should reject additional properties due to strict mode', () => {
      const result = checkSentencesSchema.safeParse({
        unexpectedField: 'value',
      })
      expect(result.success).toBe(false)
    })

    it('should work with form submission without data', () => {
      // Simulating a form submission with empty body
      const formData = {}
      const result = checkSentencesSchema.safeParse(formData)
      expect(result.success).toBe(true)
    })
  })

  describe('type inference', () => {
    it('should infer correct TypeScript type', () => {
      // Using Record to represent empty object without lint warning
      type CheckSentencesData = Record<string, never>

      const validData: CheckSentencesData = {}
      const result = checkSentencesSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })
})
