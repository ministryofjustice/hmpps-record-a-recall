// eslint-disable-next-line import/no-unresolved
import { CourtCase } from 'models'
import { summariseRasCases } from './CaseSentenceSummariser'
import { RecallableCourtCaseSentence } from '../@types/remandAndSentencingApi/remandAndSentencingTypes'

describe('CaseSentenceSummariser', () => {
  describe('summariseRasCases', () => {
    it('should only include recallable sentences in eligibleSentences when court case has mixed sentence types', () => {
      const mockRecallableSentence: RecallableCourtCaseSentence = {
        sentenceUuid: 'sentence-1',
        sentenceType: 'SDS',
        sentenceTypeUuid: 'test-uuid-1',
        isRecallable: true,
        offenceCode: 'OFF001',
        outcomeDescription: 'Test offence 1',
        convictionDate: '2024-01-01',
        systemOfRecord: 'RAS',
        periodLengths: [],
        sentenceLegacyData: { postedDate: '2024-01-01' },
        chargeLegacyData: {},
      }

      const mockNonRecallableSentence: RecallableCourtCaseSentence = {
        sentenceUuid: 'sentence-2',
        sentenceType: 'IMPRISONMENT_IN_DEFAULT_OF_FINE',
        sentenceTypeUuid: 'test-uuid-2',
        isRecallable: false,
        offenceCode: 'OFF002',
        outcomeDescription: 'Imprisonment in default of fine',
        convictionDate: '2024-01-01',
        systemOfRecord: 'RAS',
        periodLengths: [],
        sentenceLegacyData: { postedDate: '2024-01-01' },
        chargeLegacyData: {},
      }

      const courtCase: CourtCase = {
        caseId: 'case-1',
        status: 'ACTIVE',
        date: '2024-01-01',
        location: 'COURT001',
        locationName: 'Test Court',
        reference: 'A5899EC',
        sentences: [mockRecallableSentence, mockNonRecallableSentence],
        sentenced: true,
      }

      const result = summariseRasCases([courtCase])

      expect(result).toHaveLength(1)
      const summarisedGroup = result[0]

      // Should have one eligible sentence (recallable SDS)
      expect(summarisedGroup.eligibleSentences).toHaveLength(1)
      expect(summarisedGroup.eligibleSentences[0].sentenceId).toBe('sentence-1')
      expect(summarisedGroup.hasEligibleSentences).toBe(true)

      // Should have one ineligible sentence (non-recallable fine default)
      expect(summarisedGroup.ineligibleSentences).toHaveLength(1)
      expect(summarisedGroup.ineligibleSentences[0].sentenceId).toBe('sentence-2')
      expect(summarisedGroup.hasIneligibleSentences).toBe(true)

      // All sentences should still be tracked in the sentences array
      expect(summarisedGroup.sentences).toHaveLength(2)
    })

    it('should only include recallable sentences for A5900EC scenario', () => {
      const mockRecallableSentence: RecallableCourtCaseSentence = {
        sentenceUuid: 'sentence-3',
        sentenceType: 'SDS',
        sentenceTypeUuid: 'test-uuid-3',
        isRecallable: true,
        offenceCode: 'OFF003',
        outcomeDescription: 'Test offence 3',
        convictionDate: '2024-02-01',
        systemOfRecord: 'RAS',
        periodLengths: [],
        sentenceLegacyData: { postedDate: '2024-01-01' },
        chargeLegacyData: {},
      }

      const mockCivilImprisonment: RecallableCourtCaseSentence = {
        sentenceUuid: 'sentence-4',
        sentenceType: 'CIVIL_IMPRISONMENT',
        sentenceTypeUuid: 'test-uuid-4',
        isRecallable: false,
        offenceCode: 'OFF004',
        outcomeDescription: 'Civil imprisonment',
        convictionDate: '2024-02-01',
        systemOfRecord: 'RAS',
        periodLengths: [],
        sentenceLegacyData: { postedDate: '2024-01-01' },
        chargeLegacyData: {},
      }

      const courtCase: CourtCase = {
        caseId: 'case-2',
        status: 'ACTIVE',
        date: '2024-02-01',
        location: 'COURT002',
        locationName: 'Test Court 2',
        reference: 'A5900EC',
        sentences: [mockRecallableSentence, mockCivilImprisonment],
        sentenced: true,
      }

      const result = summariseRasCases([courtCase])

      expect(result).toHaveLength(1)
      const summarisedGroup = result[0]

      // Only the recallable SDS sentence should be eligible
      expect(summarisedGroup.eligibleSentences).toHaveLength(1)
      expect(summarisedGroup.eligibleSentences[0].sentenceId).toBe('sentence-3')

      // should be ineligible
      expect(summarisedGroup.ineligibleSentences).toHaveLength(1)
      expect(summarisedGroup.ineligibleSentences[0].sentenceId).toBe('sentence-4')
    })

    it('should handle court case with only recallable sentences', () => {
      const mockRecallableSentences: RecallableCourtCaseSentence[] = [
        {
          sentenceUuid: 'sentence-5',
          sentenceType: 'SDS',
          sentenceTypeUuid: 'test-uuid-5',
          isRecallable: true,
          offenceCode: 'OFF005',
          outcomeDescription: 'Test offence 5',
          convictionDate: '2024-03-01',
          systemOfRecord: 'RAS',
          periodLengths: [],
          sentenceLegacyData: { postedDate: '2024-01-01' },
          chargeLegacyData: {},
        },
        {
          sentenceUuid: 'sentence-6',
          sentenceType: 'SDS',
          sentenceTypeUuid: 'test-uuid-6',
          isRecallable: true,
          offenceCode: 'OFF006',
          outcomeDescription: 'Test offence 6',
          convictionDate: '2024-03-01',
          systemOfRecord: 'RAS',
          periodLengths: [],
          sentenceLegacyData: { postedDate: '2024-01-01' },
          chargeLegacyData: {},
        },
      ]

      const courtCase: CourtCase = {
        caseId: 'case-3',
        status: 'ACTIVE',
        date: '2024-03-01',
        location: 'COURT003',
        locationName: 'Test Court 3',
        reference: 'REF003',
        sentences: mockRecallableSentences,
        sentenced: true,
      }

      const result = summariseRasCases([courtCase])

      expect(result).toHaveLength(1)
      const summarisedGroup = result[0]

      // All sentences should be eligible
      expect(summarisedGroup.eligibleSentences).toHaveLength(2)
      expect(summarisedGroup.eligibleSentences.map(s => s.sentenceId)).toEqual(['sentence-5', 'sentence-6'])
      expect(summarisedGroup.hasEligibleSentences).toBe(true)

      // No ineligible sentences
      expect(summarisedGroup.ineligibleSentences).toHaveLength(0)
      expect(summarisedGroup.hasIneligibleSentences).toBe(false)
    })

    it('should respect isRecallable=false even if sentence type would normally be eligible', () => {
      // This tests that isRecallable property takes precedence
      const mockSentence: RecallableCourtCaseSentence = {
        sentenceUuid: 'sentence-7',
        sentenceType: 'SDS', // Normally eligible for recall
        sentenceTypeUuid: 'test-uuid-7',
        isRecallable: false, // But marked as non-recallable
        offenceCode: 'OFF007',
        outcomeDescription: 'SDS marked non-recallable',
        convictionDate: '2024-04-01',
        systemOfRecord: 'RAS',
        periodLengths: [],
        sentenceLegacyData: { postedDate: '2024-01-01' },
        chargeLegacyData: {},
      }

      const courtCase: CourtCase = {
        caseId: 'case-4',
        status: 'ACTIVE',
        date: '2024-04-01',
        location: 'COURT004',
        locationName: 'Test Court 4',
        reference: 'REF004',
        sentences: [mockSentence],
        sentenced: true,
      }

      const result = summariseRasCases([courtCase])

      expect(result).toHaveLength(1)
      const summarisedGroup = result[0]

      // Even though sentenceType is SDS, if isRecallable=false, it should be ineligible
      expect(summarisedGroup.eligibleSentences).toHaveLength(0)
      expect(summarisedGroup.ineligibleSentences).toHaveLength(1)
      expect(summarisedGroup.ineligibleSentences[0].sentenceId).toBe('sentence-7')
    })

    it('should filter out court cases with no sentences', () => {
      const courtCase: CourtCase = {
        caseId: 'case-5',
        status: 'ACTIVE',
        date: '2024-05-01',
        location: 'COURT005',
        locationName: 'Test Court 5',
        reference: 'REF005',
        sentences: [],
        sentenced: true,
      }

      const result = summariseRasCases([courtCase])

      expect(result).toHaveLength(0)
    })
  })
})
