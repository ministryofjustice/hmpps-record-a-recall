import { v4 as uuidv4 } from 'uuid'
import RecallService from './recallService'
import RemandAndSentencingApiClient from '../data/remandAndSentencingApiClient'
import ManageOffencesApiClient from '../data/manageOffencesApiClient'
import { ApiRecalledSentence, RecallableCourtCase } from '../@types/remandAndSentencingApi/remandAndSentencingTypes'
import { Offence } from '../@types/manageOffencesApi/manageOffencesClientTypes'
import PrisonRegisterApiClient from '../data/prisonRegisterApiClient'
import { Prison } from '../@types/prisonRegisterApi/prisonRegisterTypes'
import TestData from '../testutils/testData'
import CourtRegisterApiClient from '../data/courtRegisterApiClient'

jest.mock('../data/remandAndSentencingApiClient')
jest.mock('../data/manageOffencesApiClient')
jest.mock('../data/prisonRegisterApiClient')
jest.mock('../data/courtRegisterApiClient')

const remandAndSentencingApiClient = new RemandAndSentencingApiClient(null) as jest.Mocked<RemandAndSentencingApiClient>
const manageOffencesApiClient = new ManageOffencesApiClient(null) as jest.Mocked<ManageOffencesApiClient>
const prisonRegisterApiClient = new PrisonRegisterApiClient(null) as jest.Mocked<PrisonRegisterApiClient>
const courtRegisterApiClient = new CourtRegisterApiClient(null) as jest.Mocked<CourtRegisterApiClient>

let service: RecallService

beforeEach(() => {
  jest.resetAllMocks()
  service = new RecallService(
    remandAndSentencingApiClient,
    manageOffencesApiClient,
    prisonRegisterApiClient,
    courtRegisterApiClient,
  )
  manageOffencesApiClient.getOffencesByCodes.mockResolvedValue([
    { code: 'A1', description: 'Assault' } as Offence,
    { code: 'B2', description: 'Burglary' } as Offence,
  ])
  prisonRegisterApiClient.getPrisonNames.mockResolvedValue([
    { prisonId: 'BXI', prisonName: 'Brixton (HMP)' } as unknown as Prison,
    { prisonId: 'KMI', prisonName: 'Kirkham (HMP)' } as unknown as Prison,
    { prisonId: 'MDI', prisonName: 'Moorland (HMP & YOI)' } as unknown as Prison,
  ])
  courtRegisterApiClient.getCourtDetails.mockResolvedValue([
    {
      courtId: 'INNRCC',
      courtName: 'Inner London Sessions House Crown Court',
      courtDescription: 'Inner London Sessions House Crown Court',
      type: {
        courtType: 'CC',
        courtName: 'Crown Court',
      },
      active: true,
      buildings: [],
    },
  ])
})

describe('Recall service', () => {
  describe('getRecallableCourtCases', () => {
    it('adds offenceDescription to recallable and non-recallable sentences', async () => {
      // Given
      remandAndSentencingApiClient.getRecallableCourtCases.mockResolvedValue({
        cases: [
          {
            courtCaseUuid: 'cc-1',
            courtCode: 'INNRCC',
            sentences: [
              { offenceCode: 'A1', isRecallable: true },
              { offenceCode: 'B2', isRecallable: false },
            ],
          } as RecallableCourtCase,
        ],
      })

      // When
      const result = await service.getRecallableCourtCases('A1234BC', 'username1')

      // Then
      expect(manageOffencesApiClient.getOffencesByCodes).toHaveBeenCalledWith(['A1', 'B2'])
      expect(result).toHaveLength(1)

      const [courtCase] = result
      expect(courtCase.recallableSentences[0].offenceDescription).toBe('Assault')
      expect(courtCase.nonRecallableSentences[0].offenceDescription).toBe('Burglary')
    })

    it('adds consecutiveTo details to sentences when consecutiveToSentenceUuid is present', async () => {
      // Given
      remandAndSentencingApiClient.getRecallableCourtCases.mockResolvedValue({
        cases: [
          {
            courtCaseUuid: 'cc-1',
            courtCode: 'INNRCC',
            sentences: [
              { offenceCode: 'A1', isRecallable: true, consecutiveToSentenceUuid: 'sentence-2' },
              { offenceCode: 'B2', isRecallable: false },
            ],
          } as RecallableCourtCase,
        ],
      })

      remandAndSentencingApiClient.getConsecutiveToDetails.mockResolvedValue({
        sentences: [
          {
            sentenceUuid: 'sentence-2',
            countNumber: '3',
            offenceCode: 'B2',
            courtCaseReference: 'REF-1',
            courtCode: 'INNRCC',
            appearanceDate: '2023-05-10',
            offenceStartDate: '2023-01-01',
            offenceEndDate: null,
          },
        ],
      })

      // When
      const result = await service.getRecallableCourtCases('A1234BC', 'username1')

      // Then
      const [courtCase] = result
      expect(courtCase.recallableSentences[0].consecutiveTo).toEqual({
        countNumber: '3',
        offenceCode: 'B2',
        offenceDescription: 'Burglary',
        courtCaseReference: 'REF-1',
        courtName: 'Inner London Sessions House Crown Court',
        warrantDate: '10/05/2023',
        offenceStartDate: '01/01/2023',
        offenceEndDate: null,
      })
    })

    it('redacts consecutiveTo details when the target sentence is in the same case', async () => {
      // Given
      remandAndSentencingApiClient.getRecallableCourtCases.mockResolvedValue({
        cases: [
          {
            courtCaseUuid: 'cc-1',
            courtCode: 'INNRCC',
            sentences: [
              { sentenceUuid: 's1', offenceCode: 'A1', isRecallable: true },
              {
                sentenceUuid: 's2',
                offenceCode: 'B2',
                isRecallable: true,
                consecutiveToSentenceUuid: 's1',
              },
            ],
          } as RecallableCourtCase,
        ],
      })

      remandAndSentencingApiClient.getConsecutiveToDetails.mockResolvedValue({
        sentences: [
          {
            sentenceUuid: 's1',
            countNumber: '3',
            offenceCode: 'A1',
            courtCaseReference: 'REF-1',
            courtCode: 'INNRCC',
            appearanceDate: '2023-05-10',
            offenceStartDate: '2023-01-01',
            offenceEndDate: null,
          },
        ],
      })

      // When
      const result = await service.getRecallableCourtCases('A1234BC', 'username1')

      // Then
      const { consecutiveTo } = result[0].recallableSentences[1]

      expect(consecutiveTo).toEqual({
        countNumber: '3',
        offenceCode: 'A1',
        offenceDescription: 'Assault',
        offenceStartDate: '01/01/2023',
        offenceEndDate: null,
      })

      expect(consecutiveTo).not.toHaveProperty('courtName')
      expect(consecutiveTo).not.toHaveProperty('courtCaseReference')
      expect(consecutiveTo).not.toHaveProperty('warrantDate')
    })

    it('includes court + offence codes from consecutiveToDetails even when not present on original case', async () => {
      // Given: original case only has INNRCC + A1
      remandAndSentencingApiClient.getRecallableCourtCases.mockResolvedValue({
        cases: [
          {
            courtCaseUuid: 'cc-1',
            courtCode: 'INNRCC',
            sentences: [{ offenceCode: 'A1', isRecallable: true, consecutiveToSentenceUuid: 'sentence-2' }],
          } as RecallableCourtCase,
        ],
      })

      // consecutive-to points to a different court + offence not in original
      remandAndSentencingApiClient.getConsecutiveToDetails.mockResolvedValue({
        sentences: [
          {
            sentenceUuid: 'sentence-2',
            countNumber: '3',
            offenceCode: 'C3',
            courtCaseReference: 'REF-1',
            courtCode: 'NEWCT',
            appearanceDate: '2023-05-10',
            offenceStartDate: '2023-01-01',
            offenceEndDate: null,
          },
        ],
      })

      manageOffencesApiClient.getOffencesByCodes.mockResolvedValue([
        { code: 'A1', description: 'Assault' } as Offence,
        { code: 'C3', description: 'Consecutive offence' } as Offence,
      ])

      courtRegisterApiClient.getCourtDetails.mockResolvedValue([
        {
          courtId: 'INNRCC',
          courtName: 'Inner London Sessions House Crown Court',
          courtDescription: 'Inner London Sessions House Crown Court',
          type: { courtType: 'CC', courtName: 'Crown Court' },
          active: true,
          buildings: [],
        },
        {
          courtId: 'NEWCT',
          courtName: 'New Court Name',
          courtDescription: 'New Court Name',
          type: { courtType: 'CC', courtName: 'Crown Court' },
          active: true,
          buildings: [],
        },
      ])

      // When
      const result = await service.getRecallableCourtCases('A1234BC', 'username1')

      // Then: service includes NEWCT + C3 in lookup calls
      expect(courtRegisterApiClient.getCourtDetails).toHaveBeenCalledWith(
        expect.arrayContaining(['INNRCC', 'NEWCT']),
        'username1',
      )
      expect(manageOffencesApiClient.getOffencesByCodes).toHaveBeenCalledWith(expect.arrayContaining(['A1', 'C3']))

      expect(result[0].recallableSentences[0].consecutiveTo).toEqual({
        countNumber: '3',
        offenceCode: 'C3',
        offenceDescription: 'Consecutive offence',
        courtCaseReference: 'REF-1',
        courtName: 'New Court Name',
        warrantDate: '10/05/2023',
        offenceStartDate: '01/01/2023',
        offenceEndDate: null,
      })
    })
  })

  describe('getRecallsForPrisoner', () => {
    it('should load recalls for prisoner and enrich with prison names', async () => {
      const withPrisonName = TestData.apiRecall({
        prisonerId: 'A1234BC',
        createdAt: '2021-03-19T13:40:56Z',
        createdByPrison: 'KMI',
        source: 'DPS',
      })
      const withNoPrisonName = TestData.apiRecall({
        prisonerId: 'A1234BC',
        createdAt: '2019-01-18T13:40:56Z',
        createdByPrison: undefined,
        source: 'DPS',
      })
      remandAndSentencingApiClient.getAllRecalls.mockResolvedValue([withPrisonName, withNoPrisonName])

      const result = await service.getRecallsForPrisoner('A1234BC', 'user1')

      expect(result).toStrictEqual([
        {
          calculationRequestId: 1,
          inPrisonOnRevocationDate: false,
          recallTypeCode: 'FTR_28',
          sentenceIds: [],
          recallUuid: withPrisonName.recallUuid,
          prisonerId: 'A1234BC',
          revocationDate: undefined,
          returnToCustodyDate: undefined,
          recallTypeDescription: '28-day fixed-term',
          source: 'DPS',
          ualAdjustmentTotalDays: undefined,
          createdAtLocationName: 'Kirkham (HMP)',
          createdAtTimestamp: '2021-03-19T13:40:56Z',
          courtCases: [],
          canDelete: true,
          canEdit: true,
        },
        {
          calculationRequestId: 1,
          inPrisonOnRevocationDate: false,
          recallTypeCode: 'FTR_28',
          sentenceIds: [],
          recallUuid: withNoPrisonName.recallUuid,
          prisonerId: 'A1234BC',
          revocationDate: undefined,
          returnToCustodyDate: undefined,
          recallTypeDescription: '28-day fixed-term',
          source: 'DPS',
          ualAdjustmentTotalDays: undefined,
          createdAtLocationName: undefined,
          createdAtTimestamp: '2019-01-18T13:40:56Z',
          courtCases: [],
          canDelete: false,
          canEdit: false,
        },
      ])
    })

    it('should load recalls for prisoner and enrich with court names', async () => {
      const recall = TestData.apiRecall({
        prisonerId: 'A1234BC',
        returnToCustodyDate: '2025-07-04',
        revocationDate: '2025-11-12',
        createdAt: '2021-03-19T13:40:56Z',
        source: 'DPS',
        courtCases: [
          {
            courtCode: 'INNRCC',
            courtCaseReference: undefined,
            courtCaseUuid: undefined,
            sentencingAppearanceDate: undefined,
            sentences: [],
          },
          {
            courtCode: undefined,
            courtCaseReference: 'CC1',
            courtCaseUuid: 'cc1-uuid',
            sentencingAppearanceDate: '2024-04-19',
            sentences: [],
          },
        ],
      })
      remandAndSentencingApiClient.getAllRecalls.mockResolvedValue([recall])

      const result = await service.getRecallsForPrisoner('A1234BC', 'user1')

      expect(result).toStrictEqual([
        {
          calculationRequestId: 1,
          inPrisonOnRevocationDate: false,
          recallTypeCode: 'FTR_28',
          sentenceIds: [],
          recallUuid: recall.recallUuid,
          prisonerId: 'A1234BC',
          revocationDate: '2025-11-12',
          returnToCustodyDate: '2025-07-04',
          recallTypeDescription: '28-day fixed-term',
          source: 'DPS',
          ualAdjustmentTotalDays: undefined,
          createdAtLocationName: undefined,
          createdAtTimestamp: '2021-03-19T13:40:56Z',
          courtCases: [
            {
              courtName: 'Inner London Sessions House Crown Court',
              courtCaseReference: undefined,
              courtCaseUuid: undefined,
              courtCaseDate: undefined,
              sentences: [],
            },
            {
              courtName: undefined,
              courtCaseReference: 'CC1',
              courtCaseUuid: 'cc1-uuid',
              courtCaseDate: '2024-04-19',
              sentences: [],
            },
          ],
          canDelete: true,
          canEdit: true,
        },
      ])
    })

    it('should map sentences with offence description', async () => {
      const sentenceWithMaximum: ApiRecalledSentence = {
        sentenceUuid: uuidv4(),
        offenceCode: 'A1',
        offenceStartDate: '2019-02-25',
        offenceEndDate: '2020-03-30',
        sentenceDate: '2021-04-12',
        lineNumber: '1',
        countNumber: '2',
        periodLengths: [
          {
            years: 1,
            months: 2,
            weeks: 3,
            days: 4,
            periodOrder: 'years',
            periodLengthType: 'SENTENCE_LENGTH',
            legacyData: {
              lifeSentence: false,
              sentenceTermCode: 'foo',
              sentenceTermDescription: 'bar',
            },
            periodLengthUuid: uuidv4(),
          },
        ],
        sentenceServeType: 'CONCURRENT',
        sentenceTypeDescription: 'Serious Offence Sec 250 Sentencing Code (U18)',
      }
      const sentenceWithMinimum: ApiRecalledSentence = {
        sentenceUuid: uuidv4(),
        offenceCode: 'B2',
        offenceStartDate: undefined,
        offenceEndDate: undefined,
        sentenceDate: undefined,
        lineNumber: undefined,
        countNumber: undefined,
        periodLengths: [
          {
            years: undefined,
            months: undefined,
            weeks: undefined,
            days: undefined,
            periodOrder: 'years',
            periodLengthType: 'SENTENCE_LENGTH',
            legacyData: undefined,
            periodLengthUuid: uuidv4(),
          },
        ],
        sentenceServeType: 'CONCURRENT',
        sentenceTypeDescription: undefined,
      }
      const recall = TestData.apiRecall({
        calculationRequestId: 1,
        prisonerId: 'A1234BC',
        returnToCustodyDate: '2025-07-04',
        revocationDate: '2025-11-12',
        createdAt: '2021-03-19T13:40:56Z',
        source: 'DPS',
        inPrisonOnRevocationDate: false,
        courtCases: [
          {
            courtCode: undefined,
            courtCaseReference: 'CC1',
            courtCaseUuid: 'cc1-uuid',
            sentencingAppearanceDate: undefined,
            sentences: [sentenceWithMaximum, sentenceWithMinimum],
          },
        ],
      })
      remandAndSentencingApiClient.getAllRecalls.mockResolvedValue([recall])

      const result = await service.getRecallsForPrisoner('A1234BC', 'user1')

      expect(result).toStrictEqual([
        {
          calculationRequestId: 1,
          recallUuid: recall.recallUuid,
          prisonerId: 'A1234BC',
          revocationDate: '2025-11-12',
          returnToCustodyDate: '2025-07-04',
          inPrisonOnRevocationDate: false,
          recallTypeDescription: '28-day fixed-term',
          source: 'DPS',
          recallTypeCode: 'FTR_28',
          ualAdjustmentTotalDays: undefined,
          createdAtLocationName: undefined,
          createdAtTimestamp: '2021-03-19T13:40:56Z',
          sentenceIds: [sentenceWithMaximum.sentenceUuid, sentenceWithMinimum.sentenceUuid],
          courtCases: [
            {
              courtName: undefined,
              courtCaseReference: 'CC1',
              courtCaseUuid: 'cc1-uuid',
              courtCaseDate: undefined,
              sentences: [
                {
                  ...sentenceWithMaximum,
                  offenceDescription: 'Assault',
                  consecutiveTo: undefined,
                },
                {
                  ...sentenceWithMinimum,
                  offenceDescription: 'Burglary',
                  consecutiveTo: undefined,
                },
              ],
            },
          ],
          canDelete: true,
          canEdit: true,
        },
      ])
    })

    it('should only allow edit and delete for latest recall only and only if it is from DPS', async () => {
      const latest = TestData.apiRecall({
        createdAt: '2021-03-19T13:40:56Z',
        source: 'DPS',
      })
      const middle = TestData.apiRecall({
        createdAt: '2020-02-26T13:40:56Z',
        source: 'DPS',
      })
      const oldest = TestData.apiRecall({
        createdAt: '2019-01-18T13:40:56Z',
        source: 'DPS',
      })
      remandAndSentencingApiClient.getAllRecalls.mockResolvedValue([middle, oldest, latest])

      const result = await service.getRecallsForPrisoner('A1234BC', 'user1')

      expect(result).toStrictEqual([
        TestData.existingRecall({
          recallUuid: latest.recallUuid,
          createdAtTimestamp: '2021-03-19T13:40:56Z',
          source: 'DPS',
          canEdit: true,
          canDelete: true,
        }),
        TestData.existingRecall({
          recallUuid: middle.recallUuid,
          createdAtTimestamp: '2020-02-26T13:40:56Z',
          source: 'DPS',
          canEdit: false,
          canDelete: false,
        }),
        TestData.existingRecall({
          recallUuid: oldest.recallUuid,
          createdAtTimestamp: '2019-01-18T13:40:56Z',
          source: 'DPS',
          canEdit: false,
          canDelete: false,
        }),
      ])
    })

    it('should not allow edit and delete if latest is a NOMIS recall', async () => {
      const latest = TestData.apiRecall({
        createdAt: '2021-03-19T13:40:56Z',
        source: 'NOMIS',
      })
      const oldest = TestData.apiRecall({
        createdAt: '2019-01-18T13:40:56Z',
        source: 'DPS',
      })
      remandAndSentencingApiClient.getAllRecalls.mockResolvedValue([oldest, latest])

      const result = await service.getRecallsForPrisoner('A1234BC', 'user1')

      expect(result).toStrictEqual([
        TestData.existingRecall({
          recallUuid: latest.recallUuid,
          createdAtTimestamp: '2021-03-19T13:40:56Z',
          source: 'NOMIS',
          canEdit: false,
          canDelete: false,
        }),
        TestData.existingRecall({
          recallUuid: oldest.recallUuid,
          createdAtTimestamp: '2019-01-18T13:40:56Z',
          source: 'DPS',
          canEdit: false,
          canDelete: false,
        }),
      ])
    })
    it('should map adjustments information if present', async () => {
      const recallWithUal = TestData.apiRecall({
        createdAt: '2021-03-19T13:40:56Z',
        revocationDate: '2021-01-19',
        returnToCustodyDate: '2021-01-25',
        source: 'DPS',
        ual: { id: uuidv4(), days: 20 },
      })
      const recallWithoutUal = TestData.apiRecall({
        createdAt: '2021-03-18T13:40:56Z',
        revocationDate: '2025-04-29',
        returnToCustodyDate: '2025-05-25',
        source: 'DPS',
        ual: undefined,
      })

      remandAndSentencingApiClient.getAllRecalls.mockResolvedValue([recallWithUal, recallWithoutUal])
      const result = await service.getRecallsForPrisoner('A1234BC', 'user1')

      expect(result.find(it => it.recallUuid === recallWithUal.recallUuid).ualAdjustmentTotalDays).toStrictEqual(20)
      expect(result.find(it => it.recallUuid === recallWithoutUal.recallUuid).ualAdjustmentTotalDays).toBeUndefined()
    })

    it('adds consecutiveTo details to recalled sentences when consecutiveToSentenceUuid is present', async () => {
      // Given
      const sentence: ApiRecalledSentence = {
        sentenceUuid: 'sentence-1',
        offenceCode: 'A1',
        offenceStartDate: undefined,
        offenceEndDate: undefined,
        sentenceDate: undefined,
        lineNumber: undefined,
        countNumber: '1',
        periodLengths: [
          {
            years: undefined,
            months: undefined,
            weeks: undefined,
            days: undefined,
            periodOrder: 'years',
            periodLengthType: 'SENTENCE_LENGTH',
            legacyData: undefined,
            periodLengthUuid: uuidv4(),
          },
        ],
        sentenceServeType: 'CONSECUTIVE',
        sentenceTypeDescription: undefined,
        consecutiveToSentenceUuid: 'sentence-2',
      }

      const recall = TestData.apiRecall({
        prisonerId: 'A1234BC',
        createdAt: '2021-03-19T13:40:56Z',
        source: 'DPS',
        inPrisonOnRevocationDate: false,
        createdByPrison: undefined,
        courtCases: [
          {
            courtCode: 'INNRCC',
            courtCaseReference: 'CC1',
            courtCaseUuid: 'cc1-uuid',
            sentencingAppearanceDate: undefined,
            sentences: [sentence],
          },
        ],
      })

      remandAndSentencingApiClient.getAllRecalls.mockResolvedValue([recall])

      remandAndSentencingApiClient.getConsecutiveToDetails.mockResolvedValue({
        sentences: [
          {
            sentenceUuid: 'sentence-2',
            countNumber: '3',
            offenceCode: 'B2',
            courtCaseReference: 'REF-1',
            courtCode: 'INNRCC',
            appearanceDate: '2023-05-10',
            offenceStartDate: '2023-01-01',
            offenceEndDate: null,
          },
        ],
      })

      // When
      const result = await service.getRecallsForPrisoner('A1234BC', 'user1')

      // Then
      expect(result[0].courtCases[0].sentences[0].consecutiveTo).toEqual({
        countNumber: '3',
        offenceCode: 'B2',
        offenceDescription: 'Burglary',
        courtCaseReference: 'REF-1',
        courtName: 'Inner London Sessions House Crown Court',
        warrantDate: '10/05/2023',
        offenceStartDate: '01/01/2023',
        offenceEndDate: null,
      })
    })

    it('redacts consecutiveTo when consecutive target exists in the same court case', async () => {
      // Given:
      const sentence1 = {
        sentenceUuid: 's1',
        offenceCode: 'A1',
        offenceStartDate: undefined,
        offenceEndDate: undefined,
        sentenceDate: undefined,
        lineNumber: undefined,
        countNumber: '1',
        periodLengths: [],
        sentenceServeType: 'CONCURRENT',
        sentenceTypeDescription: undefined,
      }

      const sentence2 = {
        sentenceUuid: 's2',
        offenceCode: 'B2',
        offenceStartDate: undefined,
        offenceEndDate: undefined,
        sentenceDate: undefined,
        lineNumber: undefined,
        countNumber: '2',
        periodLengths: [],
        sentenceServeType: 'CONSECUTIVE',
        sentenceTypeDescription: undefined,
        consecutiveToSentenceUuid: 's1',
      }

      const recall = TestData.apiRecall({
        prisonerId: 'A1234BC',
        createdAt: '2021-03-19T13:40:56Z',
        source: 'DPS',
        inPrisonOnRevocationDate: false,
        createdByPrison: undefined,
        courtCases: [
          {
            courtCode: 'INNRCC',
            courtCaseReference: 'CC1',
            courtCaseUuid: 'cc1-uuid',
            sentencingAppearanceDate: undefined,
            sentences: [sentence1, sentence2],
          },
        ],
      })

      remandAndSentencingApiClient.getAllRecalls.mockResolvedValue([recall])

      remandAndSentencingApiClient.getConsecutiveToDetails.mockResolvedValue({
        sentences: [
          {
            sentenceUuid: 's1',
            countNumber: '3',
            offenceCode: 'A1',
            courtCaseReference: 'REF-1',
            courtCode: 'INNRCC',
            appearanceDate: '2023-05-10',
            offenceStartDate: '2023-01-01',
            offenceEndDate: null,
          },
        ],
      })

      // When
      const result = await service.getRecallsForPrisoner('A1234BC', 'user1')

      // Then
      const { consecutiveTo } = result[0].courtCases[0].sentences[1]

      expect(consecutiveTo).toEqual({
        countNumber: '3',
        offenceCode: 'A1',
        offenceDescription: 'Assault',
        offenceStartDate: '01/01/2023',
        offenceEndDate: null,
      })

      expect(consecutiveTo).not.toHaveProperty('courtName')
      expect(consecutiveTo).not.toHaveProperty('courtCaseReference')
      expect(consecutiveTo).not.toHaveProperty('warrantDate')
    })

    it('enrichRecalls includes court + offence codes from consecutiveToDetails even when not present on original recall', async () => {
      // Given: recall contains INNRCC + A1 only
      const sentence: ApiRecalledSentence = {
        sentenceUuid: 'sentence-1',
        offenceCode: 'A1',
        offenceStartDate: undefined,
        offenceEndDate: undefined,
        sentenceDate: undefined,
        lineNumber: undefined,
        countNumber: '1',
        periodLengths: [
          {
            years: undefined,
            months: undefined,
            weeks: undefined,
            days: undefined,
            periodOrder: 'years',
            periodLengthType: 'SENTENCE_LENGTH',
            legacyData: undefined,
            periodLengthUuid: uuidv4(),
          },
        ],
        sentenceServeType: 'CONSECUTIVE',
        sentenceTypeDescription: undefined,
        consecutiveToSentenceUuid: 'sentence-2',
      }

      const recall = TestData.apiRecall({
        prisonerId: 'A1234BC',
        createdAt: '2021-03-19T13:40:56Z',
        source: 'DPS',
        inPrisonOnRevocationDate: false,
        createdByPrison: undefined,
        courtCases: [
          {
            courtCode: 'INNRCC',
            courtCaseReference: 'CC1',
            courtCaseUuid: 'cc1-uuid',
            sentencingAppearanceDate: undefined,
            sentences: [sentence],
          },
        ],
      })

      remandAndSentencingApiClient.getAllRecalls.mockResolvedValue([recall])

      remandAndSentencingApiClient.getConsecutiveToDetails.mockResolvedValue({
        sentences: [
          {
            sentenceUuid: 'sentence-2',
            countNumber: '3',
            offenceCode: 'C3',
            courtCaseReference: 'REF-1',
            courtCode: 'NEWCT',
            appearanceDate: '2023-05-10',
            offenceStartDate: '2023-01-01',
            offenceEndDate: null,
          },
        ],
      })

      manageOffencesApiClient.getOffencesByCodes.mockResolvedValue([
        { code: 'A1', description: 'Assault' } as Offence,
        { code: 'C3', description: 'Consecutive offence' } as Offence,
      ])

      courtRegisterApiClient.getCourtDetails.mockResolvedValue([
        {
          courtId: 'INNRCC',
          courtName: 'Inner London Sessions House Crown Court',
          courtDescription: 'Inner London Sessions House Crown Court',
          type: { courtType: 'CC', courtName: 'Crown Court' },
          active: true,
          buildings: [],
        },
        {
          courtId: 'NEWCT',
          courtName: 'New Court Name',
          courtDescription: 'New Court Name',
          type: { courtType: 'CC', courtName: 'Crown Court' },
          active: true,
          buildings: [],
        },
      ])

      // When
      const result = await service.getRecallsForPrisoner('A1234BC', 'user1')

      // Then: enrichRecalls included NEWCT + C3 in lookup calls
      expect(courtRegisterApiClient.getCourtDetails).toHaveBeenCalledWith(
        expect.arrayContaining(['INNRCC', 'NEWCT']),
        'user1',
      )
      expect(manageOffencesApiClient.getOffencesByCodes).toHaveBeenCalledWith(expect.arrayContaining(['A1', 'C3']))

      expect(result[0].courtCases[0].sentences[0].consecutiveTo).toEqual({
        countNumber: '3',
        offenceCode: 'C3',
        offenceDescription: 'Consecutive offence',
        courtCaseReference: 'REF-1',
        courtName: 'New Court Name',
        warrantDate: '10/05/2023',
        offenceStartDate: '01/01/2023',
        offenceEndDate: null,
      })
    })
  })

  describe('getRecallByUuid', () => {
    it('should load recall for prisoner and enrich with prison names if present', async () => {
      const withPrisonName = TestData.apiRecall({
        prisonerId: 'A1234BC',
        createdAt: '2021-03-19T13:40:56Z',
        createdByPrison: 'KMI',
        source: 'DPS',
      })
      remandAndSentencingApiClient.getRecall.mockResolvedValue(withPrisonName)

      const result = await service.getRecall(withPrisonName.recallUuid, 'user1')

      expect(result).toStrictEqual({
        calculationRequestId: 1,
        inPrisonOnRevocationDate: false,
        recallTypeCode: 'FTR_28',
        sentenceIds: [],
        recallUuid: withPrisonName.recallUuid,
        prisonerId: 'A1234BC',
        revocationDate: undefined,
        returnToCustodyDate: undefined,
        recallTypeDescription: '28-day fixed-term',
        source: 'DPS',
        ualAdjustmentTotalDays: undefined,
        createdAtLocationName: 'Kirkham (HMP)',
        createdAtTimestamp: '2021-03-19T13:40:56Z',
        courtCases: [],
        canDelete: false,
        canEdit: false,
      })
    })

    it('should not call prison register api if no prison name', async () => {
      const withNoPrisonName = TestData.apiRecall({
        prisonerId: 'A1234BC',
        createdAt: '2019-01-18T13:40:56Z',
        createdByPrison: undefined,
        source: 'DPS',
      })
      remandAndSentencingApiClient.getRecall.mockResolvedValue(withNoPrisonName)

      const result = await service.getRecall(withNoPrisonName.recallUuid, 'user1')

      expect(result).toStrictEqual({
        calculationRequestId: 1,
        inPrisonOnRevocationDate: false,
        recallTypeCode: 'FTR_28',
        sentenceIds: [],
        recallUuid: withNoPrisonName.recallUuid,
        prisonerId: 'A1234BC',
        revocationDate: undefined,
        returnToCustodyDate: undefined,
        recallTypeDescription: '28-day fixed-term',
        source: 'DPS',
        ualAdjustmentTotalDays: undefined,
        createdAtLocationName: undefined,
        createdAtTimestamp: '2019-01-18T13:40:56Z',
        courtCases: [],
        canDelete: false,
        canEdit: false,
      })
      expect(prisonRegisterApiClient.getPrisonNames).not.toHaveBeenCalled()
    })

    it('should load recall for prisoner and enrich with court names', async () => {
      const recall = TestData.apiRecall({
        prisonerId: 'A1234BC',
        returnToCustodyDate: '2025-07-04',
        revocationDate: '2025-11-12',
        createdAt: '2021-03-19T13:40:56Z',
        source: 'DPS',
        courtCases: [
          {
            courtCode: 'INNRCC',
            courtCaseReference: undefined,
            courtCaseUuid: undefined,
            sentencingAppearanceDate: undefined,
            sentences: [],
          },
          {
            courtCode: undefined,
            courtCaseReference: 'CC1',
            courtCaseUuid: 'cc1-uuid',
            sentencingAppearanceDate: '2024-04-19',
            sentences: [],
          },
        ],
      })
      remandAndSentencingApiClient.getRecall.mockResolvedValue(recall)

      const result = await service.getRecall(recall.recallUuid, 'user1')

      expect(result).toStrictEqual({
        calculationRequestId: 1,
        inPrisonOnRevocationDate: false,
        recallTypeCode: 'FTR_28',
        sentenceIds: [],
        recallUuid: recall.recallUuid,
        prisonerId: 'A1234BC',
        revocationDate: '2025-11-12',
        returnToCustodyDate: '2025-07-04',
        recallTypeDescription: '28-day fixed-term',
        source: 'DPS',
        ualAdjustmentTotalDays: undefined,
        createdAtLocationName: undefined,
        createdAtTimestamp: '2021-03-19T13:40:56Z',
        courtCases: [
          {
            courtName: 'Inner London Sessions House Crown Court',
            courtCaseReference: undefined,
            courtCaseUuid: undefined,
            courtCaseDate: undefined,
            sentences: [],
          },
          {
            courtName: undefined,
            courtCaseReference: 'CC1',
            courtCaseUuid: 'cc1-uuid',
            courtCaseDate: '2024-04-19',
            sentences: [],
          },
        ],
        canDelete: false,
        canEdit: false,
      })
    })

    it('should map sentences with offence description for get recall', async () => {
      const sentenceWithMaximum: ApiRecalledSentence = {
        sentenceUuid: uuidv4(),
        offenceCode: 'A1',
        offenceStartDate: '2019-02-25',
        offenceEndDate: '2020-03-30',
        sentenceDate: '2021-04-12',
        lineNumber: '1',
        countNumber: '2',
        periodLengths: [
          {
            years: 1,
            months: 2,
            weeks: 3,
            days: 4,
            periodOrder: 'years',
            periodLengthType: 'SENTENCE_LENGTH',
            legacyData: {
              lifeSentence: false,
              sentenceTermCode: 'foo',
              sentenceTermDescription: 'bar',
            },
            periodLengthUuid: uuidv4(),
          },
        ],
        sentenceServeType: 'CONCURRENT',
        sentenceTypeDescription: 'Serious Offence Sec 250 Sentencing Code (U18)',
      }
      const sentenceWithMinimum: ApiRecalledSentence = {
        sentenceUuid: uuidv4(),
        offenceCode: 'B2',
        offenceStartDate: undefined,
        offenceEndDate: undefined,
        sentenceDate: undefined,
        lineNumber: undefined,
        countNumber: undefined,
        periodLengths: [
          {
            years: undefined,
            months: undefined,
            weeks: undefined,
            days: undefined,
            periodOrder: 'years',
            periodLengthType: 'SENTENCE_LENGTH',
            legacyData: undefined,
            periodLengthUuid: uuidv4(),
          },
        ],
        sentenceServeType: 'CONCURRENT',
        sentenceTypeDescription: undefined,
      }
      const recall = TestData.apiRecall({
        prisonerId: 'A1234BC',
        returnToCustodyDate: '2025-07-04',
        revocationDate: '2025-11-12',
        createdAt: '2021-03-19T13:40:56Z',
        source: 'DPS',
        courtCases: [
          {
            courtCode: undefined,
            courtCaseReference: 'CC1',
            courtCaseUuid: 'cc1-uuid',
            sentencingAppearanceDate: undefined,
            sentences: [sentenceWithMaximum, sentenceWithMinimum],
          },
        ],
      })
      remandAndSentencingApiClient.getRecall.mockResolvedValue(recall)

      const result = await service.getRecall(recall.recallUuid, 'user1')

      expect(result).toStrictEqual({
        calculationRequestId: 1,
        inPrisonOnRevocationDate: false,
        recallTypeCode: 'FTR_28',
        sentenceIds: [sentenceWithMaximum.sentenceUuid, sentenceWithMinimum.sentenceUuid],
        recallUuid: recall.recallUuid,
        prisonerId: 'A1234BC',
        revocationDate: '2025-11-12',
        returnToCustodyDate: '2025-07-04',
        recallTypeDescription: '28-day fixed-term',
        source: 'DPS',
        ualAdjustmentTotalDays: undefined,
        createdAtLocationName: undefined,
        createdAtTimestamp: '2021-03-19T13:40:56Z',
        courtCases: [
          {
            courtName: undefined,
            courtCaseReference: 'CC1',
            courtCaseUuid: 'cc1-uuid',
            courtCaseDate: undefined,
            sentences: [
              {
                ...sentenceWithMaximum,
                offenceDescription: 'Assault',
                consecutiveTo: undefined,
              },
              {
                ...sentenceWithMinimum,
                offenceDescription: 'Burglary',
                consecutiveTo: undefined,
              },
            ],
          },
        ],
        canDelete: false,
        canEdit: false,
      })
    })

    it('should map UAL if present', async () => {
      const dpsWithRevAndRtcDate = TestData.apiRecall({
        createdAt: '2021-03-19T13:40:56Z',
        revocationDate: '2021-01-19',
        returnToCustodyDate: '2021-01-25',
        source: 'DPS',
        ual: { id: uuidv4(), days: 20 },
      })

      remandAndSentencingApiClient.getRecall.mockResolvedValue(dpsWithRevAndRtcDate)
      const result = await service.getRecall(dpsWithRevAndRtcDate.recallUuid, 'user1')
      expect(result.ualAdjustmentTotalDays).toStrictEqual(20)
    })

    it('should handle no UAL', async () => {
      const dpsWithRevAndRtcDate = TestData.apiRecall({
        createdAt: '2021-03-19T13:40:56Z',
        revocationDate: '2021-01-19',
        returnToCustodyDate: '2021-01-25',
        source: 'DPS',
        ual: undefined,
      })

      remandAndSentencingApiClient.getRecall.mockResolvedValue(dpsWithRevAndRtcDate)
      const result = await service.getRecall(dpsWithRevAndRtcDate.recallUuid, 'user1')
      expect(result.ualAdjustmentTotalDays).toBeUndefined()
    })
  })

  describe('getLatestRevocationDate', () => {
    it('should return the latest revocation date when recalls have revocation dates', async () => {
      const olderRecall = TestData.apiRecall({
        prisonerId: 'A1234BC',
        revocationDate: '2024-01-01',
        source: 'DPS',
      })
      const newerRecall = TestData.apiRecall({
        prisonerId: 'A1234BC',
        revocationDate: '2024-06-15',
        source: 'DPS',
      })

      const recallWithoutRevocationDate = TestData.apiRecall({
        prisonerId: 'A1234BC',
        source: 'NOMIS',
      })

      remandAndSentencingApiClient.getAllRecalls.mockResolvedValue([
        olderRecall,
        newerRecall,
        recallWithoutRevocationDate,
      ])

      const result = await service.getLatestRevocationDate('A1234BC', 'user1')

      expect(result).toEqual(new Date('2024-06-15'))
    })

    it('should exclude the given recall when calculating the latest revocation date', async () => {
      const excludedRecall = TestData.apiRecall({
        prisonerId: 'A1234BC',
        revocationDate: '2024-06-15',
        source: 'DPS',
      })
      const includedRecall = TestData.apiRecall({
        prisonerId: 'A1234BC',
        revocationDate: '2024-03-10',
        source: 'DPS',
      })

      remandAndSentencingApiClient.getAllRecalls.mockResolvedValue([excludedRecall, includedRecall])

      const result = await service.getLatestRevocationDate('A1234BC', 'user1', excludedRecall.recallUuid)

      expect(result).toEqual(new Date('2024-03-10'))
    })
  })

  describe('hasSentences', () => {
    it('should return true if prisoner has any sentences', async () => {
      remandAndSentencingApiClient.hasSentences.mockResolvedValue(true)

      const result = await service.hasSentences('A1234BC', 'user1')

      expect(result).toEqual(true)
    })

    it('should return false if prisoner has no sentences', async () => {
      remandAndSentencingApiClient.hasSentences.mockResolvedValue(false)

      const result = await service.hasSentences('A1234BC', 'user1')

      expect(result).toEqual(false)
    })
  })
})
