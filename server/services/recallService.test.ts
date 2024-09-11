import type { DateForm } from 'forms'
import nock from 'nock'
import type { Recall } from 'models'
import RecallService from './recallService'
import HmppsAuthClient from '../data/hmppsAuthClient'
import config from '../config'
import { RecallTypes } from '../@types/refData'
import { ApiRecall, CreateRecallResponse } from '../@types/remandAndSentencingApi/remandAndSentencingTypes'
import {
  CalculatedReleaseDates,
  CalculationBreakdown,
} from '../@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'

jest.mock('../data/hmppsAuthClient')

interface MockSession {
  recalls: { [key: string]: { recallDate?: Date } }
}

describe('Recall service', () => {
  let fakeRemandAndSentencingApi: nock.Scope
  let fakeCalculateReleaseDatesApi: nock.Scope
  let hmppsAuthClient: jest.Mocked<HmppsAuthClient>
  let recallService: RecallService

  beforeEach(() => {
    fakeRemandAndSentencingApi = nock(config.apis.remandAndSentencingApi.url)
    fakeCalculateReleaseDatesApi = nock(config.apis.calculateReleaseDatesApi.url)
    hmppsAuthClient = new HmppsAuthClient(null) as jest.Mocked<HmppsAuthClient>
    recallService = new RecallService(hmppsAuthClient)
  })

  describe('setRecallDate', () => {
    it('should set the recall date correctly in the session', () => {
      const session: MockSession = {
        recalls: {},
      }

      const nomsId = 'A1234BC'
      const recallDateForm: DateForm = {
        day: '01',
        month: '02',
        year: '2023',
      }

      recallService.setRecallDate(session, nomsId, recallDateForm)

      expect(session.recalls[nomsId].recallDate).toEqual(new Date(2023, 1, 1))
    })
  })

  describe('createRecall', () => {
    it('Should construct post request correctly when creating a recall', async () => {
      const nomsId = 'A1234BC'
      const session: MockSession = {
        recalls: {
          [nomsId]: {
            recallDate: new Date(2024, 0, 1),
            returnToCustodyDate: new Date(2024, 3, 2),
            recallType: Object.values(RecallTypes).find(it => it.code === 'STANDARD_RECALL'),
          } as Recall,
        },
      }

      fakeRemandAndSentencingApi
        .post('/recall', {
          prisonerId: nomsId,
          recallDate: '2024-01-01',
          returnToCustodyDate: '2024-04-02',
          recallType: 'STANDARD_RECALL',
          createdByUsername: 'user11',
        })
        .reply(200, { recallUuid: 'uuid-returned' } as CreateRecallResponse)

      const recall = await recallService.createRecall(session, nomsId, 'user11')

      expect(recall.recallUuid).toEqual('uuid-returned')
    })
  })

  describe('calculateReleaseDatesAndSetInSession', () => {
    it('Should construct post request correctly when creating a recall', async () => {
      const nomsId = 'A1234BC'
      const session: MockSession = {
        recalls: {},
      }

      const calculationResults = { calculationRequestId: 'uuid-returned' } as unknown as CalculatedReleaseDates
      fakeCalculateReleaseDatesApi.post(`/calculation/record-a-recall/${nomsId}`).reply(200, calculationResults)

      await recallService.calculateReleaseDatesAndSetInSession(session, 'user11', nomsId)
      const recall = recallService.getRecall(session, nomsId)

      expect(recall.calculation).toEqual(calculationResults)
      // Second call should not trigger another API request
      await recallService.calculateReleaseDatesAndSetInSession(session, 'user11', nomsId)

      // Ensure that no further API calls were made
      expect(fakeCalculateReleaseDatesApi.isDone()).toBe(true)
    })
  })

  describe('getAllRecalls', () => {
    it('Should return all recalls from api correctly', async () => {
      const nomsId = 'A1234BC'

      fakeRemandAndSentencingApi.get(`/recall/person/${nomsId}`).reply(200, [
        {
          recallUniqueIdentifier: '1234567',
          prisonerId: 'ABC12345',
          recallDate: '2023-06-15',
          returnToCustodyDate: '2023-06-20',
          recallType: 'FOURTEEN_DAY_FIXED_TERM_RECALL',
          createdAt: '2023-06-10T14:30:00Z',
          createdByUsername: 'johndoe',
        } as ApiRecall,
      ])

      const recalls = await recallService.getAllRecalls(nomsId, 'user001')

      expect(recalls).toEqual([
        {
          recallDate: new Date('2023-06-15T00:00:00.000Z'),
          returnToCustodyDate: new Date('2023-06-20T00:00:00.000Z'),
          recallType: RecallTypes.FOURTEEN_DAY_FIXED_TERM_RECALL,
        },
      ])
    })
  })
  describe('groupSentencesByRecallDate', () => {
    it('should group sentences based on recall date - expired sentences', async () => {
      const username = 'user'

      recallService.getCalculationBreakdown = jest.fn().mockResolvedValue({
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
            caseReference: '12345',
          },
        ],
        consecutiveSentence: undefined,
        breakdownByReleaseDateType: {},
        otherDates: {},
        ersedNotApplicableDueToDtoLaterThanCrd: false,
      } as CalculationBreakdown)

      const result = await recallService.groupSentencesByRecallDate(username, {
        recallDate: new Date(2024, 1, 1),
      } as Recall)

      expect(result).toEqual([
        {
          caseSequence: 1,
          sentences: {
            onLicenceSentences: [],
            activeSentences: [],
            expiredSentences: [
              {
                lineSequence: 1,
                caseSequence: 1,
                sentencedAt: '2022-01-01',
                sentenceLength: '2 years',
                consecutiveTo: null,
                crd: '2024-01-01',
                sled: '2023-12-01',
              },
            ],
          },
        },
      ])
    })

    it('should group sentences based on recall date - on licence sentences', async () => {
      const username = 'user'

      recallService.getCalculationBreakdown = jest.fn().mockResolvedValue({
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
            caseReference: '12345',
          },
        ],
        consecutiveSentence: undefined,
        breakdownByReleaseDateType: {},
        otherDates: {},
        ersedNotApplicableDueToDtoLaterThanCrd: false,
      } as CalculationBreakdown)

      const result = await recallService.groupSentencesByRecallDate(username, {
        recallDate: new Date(2024, 3, 1),
      } as Recall)

      expect(result).toEqual([
        {
          caseSequence: 1,
          sentences: {
            onLicenceSentences: [
              {
                lineSequence: 1,
                caseSequence: 1,
                sentencedAt: '2022-01-01',
                sentenceLength: '2 years',
                consecutiveTo: null,
                crd: '2024-01-01',
                sled: '2024-06-01',
              },
            ],
            activeSentences: [],
            expiredSentences: [],
          },
        },
      ])
    })

    it('should group sentences based on recall date - active sentences', async () => {
      const username = 'user'

      recallService.getCalculationBreakdown = jest.fn().mockResolvedValue({
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
            caseReference: '12345',
          },
        ],
        consecutiveSentence: undefined,
        breakdownByReleaseDateType: {},
        otherDates: {},
        ersedNotApplicableDueToDtoLaterThanCrd: false,
      } as CalculationBreakdown)

      const result = await recallService.groupSentencesByRecallDate(username, {
        recallDate: new Date(2023, 11, 15),
      } as Recall)

      expect(result).toEqual([
        {
          caseSequence: 1,
          sentences: {
            onLicenceSentences: [],
            activeSentences: [
              {
                lineSequence: 1,
                caseSequence: 1,
                sentencedAt: '2022-01-01',
                sentenceLength: '2 years',
                consecutiveTo: null,
                crd: '2024-01-01',
                sled: '2024-03-01',
              },
            ],
            expiredSentences: [],
          },
        },
      ])
    })

    it('should group sentences based on recall date - mixed sentence types', async () => {
      const username = 'user'

      recallService.getCalculationBreakdown = jest.fn().mockResolvedValue({
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
            caseReference: '67890',
          },
        ],
        consecutiveSentence: undefined,
        breakdownByReleaseDateType: {},
        otherDates: {},
        ersedNotApplicableDueToDtoLaterThanCrd: false,
      } as CalculationBreakdown)

      const result = await recallService.groupSentencesByRecallDate(username, {
        recallDate: new Date(2024, 2, 15),
      } as Recall)

      expect(result).toEqual([
        {
          caseSequence: 1,
          sentences: {
            activeSentences: [],
            expiredSentences: [],
            onLicenceSentences: [
              {
                caseSequence: 1,
                consecutiveTo: null,
                crd: '2024-01-01',
                lineSequence: 1,
                sentenceLength: '2 years',
                sentencedAt: '2022-01-01',
                sled: '2024-04-01',
              },
            ],
          },
        },
        {
          caseSequence: 2,
          sentences: {
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
              },
            ],
            onLicenceSentences: [],
          },
        },
      ])
    })

    it('should handle cases where there are no eligible sentences', async () => {
      const username = 'user'

      recallService.getCalculationBreakdown = jest.fn().mockResolvedValue({
        concurrentSentences: [],
        consecutiveSentence: undefined,
        breakdownByReleaseDateType: {},
        otherDates: {},
        ersedNotApplicableDueToDtoLaterThanCrd: false,
      } as CalculationBreakdown)

      const result = await recallService.groupSentencesByRecallDate(username, {
        recallDate: new Date(2024, 2, 15),
      } as Recall)

      expect(result).toEqual([])
    })
  })
})
