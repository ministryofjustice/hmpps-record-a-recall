import type { DateForm } from 'forms'
import ValidationService from './validationService'

describe('Validation service tests', () => {
  let validationService: ValidationService

  beforeEach(() => {
    validationService = new ValidationService()
  })

  describe('Recall date form tests', () => {
    it('should validate a correct recall date form', () => {
      const recallDateForm: DateForm = {
        day: '01',
        month: '02',
        year: '2023',
      }

      const errors = validationService.validateRecallDateForm(recallDateForm)

      expect(errors).toEqual([])
    })

    it('should return an error when the day is missing', () => {
      const recallDateForm: DateForm = {
        day: '',
        month: '02',
        year: '2023',
      }

      const errors = validationService.validateRecallDateForm(recallDateForm)

      expect(errors).toEqual([{ text: 'Day is required', href: '#recallDate' }])
    })

    it('should return an error when the month is missing', () => {
      const recallDateForm: DateForm = {
        day: '01',
        month: '',
        year: '2023',
      }

      const errors = validationService.validateRecallDateForm(recallDateForm)

      expect(errors).toEqual([{ text: 'Month is required', href: '#recallDate' }])
    })

    it('should return an error when the year is missing', () => {
      const recallDateForm: DateForm = {
        day: '01',
        month: '02',
        year: '',
      }

      const errors = validationService.validateRecallDateForm(recallDateForm)

      expect(errors).toEqual([{ text: 'Year is required', href: '#recallDate' }])
    })

    it('should return an error when the day is invalid', () => {
      const recallDateForm: DateForm = {
        day: '32',
        month: '02',
        year: '2023',
      }

      const errors = validationService.validateRecallDateForm(recallDateForm)

      expect(errors).toEqual([{ text: 'The entered date is not a valid date', href: '#recallDate' }])
    })

    it('should return an error when the month is invalid', () => {
      const recallDateForm: DateForm = {
        day: '01',
        month: '13',
        year: '2023',
      }

      const errors = validationService.validateRecallDateForm(recallDateForm)

      expect(errors).toEqual([{ text: 'The entered date is not a valid date', href: '#recallDate' }])
    })

    it('should return an error when the year is invalid', () => {
      const recallDateForm: DateForm = {
        day: '01',
        month: '02',
        year: 'abcd',
      }

      const errors = validationService.validateRecallDateForm(recallDateForm)

      expect(errors).toEqual([{ text: 'Year must be a valid number', href: '#recallDate' }])
    })

    it('should return an error when the date is in the future', () => {
      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() + 1)

      const recallDateForm: DateForm = {
        day: futureDate.getDate().toString().padStart(2, '0'),
        month: (futureDate.getMonth() + 1).toString().padStart(2, '0'),
        year: futureDate.getFullYear().toString(),
      }

      const errors = validationService.validateRecallDateForm(recallDateForm)

      expect(errors).toEqual([{ text: 'The recall date cannot be in the future', href: '#recallDate' }])
    })
  })
})
