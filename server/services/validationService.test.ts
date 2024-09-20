import type { DateForm } from 'forms'
import type { Recall } from 'models'
import ValidationService from './validationService'
import { formatDateForDisplay } from '../utils/utils'
import { SentenceDetail } from '../@types/refData'

describe('Validation service tests', () => {
  let validationService: ValidationService

  beforeEach(() => {
    validationService = new ValidationService()
  })

  describe('Common date form tests', () => {
    it('should validate a correct recall date form', () => {
      const recallDateForm: DateForm = {
        day: '01',
        month: '02',
        year: '2023',
      }

      const errors = validationService.validateRecallDateForm(recallDateForm, {} as Recall)

      expect(errors).toEqual([])
    })

    it('should return an error when the all date fields are missing', () => {
      const recallDateForm: DateForm = {
        day: '',
        month: '',
        year: '',
      }

      const errors = validationService.validateReturnToCustodyDateForm(recallDateForm, {} as Recall)

      expect(errors).toEqual([{ text: 'The Return to Custody Date must be entered', href: '#returnToCustodyDate' }])
    })

    it('should return an error when the day is missing', () => {
      const recallDateForm: DateForm = {
        day: '',
        month: '02',
        year: '2023',
      }

      const errors = validationService.validateRecallDateForm(recallDateForm, {} as Recall)

      expect(errors).toEqual([{ text: 'The Recall Date must be entered', href: '#recallDate' }])
    })

    it('should return an error when the month is missing', () => {
      const recallDateForm: DateForm = {
        day: '01',
        month: '',
        year: '2023',
      }

      const errors = validationService.validateRecallDateForm(recallDateForm, {} as Recall)

      expect(errors).toEqual([{ text: 'The Recall Date must be entered', href: '#recallDate' }])
    })

    it('should return an error when the year is missing', () => {
      const recallDateForm: DateForm = {
        day: '01',
        month: '02',
        year: '',
      }

      const errors = validationService.validateRecallDateForm(recallDateForm, {} as Recall)

      expect(errors).toEqual([{ text: 'The Recall Date must be entered', href: '#recallDate' }])
    })

    it('should return an error when the day is invalid', () => {
      const recallDateForm: DateForm = {
        day: '32',
        month: '02',
        year: '2023',
      }

      const errors = validationService.validateRecallDateForm(recallDateForm, {} as Recall)

      expect(errors).toEqual([{ text: 'The entered date is not a valid date', href: '#recallDate' }])
    })

    it('should return an error when the month is invalid', () => {
      const recallDateForm: DateForm = {
        day: '01',
        month: '13',
        year: '2023',
      }

      const errors = validationService.validateRecallDateForm(recallDateForm, {} as Recall)

      expect(errors).toEqual([{ text: 'The entered date is not a valid date', href: '#recallDate' }])
    })

    it('should return an error when the year is invalid', () => {
      const recallDateForm: DateForm = {
        day: '01',
        month: '02',
        year: 'abcd',
      }

      const errors = validationService.validateRecallDateForm(recallDateForm, {} as Recall)

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

      const errors = validationService.validateRecallDateForm(recallDateForm, {} as Recall)

      expect(errors).toEqual([{ text: 'The Recall Date cannot be in the future', href: '#recallDate' }])
    })
  })

  describe('Recall Date form specific tests', () => {
    it('Recall Date is valid if same as Return to Custody Date', () => {
      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() + 1)

      const recallDateForm: DateForm = {
        day: '1',
        month: '1',
        year: '2024',
      }

      const errors = validationService.validateRecallDateForm(recallDateForm, {
        returnToCustodyDate: new Date(2024, 0, 1),
      } as Recall)

      expect(errors).toEqual([])
    })

    it('Recall Date cannot be after Return to Custody Date', () => {
      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() + 1)

      const recallDateForm: DateForm = {
        day: '2',
        month: '1',
        year: '2024',
      }

      const errors = validationService.validateRecallDateForm(recallDateForm, {
        returnToCustodyDate: new Date(2024, 0, 1),
      } as Recall)

      expect(errors).toEqual([
        { text: 'The Recall Date cannot be after the Return to Custody Date', href: '#recallDate' },
      ])
    })
  })

  describe('Return to Custody Date form specific tests', () => {
    it('Return to Custody Date is valid if same as Recall Date', () => {
      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() + 1)

      const returnToCustodyDateForm: DateForm = {
        day: '1',
        month: '1',
        year: '2024',
      }

      const errors = validationService.validateReturnToCustodyDateForm(returnToCustodyDateForm, {
        recallDate: new Date(2024, 0, 1),
      } as Recall)

      expect(errors).toEqual([])
    })

    it('Return to Custody Date cannot be before Recall Date', () => {
      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() + 1)

      const returnToCustodyDateForm: DateForm = {
        day: '2',
        month: '1',
        year: '2024',
      }

      const errors = validationService.validateReturnToCustodyDateForm(returnToCustodyDateForm, {
        recallDate: new Date(2024, 0, 3),
      } as Recall)

      expect(errors).toEqual([
        { text: 'The Recall Date cannot be after the Return to Custody Date', href: '#returnToCustodyDate' },
      ])
    })
  })

  describe('Tests for check-sentences page validation', () => {
    it('Validation Error is returned if no on licence sentences', () => {
      const errors = validationService.validateSentences([], {
        recallDate: new Date(2024, 0, 1),
      } as Recall)

      expect(errors).toEqual([
        {
          text:
            'There are no sentences eligible for recall using the recall date of 01 Jan 2024 entered. ' +
            'If you think this is incorrect, check the sentence details held in the Remand and Sentencing Service.',
        },
      ])
    })

    it('Validation passes if there are on licence sentences', () => {
      const errors = validationService.validateSentences([{} as SentenceDetail], {
        recallDate: new Date(2024, 0, 1),
      } as Recall)

      expect(errors).toEqual([])
    })
  })
})
