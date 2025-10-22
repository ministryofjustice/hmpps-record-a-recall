import { addDays, subDays } from 'date-fns'
import { revocationDateSchema } from './revocationDateSchema'

describe('revocationDateSchema', () => {
  it('should validate a valid revocation date', () => {
    const yesterday = subDays(new Date(), 1)
    const result = revocationDateSchema.safeParse({
      'revocationDate-day': yesterday.getDate().toString(),
      'revocationDate-month': (yesterday.getMonth() + 1).toString(),
      'revocationDate-year': yesterday.getFullYear().toString(),
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.revocationDate).toBeInstanceOf(Date)
    }
  })

  it('should accept today as a valid date', () => {
    const today = new Date()
    const result = revocationDateSchema.safeParse({
      'revocationDate-day': today.getDate().toString(),
      'revocationDate-month': (today.getMonth() + 1).toString(),
      'revocationDate-year': today.getFullYear().toString(),
    })

    expect(result.success).toBe(true)
  })

  it('should reject future dates', () => {
    const tomorrow = addDays(new Date(), 1)
    const result = revocationDateSchema.safeParse({
      'revocationDate-day': tomorrow.getDate().toString(),
      'revocationDate-month': (tomorrow.getMonth() + 1).toString(),
      'revocationDate-year': tomorrow.getFullYear().toString(),
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('must be today or in the past')
    }
  })

  it('should require all date parts', () => {
    const result = revocationDateSchema.safeParse({
      'revocationDate-day': '15',
      'revocationDate-month': '',
      'revocationDate-year': '2024',
    })

    expect(result.success).toBe(false)
  })

  it('should reject invalid dates', () => {
    const result = revocationDateSchema.safeParse({
      'revocationDate-day': '32',
      'revocationDate-month': '1',
      'revocationDate-year': '2024',
    })

    expect(result.success).toBe(false)
  })

  it('should reject completely empty date', () => {
    const result = revocationDateSchema.safeParse({
      'revocationDate-day': '',
      'revocationDate-month': '',
      'revocationDate-year': '',
    })

    expect(result.success).toBe(false)
  })
})
