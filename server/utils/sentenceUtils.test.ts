// eslint-disable-next-line import/no-unresolved
import { SentenceWithDpsUuid } from 'models'
import { CalculationBreakdown } from '../@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'
import { groupSentencesByRevocationDate, groupSentencesByCaseRefAndCourt } from './sentenceUtils'

describe('sentenceUtils', () => {
  describe('groupSentencesByRevocationDate', () => {
    it('should group sentences based on recall date - expired sentences', async () => {
      const calculationBreakdown = {
        concurrentSentences: [
          {
            lineSequence: 1,
            sentencedAt: '2022-01-01',
            sentenceLength: '2 years',
            sentenceLengthDays: 730,
            dates: {
              CRD: {
                adjusted: '2024-01-01',
                unadjusted: '2024-01-01',
                daysFromSentenceStart: 730,
                adjustedByDays: 0,
              },
              SLED: {
                adjusted: '2023-12-01',
                unadjusted: '2023-12-01',
                daysFromSentenceStart: 700,
                adjustedByDays: 0,
              },
            },
            caseSequence: 1,
            externalSentenceId: {
              bookingId: 1,
              sentenceSequence: 1,
            },
            caseReference: '12345',
          },
        ],
        consecutiveSentence: undefined,
        breakdownByReleaseDateType: {},
        otherDates: {},
        ersedNotApplicableDueToDtoLaterThanCrd: false,
        showSds40Hints: true,
      } as CalculationBreakdown

      const result = groupSentencesByRevocationDate(calculationBreakdown, new Date(2024, 1, 1))

      expect(result).toEqual({
        onLicenceSentences: [],
        activeSentences: [],
        expiredSentences: [
          {
            caseSequence: 1,
            lineSequence: 1,
            externalSentenceId: {
              bookingId: 1,
              sentenceSequence: 1,
            },
            sentencedAt: '2022-01-01',
            sentenceLength: '2 years',
            consecutiveTo: null,
            crd: '2024-01-01',
            sled: '2023-12-01',
          },
        ],
      })
    })

    it('should group sentences based on recall date - on licence sentences', async () => {
      const calculationBreakdown = {
        concurrentSentences: [
          {
            lineSequence: 1,
            sentencedAt: '2022-01-01',
            sentenceLength: '2 years',
            sentenceLengthDays: 730,
            dates: {
              CRD: {
                adjusted: '2024-01-01',
                unadjusted: '2024-01-01',
                daysFromSentenceStart: 730,
                adjustedByDays: 0,
              },
              SLED: {
                adjusted: '2024-06-01',
                unadjusted: '2024-06-01',
                daysFromSentenceStart: 880,
                adjustedByDays: 0,
              },
            },
            caseSequence: 1,
            externalSentenceId: {
              bookingId: 1,
              sentenceSequence: 1,
            },
            caseReference: '12345',
          },
        ],
        consecutiveSentence: undefined,
        breakdownByReleaseDateType: {},
        otherDates: {},
        ersedNotApplicableDueToDtoLaterThanCrd: false,
        showSds40Hints: true,
      } as CalculationBreakdown

      const result = groupSentencesByRevocationDate(calculationBreakdown, new Date(2024, 3, 1))

      expect(result).toEqual({
        onLicenceSentences: [
          {
            caseSequence: 1,
            lineSequence: 1,
            externalSentenceId: {
              bookingId: 1,
              sentenceSequence: 1,
            },
            sentencedAt: '2022-01-01',
            sentenceLength: '2 years',
            consecutiveTo: null,
            crd: '2024-01-01',
            sled: '2024-06-01',
          },
        ],
        activeSentences: [],
        expiredSentences: [],
      })
    })

    it('should group sentences based on recall date - active sentences', async () => {
      const calculationBreakdown = {
        concurrentSentences: [
          {
            lineSequence: 1,
            sentencedAt: '2022-01-01',
            sentenceLength: '2 years',
            sentenceLengthDays: 730,
            dates: {
              CRD: {
                adjusted: '2024-01-01',
                unadjusted: '2024-01-01',
                daysFromSentenceStart: 730,
                adjustedByDays: 0,
              },
              SLED: {
                adjusted: '2024-03-01',
                unadjusted: '2024-03-01',
                daysFromSentenceStart: 790,
                adjustedByDays: 0,
              },
            },
            caseSequence: 1,
            externalSentenceId: {
              bookingId: 1,
              sentenceSequence: 1,
            },
            caseReference: '12345',
          },
        ],
        consecutiveSentence: undefined,
        breakdownByReleaseDateType: {},
        otherDates: {},
        ersedNotApplicableDueToDtoLaterThanCrd: false,
        showSds40Hints: true,
      } as CalculationBreakdown

      const result = groupSentencesByRevocationDate(calculationBreakdown, new Date(2023, 11, 15))

      expect(result).toEqual({
        onLicenceSentences: [],
        activeSentences: [
          {
            lineSequence: 1,
            caseSequence: 1,
            externalSentenceId: {
              bookingId: 1,
              sentenceSequence: 1,
            },
            sentencedAt: '2022-01-01',
            sentenceLength: '2 years',
            consecutiveTo: null,
            crd: '2024-01-01',
            sled: '2024-03-01',
          },
        ],
        expiredSentences: [],
      })
    })

    it('should group sentences based on recall date - mixed sentence types', async () => {
      const calculationBreakdown = {
        concurrentSentences: [
          {
            lineSequence: 1,
            sentencedAt: '2022-01-01',
            sentenceLength: '2 years',
            sentenceLengthDays: 730,
            dates: {
              CRD: {
                adjusted: '2024-01-01', // CRD is before the recall date
                unadjusted: '2024-01-01',
                daysFromSentenceStart: 730,
                adjustedByDays: 0,
              },
              SLED: {
                adjusted: '2024-04-01', // SLED is after the recall date
                unadjusted: '2024-04-01',
                daysFromSentenceStart: 820,
                adjustedByDays: 0,
              },
            },
            caseSequence: 1,
            externalSentenceId: {
              bookingId: 1,
              sentenceSequence: 1,
            },
            caseReference: '12345',
          },
          {
            lineSequence: 2,
            sentencedAt: '2021-01-01',
            sentenceLength: '3 years',
            sentenceLengthDays: 1095,
            dates: {
              CRD: {
                adjusted: '2023-01-01', // CRD is before the recall date
                unadjusted: '2023-01-01',
                daysFromSentenceStart: 730,
                adjustedByDays: 0,
              },
              SLED: {
                adjusted: '2023-12-01', // SLED is before the recall date
                unadjusted: '2023-12-01',
                daysFromSentenceStart: 1065,
                adjustedByDays: 0,
              },
            },
            caseSequence: 2,
            externalSentenceId: {
              bookingId: 1,
              sentenceSequence: 1,
            },
            caseReference: '67890',
          },
        ],
        consecutiveSentence: undefined,
        breakdownByReleaseDateType: {},
        otherDates: {},
        ersedNotApplicableDueToDtoLaterThanCrd: false,
        showSds40Hints: true,
      } as CalculationBreakdown

      const result = groupSentencesByRevocationDate(calculationBreakdown, new Date(2024, 2, 15))

      expect(result).toEqual({
        activeSentences: [],
        expiredSentences: [
          {
            caseSequence: 2,
            consecutiveTo: null,
            crd: '2023-01-01',
            lineSequence: 2,
            sentenceLength: '3 years',
            sentencedAt: '2021-01-01',
            sled: '2023-12-01',
            externalSentenceId: {
              bookingId: 1,
              sentenceSequence: 1,
            },
          },
        ],
        onLicenceSentences: [
          {
            caseSequence: 1,
            consecutiveTo: null,
            crd: '2024-01-01',
            lineSequence: 1,
            sentenceLength: '2 years',
            sentencedAt: '2022-01-01',
            sled: '2024-04-01',
            externalSentenceId: {
              bookingId: 1,
              sentenceSequence: 1,
            },
          },
        ],
      })
    })

    it('should handle cases where there are no eligible sentences', async () => {
      const breakdown = {
        concurrentSentences: [],
        consecutiveSentence: undefined,
        breakdownByReleaseDateType: {},
        otherDates: {},
        ersedNotApplicableDueToDtoLaterThanCrd: false,
      } as CalculationBreakdown

      const result = groupSentencesByRevocationDate(breakdown, new Date(2024, 2, 15))

      expect(result).toEqual({ activeSentences: [], expiredSentences: [], onLicenceSentences: [] })
    })
  })

  describe('groupSentencesByCaseRefAndCourt', () => {
    it('should group sentences by case reference and court', () => {
      const sentences: SentenceWithDpsUuid[] = [
        {
          caseReference: '12345',
          courtDescription: 'Liverpool Crown Court',
          dpsSentenceUuid: 'uuid1',
        } as SentenceWithDpsUuid,
        {
          caseReference: '12345',
          courtDescription: 'Liverpool Crown Court',
          dpsSentenceUuid: 'uuid2',
        } as SentenceWithDpsUuid,
        {
          caseReference: '67890',
          courtDescription: 'Manchester Crown Court',
          dpsSentenceUuid: 'uuid3',
        } as SentenceWithDpsUuid,
      ]

      const result = groupSentencesByCaseRefAndCourt(sentences)

      expect(result).toEqual({
        '12345 at Liverpool Crown Court': [
          {
            caseReference: '12345',
            courtDescription: 'Liverpool Crown Court',
            dpsSentenceUuid: 'uuid1',
          },
          {
            caseReference: '12345',
            courtDescription: 'Liverpool Crown Court',
            dpsSentenceUuid: 'uuid2',
          },
        ],
        '67890 at Manchester Crown Court': [
          {
            caseReference: '67890',
            courtDescription: 'Manchester Crown Court',
            dpsSentenceUuid: 'uuid3',
          },
        ],
      })
    })

    it('should handle undefined sentences array', () => {
      const result = groupSentencesByCaseRefAndCourt(undefined as SentenceWithDpsUuid[] | undefined)
      expect(result).toEqual({})
    })

    it('should handle null sentences array', () => {
      const result = groupSentencesByCaseRefAndCourt(null as SentenceWithDpsUuid[] | null)
      expect(result).toEqual({})
    })

    it('should handle empty sentences array', () => {
      const result = groupSentencesByCaseRefAndCourt([])
      expect(result).toEqual({})
    })

    it('should handle sentences without case reference', () => {
      const sentences: SentenceWithDpsUuid[] = [
        {
          caseReference: undefined,
          courtDescription: 'Liverpool Crown Court',
          dpsSentenceUuid: 'uuid1',
        } as SentenceWithDpsUuid,
      ]

      const result = groupSentencesByCaseRefAndCourt(sentences)

      expect(result).toEqual({
        'Case at Liverpool Crown Court': [
          {
            caseReference: undefined,
            courtDescription: 'Liverpool Crown Court',
            dpsSentenceUuid: 'uuid1',
          },
        ],
      })
    })
  })
})
