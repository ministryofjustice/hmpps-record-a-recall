import { format, addDays, subDays } from 'date-fns'
import { revocationDateSchema, rtcDateSchema } from '../dates.schema'

describe('Date Schemas', () => {
  describe('revocationDateSchema', () => {
    it('should accept valid past date', () => {
      const pastDate = format(subDays(new Date(), 10), 'yyyy-MM-dd')
      const result = revocationDateSchema.safeParse({
        revocationDate: pastDate,
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.revocationDate).toBe(pastDate)
      }
    })

    it('should accept today date', () => {
      const today = format(new Date(), 'yyyy-MM-dd')
      const result = revocationDateSchema.safeParse({
        revocationDate: today,
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.revocationDate).toBe(today)
      }
    })

    it('should reject future date', () => {
      const futureDate = format(addDays(new Date(), 1), 'yyyy-MM-dd')
      const result = revocationDateSchema.safeParse({
        revocationDate: futureDate,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Date must be today or in the past')
      }
    })

    it('should reject empty revocation date', () => {
      const result = revocationDateSchema.safeParse({
        revocationDate: '',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Enter the date of revocation')
      }
    })

    it('should reject invalid date format', () => {
      const result = revocationDateSchema.safeParse({
        revocationDate: '01/01/2024',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Date must be in YYYY-MM-DD format')
      }
    })

    it('should reject invalid date string', () => {
      const result = revocationDateSchema.safeParse({
        revocationDate: '2024-13-45',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Date must be today or in the past')
      }
    })
  })

  describe('rtcDateSchema', () => {
    it('should accept when in prison at recall is true without return date', () => {
      const result = rtcDateSchema.safeParse({
        inPrisonAtRecall: 'true',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.inPrisonAtRecall).toBe('true')
        expect(result.data.returnToCustodyDate).toBeUndefined()
      }
    })

    it('should accept when in prison at recall is true with return date', () => {
      const pastDate = format(subDays(new Date(), 5), 'yyyy-MM-dd')
      const result = rtcDateSchema.safeParse({
        inPrisonAtRecall: 'true',
        returnToCustodyDate: pastDate,
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.inPrisonAtRecall).toBe('true')
        expect(result.data.returnToCustodyDate).toBe(pastDate)
      }
    })

    it('should require return date when not in prison at recall', () => {
      const result = rtcDateSchema.safeParse({
        inPrisonAtRecall: 'false',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Enter the date they were arrested')
        expect(result.error.issues[0].path).toEqual(['returnToCustodyDate'])
      }
    })

    it('should accept valid return date when not in prison at recall', () => {
      const pastDate = format(subDays(new Date(), 3), 'yyyy-MM-dd')
      const result = rtcDateSchema.safeParse({
        inPrisonAtRecall: 'false',
        returnToCustodyDate: pastDate,
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.inPrisonAtRecall).toBe('false')
        expect(result.data.returnToCustodyDate).toBe(pastDate)
      }
    })

    it('should reject future return date when not in prison at recall', () => {
      const futureDate = format(addDays(new Date(), 1), 'yyyy-MM-dd')
      const result = rtcDateSchema.safeParse({
        inPrisonAtRecall: 'false',
        returnToCustodyDate: futureDate,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Enter the date they were arrested')
      }
    })

    it('should reject invalid return date format when not in prison at recall', () => {
      const result = rtcDateSchema.safeParse({
        inPrisonAtRecall: 'false',
        returnToCustodyDate: '01/01/2024',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Enter the date they were arrested')
      }
    })

    it('should accept today as return date when not in prison at recall', () => {
      const today = format(new Date(), 'yyyy-MM-dd')
      const result = rtcDateSchema.safeParse({
        inPrisonAtRecall: 'false',
        returnToCustodyDate: today,
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.returnToCustodyDate).toBe(today)
      }
    })
  })
})
