import { formatLongDate } from './formatDate'

describe('formatDate', () => {
  describe('when given a string date', () => {
    it('returns the formatted date', () => {
      expect(formatLongDate('2024-03-12T12:13:14')).toEqual('12 March 2024')
    })
  })

  describe('when given a Date date', () => {
    it('returns the formatted date', () => {
      expect(formatLongDate(new Date(2024, 11, 9))).toEqual('9 December 2024')
    })
  })

  describe('when given an invalid date string', () => {
    it('returns the passed in value', () => {
      expect(formatLongDate('an invalid date')).toEqual('an invalid date')
    })
  })

  describe('when given undefined', () => {
    it('returns ""', () => {
      expect(formatLongDate(undefined)).toEqual('')
    })
  })

  describe('when given null', () => {
    it('returns ""', () => {
      expect(formatLongDate(null)).toEqual('')
    })
  })
})
