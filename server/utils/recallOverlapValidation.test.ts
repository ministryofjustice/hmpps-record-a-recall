
import { addDays, subDays } from 'date-fns'
// eslint-disable-next-line import/no-unresolved
import { Recall } from 'models'
import { RecallTypes } from '../@types/recallTypes'
import { RecallJourneyData } from '../helpers/formWizardHelper'
import {
  validateRevocationDateAgainstRecalls,
  getRecallsToConsiderForValidation,
  getActiveRecallsForValidation,
} from './recallOverlapValidation'

describe('Recall Overlap Validation', () => {
  const baseDate = new Date('2024-01-15')
  const nomsId = 'A1234BC'

  // Test data factories
  const createRecallJourneyData = (isEdit: boolean, currentRecallId?: string): RecallJourneyData => ({
    isEdit,
    storedRecall: isEdit && currentRecallId ? createMockRecall(currentRecallId) : undefined,
    revocationDate: undefined,
    revDateString: '',
    inPrisonAtRecall: false,
    returnToCustodyDate: undefined,
    returnToCustodyDateString: '',
    ual: undefined,
    ualText: '',
    manualCaseSelection: false,
    recallType: RecallTypes.STANDARD_RECALL,
    courtCaseCount: 0,
    eligibleSentenceCount: 0,
    sentenceIds: [],
  })

  const createMockRecall = (recallId: string, overrides: Partial<Recall> = {}): Recall => ({
    recallId,
    createdAt: '2024-01-01T00:00:00.000Z',
    revocationDate: baseDate,
    returnToCustodyDate: addDays(baseDate, 1),
    recallType: RecallTypes.STANDARD_RECALL,
    location: 'BWI',
    sentenceIds: ['123'],
    courtCaseIds: ['456'],
    ...overrides,
  })

  const createFtrRecall = (
    recallId: string,
    ftrType: 'FTR_14' | 'FTR_28',
    revocationDate: Date,
    hasUal = false,
  ): Recall => {
    const recallType = ftrType === 'FTR_14' ? RecallTypes.FOURTEEN_DAY_FIXED_TERM_RECALL : RecallTypes.TWENTY_EIGHT_DAY_FIXED_TERM_RECALL
    return createMockRecall(recallId, {
      recallType,
      revocationDate,
      returnToCustodyDate: hasUal ? addDays(revocationDate, 3) : revocationDate,
      ual: hasUal ? {
        firstDay: addDays(revocationDate, 1),
        lastDay: addDays(revocationDate, 2),
        days: 2,
      } : undefined,
    })
  }

  describe('validateRevocationDateAgainstRecalls', () => {
    describe('AC1: 14-day FTR overlap - already in prison', () => {
      it('should prevent overlap within 14 days of existing 14-day FTR (already in prison)', () => {
        const existingRecall = createFtrRecall('existing-123', 'FTR_14', baseDate, false) // No UAL = already in prison
        const testDate = addDays(baseDate, 10) // Within 14 days

        const result = validateRevocationDateAgainstRecalls(
          testDate,
          [existingRecall],
          createRecallJourneyData(false)
        )

        expect(result.isValid).toBe(false)
        expect(result.errorType).toBe('overlapsFixedTermRecall')
      })

      it('should allow dates outside 14-day period for existing 14-day FTR (already in prison)', () => {
        const existingRecall = createFtrRecall('existing-123', 'FTR_14', baseDate, false)
        const testDate = addDays(baseDate, 15) // Outside 14 days

        const result = validateRevocationDateAgainstRecalls(
          testDate,
          [existingRecall],
          createRecallJourneyData(false)
        )

        expect(result.isValid).toBe(true)
      })
    })

    describe('AC2: 28-day FTR overlap - already in prison', () => {
      it('should prevent overlap within 28 days of existing 28-day FTR (already in prison)', () => {
        const existingRecall = createFtrRecall('existing-123', 'FTR_28', baseDate, false)
        const testDate = addDays(baseDate, 20) // Within 28 days

        const result = validateRevocationDateAgainstRecalls(
          testDate,
          [existingRecall],
          createRecallJourneyData(false)
        )

        expect(result.isValid).toBe(false)
        expect(result.errorType).toBe('overlapsFixedTermRecall')
      })

      it('should allow dates outside 28-day period for existing 28-day FTR (already in prison)', () => {
        const existingRecall = createFtrRecall('existing-123', 'FTR_28', baseDate, false)
        const testDate = addDays(baseDate, 29) // Outside 28 days

        const result = validateRevocationDateAgainstRecalls(
          testDate,
          [existingRecall],
          createRecallJourneyData(false)
        )

        expect(result.isValid).toBe(true)
      })
    })

    describe('AC3: 14-day FTR overlap - not in prison', () => {
      it('should prevent overlap within 14 days of return to custody date (not in prison)', () => {
        const existingRecall = createFtrRecall('existing-123', 'FTR_14', baseDate, true) // Has UAL = not in prison
        const returnToCustodyDate = existingRecall.returnToCustodyDate!
        const testDate = addDays(returnToCustodyDate, 10) // Within 14 days of RTC date

        const result = validateRevocationDateAgainstRecalls(
          testDate,
          [existingRecall],
          createRecallJourneyData(false)
        )

        expect(result.isValid).toBe(false)
        expect(result.errorType).toBe('overlapsFixedTermRecall')
      })

      it('should allow dates outside 14-day period from return to custody date (not in prison)', () => {
        const existingRecall = createFtrRecall('existing-123', 'FTR_14', baseDate, true)
        const returnToCustodyDate = existingRecall.returnToCustodyDate!
        const testDate = addDays(returnToCustodyDate, 15) // Outside 14 days of RTC date

        const result = validateRevocationDateAgainstRecalls(
          testDate,
          [existingRecall],
          createRecallJourneyData(false)
        )

        expect(result.isValid).toBe(true)
      })
    })

    describe('AC4: 28-day FTR overlap - not in prison', () => {
      it('should prevent overlap within 28 days of return to custody date (not in prison)', () => {
        const existingRecall = createFtrRecall('existing-123', 'FTR_28', baseDate, true)
        const returnToCustodyDate = existingRecall.returnToCustodyDate!
        const testDate = addDays(returnToCustodyDate, 20) // Within 28 days of RTC date

        const result = validateRevocationDateAgainstRecalls(
          testDate,
          [existingRecall],
          createRecallJourneyData(false)
        )

        expect(result.isValid).toBe(false)
        expect(result.errorType).toBe('overlapsFixedTermRecall')
      })

      it('should allow dates outside 28-day period from return to custody date (not in prison)', () => {
        const existingRecall = createFtrRecall('existing-123', 'FTR_28', baseDate, true)
        const returnToCustodyDate = existingRecall.returnToCustodyDate!
        const testDate = addDays(returnToCustodyDate, 29) // Outside 28 days of RTC date

        const result = validateRevocationDateAgainstRecalls(
          testDate,
          [existingRecall],
          createRecallJourneyData(false)
        )

        expect(result.isValid).toBe(true)
      })
    })

    describe('AC5: Revocation date on or before existing recall', () => {
      it('should prevent revocation date equal to existing recall date', () => {
        const existingRecall = createMockRecall('existing-123', { revocationDate: baseDate })
        const testDate = baseDate // Same date

        const result = validateRevocationDateAgainstRecalls(
          testDate,
          [existingRecall],
          createRecallJourneyData(false)
        )

        expect(result.isValid).toBe(false)
        expect(result.errorType).toBe('onOrBeforeExistingRecall')
      })

      it('should prevent revocation date before existing recall date', () => {
        const existingRecall = createMockRecall('existing-123', { revocationDate: baseDate })
        const testDate = subDays(baseDate, 1) // Before existing

        const result = validateRevocationDateAgainstRecalls(
          testDate,
          [existingRecall],
          createRecallJourneyData(false)
        )

        expect(result.isValid).toBe(false)
        expect(result.errorType).toBe('onOrBeforeExistingRecall')
      })

      it('should allow revocation date after existing recall date', () => {
        const existingRecall = createMockRecall('existing-123', { revocationDate: baseDate })
        const testDate = addDays(baseDate, 1) // After existing

        const result = validateRevocationDateAgainstRecalls(
          testDate,
          [existingRecall],
          createRecallJourneyData(false)
        )

        expect(result.isValid).toBe(true)
      })
    })

    describe('AC6: Edit mode - exclude current recall from validation', () => {
      it('should exclude current recall being edited from validation', () => {
        const currentRecallId = 'current-recall-123'
        const currentRecall = createMockRecall(currentRecallId, { revocationDate: baseDate })
        const testDate = baseDate // Same as current recall - would fail if not excluded

        const result = validateRevocationDateAgainstRecalls(
          testDate,
          [currentRecall],
          createRecallJourneyData(true, currentRecallId)
        )

        expect(result.isValid).toBe(true) // Should be valid because current recall is excluded
      })

      it('should still validate against other recalls when editing', () => {
        const currentRecallId = 'current-recall-123'
        const currentRecall = createMockRecall(currentRecallId, { revocationDate: baseDate })
        const otherRecall = createMockRecall('other-recall-456', { revocationDate: addDays(baseDate, 5) })
        const testDate = addDays(baseDate, 5) // Same as other recall

        const result = validateRevocationDateAgainstRecalls(
          testDate,
          [currentRecall, otherRecall],
          createRecallJourneyData(true, currentRecallId)
        )

        expect(result.isValid).toBe(false) // Should fail because of other recall
        expect(result.errorType).toBe('onOrBeforeExistingRecall')
      })
    })

    describe('AC7: Edit mode - 14-day FTR overlap validation', () => {
      it('should prevent overlap with other 14-day FTR when editing (already in prison)', () => {
        const currentRecallId = 'current-recall-123'
        const currentRecall = createMockRecall(currentRecallId)
        const otherFtrRecall = createFtrRecall('other-ftr-456', 'FTR_14', baseDate, false)
        const testDate = addDays(baseDate, 10) // Within 14 days of other FTR

        const result = validateRevocationDateAgainstRecalls(
          testDate,
          [currentRecall, otherFtrRecall],
          createRecallJourneyData(true, currentRecallId)
        )

        expect(result.isValid).toBe(false)
        expect(result.errorType).toBe('overlapsFixedTermRecall')
      })
    })

    describe('AC8: Edit mode - 28-day FTR overlap validation', () => {
      it('should prevent overlap with other 28-day FTR when editing (already in prison)', () => {
        const currentRecallId = 'current-recall-123'
        const currentRecall = createMockRecall(currentRecallId)
        const otherFtrRecall = createFtrRecall('other-ftr-456', 'FTR_28', baseDate, false)
        const testDate = addDays(baseDate, 20) // Within 28 days of other FTR

        const result = validateRevocationDateAgainstRecalls(
          testDate,
          [currentRecall, otherFtrRecall],
          createRecallJourneyData(true, currentRecallId)
        )

        expect(result.isValid).toBe(false)
        expect(result.errorType).toBe('overlapsFixedTermRecall')
      })
    })

    describe('AC9: Edit mode - 14-day FTR overlap validation (not in prison)', () => {
      it('should prevent overlap with other 14-day FTR when editing (not in prison)', () => {
        const currentRecallId = 'current-recall-123'
        const currentRecall = createMockRecall(currentRecallId)
        const otherFtrRecall = createFtrRecall('other-ftr-456', 'FTR_14', baseDate, true)
        const returnToCustodyDate = otherFtrRecall.returnToCustodyDate!
        const testDate = addDays(returnToCustodyDate, 10) // Within 14 days of RTC date

        const result = validateRevocationDateAgainstRecalls(
          testDate,
          [currentRecall, otherFtrRecall],
          createRecallJourneyData(true, currentRecallId)
        )

        expect(result.isValid).toBe(false)
        expect(result.errorType).toBe('overlapsFixedTermRecall')
      })
    })

    describe('AC10: Edit mode - 28-day FTR overlap validation (not in prison)', () => {
      it('should prevent overlap with other 28-day FTR when editing (not in prison)', () => {
        const currentRecallId = 'current-recall-123'
        const currentRecall = createMockRecall(currentRecallId)
        const otherFtrRecall = createFtrRecall('other-ftr-456', 'FTR_28', baseDate, true)
        const returnToCustodyDate = otherFtrRecall.returnToCustodyDate!
        const testDate = addDays(returnToCustodyDate, 20) // Within 28 days of RTC date

        const result = validateRevocationDateAgainstRecalls(
          testDate,
          [currentRecall, otherFtrRecall],
          createRecallJourneyData(true, currentRecallId)
        )

        expect(result.isValid).toBe(false)
        expect(result.errorType).toBe('overlapsFixedTermRecall')
      })
    })

    describe('AC11: Edit mode - revocation date on or before existing recall', () => {
      it('should prevent edited revocation date on or before other existing recall', () => {
        const currentRecallId = 'current-recall-123'
        const currentRecall = createMockRecall(currentRecallId)
        const otherRecall = createMockRecall('other-recall-456', { revocationDate: baseDate })
        const testDate = baseDate // Same as other recall

        const result = validateRevocationDateAgainstRecalls(
          testDate,
          [currentRecall, otherRecall],
          createRecallJourneyData(true, currentRecallId)
        )

        expect(result.isValid).toBe(false)
        expect(result.errorType).toBe('onOrBeforeExistingRecall')
      })
    })

    describe('Edge cases and multiple recalls', () => {
      it('should handle multiple overlapping recalls and return first violation', () => {
        const ftr14Recall = createFtrRecall('ftr14-123', 'FTR_14', baseDate, false)
        const ftr28Recall = createFtrRecall('ftr28-456', 'FTR_28', addDays(baseDate, 5), false)
        const testDate = addDays(baseDate, 7) // Overlaps with both

        const result = validateRevocationDateAgainstRecalls(
          testDate,
          [ftr14Recall, ftr28Recall],
          createRecallJourneyData(false)
        )

        expect(result.isValid).toBe(false)
        expect(result.errorType).toBe('overlapsFixedTermRecall')
      })

      it('should handle empty recalls array', () => {
        const testDate = baseDate

        const result = validateRevocationDateAgainstRecalls(
          testDate,
          [],
          createRecallJourneyData(false)
        )

        expect(result.isValid).toBe(true)
      })

      it('should ignore non-FTR recalls for FTR overlap checks', () => {
        const standardRecall = createMockRecall('standard-123', {
          revocationDate: baseDate,
          recallType: RecallTypes.STANDARD_RECALL
        })
        const testDate = addDays(baseDate, 5) // After standard recall, should be valid

        const result = validateRevocationDateAgainstRecalls(
          testDate,
          [standardRecall],
          createRecallJourneyData(false)
        )

        expect(result.isValid).toBe(true)
      })
    })
  })

  describe('getRecallsToConsiderForValidation', () => {
    it('should return all recalls when not editing', () => {
      const recalls = [
        createMockRecall('recall-1'),
        createMockRecall('recall-2'),
      ]

      const result = getRecallsToConsiderForValidation(recalls, createRecallJourneyData(false))

      expect(result).toHaveLength(2)
      expect(result).toEqual(recalls)
    })

    it('should exclude current recall when editing', () => {
      const currentRecallId = 'current-123'
      const recalls = [
        createMockRecall(currentRecallId),
        createMockRecall('other-456'),
      ]

      const result = getRecallsToConsiderForValidation(recalls, createRecallJourneyData(true, currentRecallId))

      expect(result).toHaveLength(1)
      expect(result[0].recallId).toBe('other-456')
    })

    it('should handle empty array', () => {
      const result = getRecallsToConsiderForValidation([], createRecallJourneyData(false))

      expect(result).toHaveLength(0)
    })
  })

  describe('getActiveRecallsForValidation', () => {
    it('should return all recalls (currently no filtering implemented)', () => {
      const recalls = [
        createMockRecall('recall-1'),
        createMockRecall('recall-2'),
      ]

      const result = getActiveRecallsForValidation(recalls)

      expect(result).toHaveLength(2)
      expect(result).toEqual(recalls)
    })

    it('should handle empty array', () => {
      const result = getActiveRecallsForValidation([])

      expect(result).toHaveLength(0)
    })
  })
})
