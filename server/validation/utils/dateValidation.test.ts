import { addDays, subDays, format } from 'date-fns'
import { parseDateParts, datePartsSchema, dateStringSchema } from './dateValidation'

describe('dateValidation', () => {
  describe('parseDateParts', () => {
    it('should parse valid date parts', () => {
      const result = parseDateParts('15', '3', '2024')
      expect(result).toBeInstanceOf(Date)
      expect(result?.getDate()).toBe(15)
      expect(result?.getMonth()).toBe(2) // March (0-indexed)
      expect(result?.getFullYear()).toBe(2024)
    })

    it('should return null for missing parts', () => {
      expect(parseDateParts('', '3', '2024')).toBeNull()
      expect(parseDateParts('15', '', '2024')).toBeNull()
      expect(parseDateParts('15', '3', '')).toBeNull()
      expect(parseDateParts(undefined, undefined, undefined)).toBeNull()
    })

    it('should return null for invalid dates', () => {
      expect(parseDateParts('32', '1', '2024')).toBeNull() // Invalid day
      expect(parseDateParts('15', '13', '2024')).toBeNull() // Invalid month
      expect(parseDateParts('29', '2', '2023')).toBeNull() // Invalid leap year date
    })
  })

  describe('datePartsSchema', () => {
    const schema = datePartsSchema('testDate', { required: true })

    it('should validate complete date parts', () => {
      const result = schema.safeParse({
        'testDate-day': '15',
        'testDate-month': '3',
        'testDate-year': '2024',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBeInstanceOf(Date)
      }
    })

    it('should fail for missing day', () => {
      const result = schema.safeParse({
        'testDate-day': '',
        'testDate-month': '3',
        'testDate-year': '2024',
      })
      expect(result.success).toBe(false)
    })

    it('should fail for missing month', () => {
      const result = schema.safeParse({
        'testDate-day': '15',
        'testDate-month': '',
        'testDate-year': '2024',
      })
      expect(result.success).toBe(false)
    })

    it('should fail for missing year', () => {
      const result = schema.safeParse({
        'testDate-day': '15',
        'testDate-month': '3',
        'testDate-year': '',
      })
      expect(result.success).toBe(false)
    })

    it('should validate todayOrInPast constraint', () => {
      const pastSchema = datePartsSchema('testDate', { required: true, todayOrInPast: true })

      const tomorrow = addDays(new Date(), 1)
      const futureResult = pastSchema.safeParse({
        'testDate-day': tomorrow.getDate().toString(),
        'testDate-month': (tomorrow.getMonth() + 1).toString(),
        'testDate-year': tomorrow.getFullYear().toString(),
      })
      expect(futureResult.success).toBe(false)

      const yesterday = subDays(new Date(), 1)
      const pastResult = pastSchema.safeParse({
        'testDate-day': yesterday.getDate().toString(),
        'testDate-month': (yesterday.getMonth() + 1).toString(),
        'testDate-year': yesterday.getFullYear().toString(),
      })
      expect(pastResult.success).toBe(true)
    })

    it('should handle optional dates when not required', () => {
      const optionalSchema = datePartsSchema('testDate', { required: false })
      const result = optionalSchema.safeParse({
        'testDate-day': '',
        'testDate-month': '',
        'testDate-year': '',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBeNull()
      }
    })
  })

  describe('dateStringSchema', () => {
    const schema = dateStringSchema('testDate', { required: true })

    it('should validate ISO date strings', () => {
      const result = schema.safeParse('2024-03-15')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBeInstanceOf(Date)
      }
    })

    it('should fail for invalid date strings', () => {
      const result = schema.safeParse('not-a-date')
      expect(result.success).toBe(false)
    })

    it('should validate todayOrInPast constraint', () => {
      const pastSchema = dateStringSchema('testDate', { required: true, todayOrInPast: true })

      const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd')
      const futureResult = pastSchema.safeParse(tomorrow)
      expect(futureResult.success).toBe(false)

      const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')
      const pastResult = pastSchema.safeParse(yesterday)
      expect(pastResult.success).toBe(true)
    })
  })
})
