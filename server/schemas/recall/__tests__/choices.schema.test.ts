import { recallTypeSchema, confirmCancelSchema, activeSentenceChoiceSchema } from '../choices.schema'

describe('Choice Field Schemas', () => {
  describe('recallTypeSchema', () => {
    it('should accept valid recall type', () => {
      const result = recallTypeSchema.safeParse({
        recallType: 'standard',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.recallType).toBe('standard')
      }
    })

    it('should accept any non-empty string for recall type', () => {
      const result = recallTypeSchema.safeParse({
        recallType: 'emergency',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.recallType).toBe('emergency')
      }
    })

    it('should reject empty recall type', () => {
      const result = recallTypeSchema.safeParse({
        recallType: '',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Select the type of recall')
      }
    })

    it('should reject missing recall type', () => {
      const result = recallTypeSchema.safeParse({})
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid input: expected string, received undefined')
      }
    })
  })

  describe('confirmCancelSchema', () => {
    it('should accept true value', () => {
      const result = confirmCancelSchema.safeParse({
        confirmCancel: 'true',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.confirmCancel).toBe('true')
      }
    })

    it('should accept false value', () => {
      const result = confirmCancelSchema.safeParse({
        confirmCancel: 'false',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.confirmCancel).toBe('false')
      }
    })

    it('should reject invalid values', () => {
      const result = confirmCancelSchema.safeParse({
        confirmCancel: 'yes',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Select whether you want to cancel')
      }
    })

    it('should reject missing confirmCancel', () => {
      const result = confirmCancelSchema.safeParse({})
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Select whether you want to cancel')
      }
    })
  })

  describe('activeSentenceChoiceSchema', () => {
    it('should accept valid active sentence choice', () => {
      const result = activeSentenceChoiceSchema.safeParse({
        activeSentenceChoice: 'yes',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.activeSentenceChoice).toBe('yes')
      }
    })

    it('should accept any non-empty string', () => {
      const result = activeSentenceChoiceSchema.safeParse({
        activeSentenceChoice: 'no',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.activeSentenceChoice).toBe('no')
      }
    })

    it('should reject empty active sentence choice', () => {
      const result = activeSentenceChoiceSchema.safeParse({
        activeSentenceChoice: '',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Select whether this case had an active sentence')
      }
    })

    it('should reject missing active sentence choice', () => {
      const result = activeSentenceChoiceSchema.safeParse({})
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid input: expected string, received undefined')
      }
    })
  })
})
