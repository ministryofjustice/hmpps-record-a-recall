import { DateTime } from 'luxon'
import { revocationDateSchema } from './revocationDateSchema'

describe('revocationDateSchema', () => {
  it('should validate a valid revocation date', () => {
    const yesterday = DateTime.now().minus({ days: 1 })
    const result = revocationDateSchema.safeParse({
      'revocationDate-day': yesterday.day.toString(),
      'revocationDate-month': yesterday.month.toString(),
      'revocationDate-year': yesterday.year.toString(),
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toBeInstanceOf(Date)
    }
  })

  it('should accept today as a valid date', () => {
    const today = DateTime.now()
    const result = revocationDateSchema.safeParse({
      'revocationDate-day': today.day.toString(),
      'revocationDate-month': today.month.toString(),
      'revocationDate-year': today.year.toString(),
    })

    expect(result.success).toBe(true)
  })

  it('should reject future dates', () => {
    const tomorrow = DateTime.now().plus({ days: 1 })
    const result = revocationDateSchema.safeParse({
      'revocationDate-day': tomorrow.day.toString(),
      'revocationDate-month': tomorrow.month.toString(),
      'revocationDate-year': tomorrow.year.toString(),
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
