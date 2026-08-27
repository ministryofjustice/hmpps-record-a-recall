import {
  setAutomatedCalculationData,
  clearAutomatedCalculationData,
  resetCheckingAnswers,
} from './recallJourneyOperations'
import { RecallJourney } from '../../@types/journeys'
import TestData from '../../testutils/testData'

describe('recallJourneyOperations', () => {
  describe('setAutomatedCalculationData', () => {
    it('should set sentenceIds to the intersection of court case sentences and automated calculation recallable sentences', () => {
      const journey = { id: 'journey-1' } as RecallJourney
      const recallableSentence = TestData.recallableSentence({ sentenceUuid: 'sentence-1' })
      const nonRecallableSentence = TestData.nonRecallableSentence({ sentenceUuid: 'sentence-2' })
      const courtCase = TestData.recallableCourtCase([recallableSentence], [nonRecallableSentence])
      const { automatedCalculationData } = TestData.automatedRecallDecision(
        {},
        {
          recallableSentences: [
            {
              bookingId: 1,
              sentenceSequence: 1,
              uuid: 'sentence-1',
              sentenceCalculation: {
                actualReleaseDate: '2025-06-01',
                conditionalReleaseDate: '2025-06-01',
                licenseExpiry: '2025-12-01',
              },
            },
          ],
        },
      )

      setAutomatedCalculationData(journey, [courtCase], automatedCalculationData)

      expect(journey.sentenceIds).toEqual(['sentence-1'])
      expect(journey.calculationRequestId).toBe(automatedCalculationData.calculationRequestId)
      expect(journey.automatedCalculationData).toBe(automatedCalculationData)
    })

    it('should set sentenceIds to an empty array when there is no matching sentence uuid', () => {
      const journey = { id: 'journey-1' } as RecallJourney
      const courtCase = TestData.recallableCourtCase()
      const { automatedCalculationData } = TestData.automatedRecallDecision({}, { recallableSentences: [] })

      setAutomatedCalculationData(journey, [courtCase], automatedCalculationData)

      expect(journey.sentenceIds).toEqual([])
    })
  })

  describe('clearAutomatedCalculationData', () => {
    it('should remove calculationRequestId, automatedCalculationData and sentenceIds from the journey', () => {
      const journey = {
        id: 'journey-1',
        calculationRequestId: 991,
        sentenceIds: ['sentence-1'],
        automatedCalculationData: TestData.automatedRecallDecision().automatedCalculationData,
      } as RecallJourney

      clearAutomatedCalculationData(journey)

      expect(journey.calculationRequestId).toBeUndefined()
      expect(journey.sentenceIds).toBeUndefined()
      expect(journey.automatedCalculationData).toBeUndefined()
      expect('calculationRequestId' in journey).toBe(false)
      expect('sentenceIds' in journey).toBe(false)
      expect('automatedCalculationData' in journey).toBe(false)
    })

    it('is a no-op when the properties are not present', () => {
      const journey = { id: 'journey-1' } as RecallJourney

      expect(() => clearAutomatedCalculationData(journey)).not.toThrow()
      expect(journey.calculationRequestId).toBeUndefined()
      expect(journey.sentenceIds).toBeUndefined()
      expect(journey.automatedCalculationData).toBeUndefined()
    })
  })

  describe('resetCheckingAnswers', () => {
    it('should set isCheckingAnswers to false', () => {
      const journey = { id: 'journey-1', isCheckingAnswers: true } as RecallJourney

      resetCheckingAnswers(journey)

      expect(journey.isCheckingAnswers).toBe(false)
    })
  })
})
