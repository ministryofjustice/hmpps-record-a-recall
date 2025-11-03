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
import AdjustmentsApiClient from '../data/adjustmentsApiClient'
import { AdjustmentDto } from '../@types/adjustmentsApi/adjustmentsApiTypes'

jest.mock('../data/remandAndSentencingApiClient')
jest.mock('../data/manageOffencesApiClient')
jest.mock('../data/prisonRegisterApiClient')
jest.mock('../data/courtRegisterApiClient')
jest.mock('../data/adjustmentsApiClient')

const remandAndSentencingApiClient = new RemandAndSentencingApiClient(null) as jest.Mocked<RemandAndSentencingApiClient>
const manageOffencesApiClient = new ManageOffencesApiClient(null) as jest.Mocked<ManageOffencesApiClient>
const prisonRegisterApiClient = new PrisonRegisterApiClient(null) as jest.Mocked<PrisonRegisterApiClient>
const courtRegisterApiClient = new CourtRegisterApiClient(null) as jest.Mocked<CourtRegisterApiClient>
const adjustmentApiClient = new AdjustmentsApiClient(null) as jest.Mocked<AdjustmentsApiClient>

let service: RecallService

beforeEach(() => {
  jest.resetAllMocks()
  service = new RecallService(
    remandAndSentencingApiClient,
    manageOffencesApiClient,
    prisonRegisterApiClient,
    courtRegisterApiClient,
    adjustmentApiClient,
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
  adjustmentApiClient.getAdjustmentsForRecall.mockResolvedValue([])
})

describe('Recall service', () => {
  describe('getRecallableCourtCases', () => {
    it('adds offenceDescription to recallable and non-recallable sentences', async () => {
      // Given
      remandAndSentencingApiClient.getRecallableCourtCases.mockResolvedValue({
        cases: [
          {
            courtCaseUuid: 'cc-1',
            sentences: [
              { offenceCode: 'A1', isRecallable: true },
              { offenceCode: 'B2', isRecallable: false },
            ],
          } as RecallableCourtCase,
        ],
      })

      // When
      const result = await service.getRecallableCourtCases('A1234BC')

      // Then
      expect(manageOffencesApiClient.getOffencesByCodes).toHaveBeenCalledWith(['A1', 'B2'])
      expect(result).toHaveLength(1)

      const [courtCase] = result
      expect(courtCase.recallableSentences[0].offenceDescription).toBe('Assault')
      expect(courtCase.nonRecallableSentences[0].offenceDescription).toBe('Burglary')
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
            sentencingAppearanceDate: undefined,
            sentences: [],
          },
          {
            courtCode: undefined,
            courtCaseReference: 'CC1',
            sentencingAppearanceDate: '2024-04-19',
            sentences: [],
          },
        ],
      })
      remandAndSentencingApiClient.getAllRecalls.mockResolvedValue([recall])

      const result = await service.getRecallsForPrisoner('A1234BC', 'user1')

      expect(result).toStrictEqual([
        {
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
              courtCaseDate: undefined,
              sentences: [],
            },
            {
              courtName: undefined,
              courtCaseReference: 'CC1',
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
        prisonerId: 'A1234BC',
        returnToCustodyDate: '2025-07-04',
        revocationDate: '2025-11-12',
        createdAt: '2021-03-19T13:40:56Z',
        source: 'DPS',
        courtCases: [
          {
            courtCode: undefined,
            courtCaseReference: 'CC1',
            sentencingAppearanceDate: undefined,
            sentences: [sentenceWithMaximum, sentenceWithMinimum],
          },
        ],
      })
      remandAndSentencingApiClient.getAllRecalls.mockResolvedValue([recall])

      const result = await service.getRecallsForPrisoner('A1234BC', 'user1')

      expect(result).toStrictEqual([
        {
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
              courtCaseDate: undefined,
              sentences: [
                {
                  ...sentenceWithMaximum,
                  offenceDescription: 'Assault',
                },
                {
                  ...sentenceWithMinimum,
                  offenceDescription: 'Burglary',
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
    it('should fetch adjustments for all DPS recalls with a revocation date and return to custody date', async () => {
      const dpsWithRevAndRtcDate = TestData.apiRecall({
        createdAt: '2021-03-19T13:40:56Z',
        revocationDate: '2021-01-19',
        returnToCustodyDate: '2021-01-25',
        source: 'DPS',
      })
      const anotherDpsWithRevAndRtcDate = TestData.apiRecall({
        createdAt: '2021-03-18T13:40:56Z',
        revocationDate: '2025-04-29',
        returnToCustodyDate: '2025-05-25',
        source: 'DPS',
      })
      const dpsWithRevDateOnly = TestData.apiRecall({
        createdAt: '2021-03-17T13:40:56Z',
        revocationDate: '2020-02-15',
        returnToCustodyDate: undefined,
        source: 'DPS',
      })
      const nomisWithNeitherDate = TestData.apiRecall({
        createdAt: '2021-03-16T13:40:56Z',
        revocationDate: undefined,
        returnToCustodyDate: undefined,
        source: 'NOMIS',
      })
      remandAndSentencingApiClient.getAllRecalls.mockResolvedValue([
        dpsWithRevAndRtcDate,
        anotherDpsWithRevAndRtcDate,
        dpsWithRevDateOnly,
        nomisWithNeitherDate,
      ])
      adjustmentApiClient.getAdjustmentsForRecall.mockImplementation(
        (_prisonerId: string, recallId: string, _username: string) => {
          if (recallId === dpsWithRevAndRtcDate.recallUuid) {
            return Promise.resolve([
              {
                recallId: dpsWithRevAndRtcDate.recallUuid,
                days: 12,
              },
              {
                recallId: dpsWithRevAndRtcDate.recallUuid,
                days: 8,
              },
            ] as AdjustmentDto[])
          }
          if (recallId === anotherDpsWithRevAndRtcDate.recallUuid) {
            return Promise.resolve([
              {
                recallId: anotherDpsWithRevAndRtcDate.recallUuid,
                days: 5,
              },
            ] as AdjustmentDto[])
          }
          return Promise.resolve([] as AdjustmentDto[])
        },
      )
      const result = await service.getRecallsForPrisoner('A1234BC', 'user1')

      expect(result.find(it => it.recallUuid === dpsWithRevAndRtcDate.recallUuid).ualAdjustmentTotalDays).toStrictEqual(
        20,
      )
      expect(
        result.find(it => it.recallUuid === anotherDpsWithRevAndRtcDate.recallUuid).ualAdjustmentTotalDays,
      ).toStrictEqual(5)
      expect(result.find(it => it.recallUuid === dpsWithRevDateOnly.recallUuid).ualAdjustmentTotalDays).toBeUndefined()
      expect(
        result.find(it => it.recallUuid === nomisWithNeitherDate.recallUuid).ualAdjustmentTotalDays,
      ).toBeUndefined()

      expect(adjustmentApiClient.getAdjustmentsForRecall).toHaveBeenCalledTimes(2)
      expect(adjustmentApiClient.getAdjustmentsForRecall).toHaveBeenNthCalledWith(
        1,
        'A1234BC',
        dpsWithRevAndRtcDate.recallUuid,
        'user1',
      )
      expect(adjustmentApiClient.getAdjustmentsForRecall).toHaveBeenNthCalledWith(
        2,
        'A1234BC',
        anotherDpsWithRevAndRtcDate.recallUuid,
        'user1',
      )
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
            sentencingAppearanceDate: undefined,
            sentences: [],
          },
          {
            courtCode: undefined,
            courtCaseReference: 'CC1',
            sentencingAppearanceDate: '2024-04-19',
            sentences: [],
          },
        ],
      })
      remandAndSentencingApiClient.getRecall.mockResolvedValue(recall)

      const result = await service.getRecall(recall.recallUuid, 'user1')

      expect(result).toStrictEqual({
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
            courtCaseDate: undefined,
            sentences: [],
          },
          {
            courtName: undefined,
            courtCaseReference: 'CC1',
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
            sentencingAppearanceDate: undefined,
            sentences: [sentenceWithMaximum, sentenceWithMinimum],
          },
        ],
      })
      remandAndSentencingApiClient.getRecall.mockResolvedValue(recall)

      const result = await service.getRecall(recall.recallUuid, 'user1')

      expect(result).toStrictEqual({
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
            courtCaseDate: undefined,
            sentences: [
              {
                ...sentenceWithMaximum,
                offenceDescription: 'Assault',
              },
              {
                ...sentenceWithMinimum,
                offenceDescription: 'Burglary',
              },
            ],
          },
        ],
        canDelete: false,
        canEdit: false,
      })
    })
    it('should fetch adjustments if a DPS recall with revocation date and return to custody date', async () => {
      const dpsWithRevAndRtcDate = TestData.apiRecall({
        createdAt: '2021-03-19T13:40:56Z',
        revocationDate: '2021-01-19',
        returnToCustodyDate: '2021-01-25',
        source: 'DPS',
      })

      remandAndSentencingApiClient.getRecall.mockResolvedValue(dpsWithRevAndRtcDate)
      adjustmentApiClient.getAdjustmentsForRecall.mockResolvedValue([
        {
          recallId: dpsWithRevAndRtcDate.recallUuid,
          days: 12,
        },
        {
          recallId: dpsWithRevAndRtcDate.recallUuid,
          days: 8,
        },
      ] as AdjustmentDto[])
      const result = await service.getRecall(dpsWithRevAndRtcDate.recallUuid, 'user1')

      expect(result.ualAdjustmentTotalDays).toStrictEqual(20)
    })
  })
})
