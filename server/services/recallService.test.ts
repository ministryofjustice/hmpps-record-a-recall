import nock from 'nock'
import RecallService from './recallService'
import HmppsAuthClient from '../data/hmppsAuthClient'
import config from '../config'
import {
  ApiRecall,
  CreateRecall,
  CreateRecallResponse,
} from '../@types/remandAndSentencingApi/remandAndSentencingTypes'

import { RecallTypes } from '../@types/recallTypes'
import { formatDate } from '../utils/utils'

jest.mock('../data/hmppsAuthClient')

describe('Recall service', () => {
  let fakeRemandAndSentencingApi: nock.Scope
  let hmppsAuthClient: jest.Mocked<HmppsAuthClient>
  let recallService: RecallService

  beforeEach(() => {
    fakeRemandAndSentencingApi = nock(config.apis.remandAndSentencingApi.url)
    hmppsAuthClient = new HmppsAuthClient(null) as jest.Mocked<HmppsAuthClient>
    recallService = new RecallService(hmppsAuthClient)
  })

  describe('createRecall', () => {
    it('Should construct post request correctly when creating a recall', async () => {
      const nomsId = 'A1234BC'
      const recallToCreate: CreateRecall = {
        prisonerId: nomsId,
        revocationDate: formatDate(new Date(2024, 0, 1)),
        returnToCustodyDate: formatDate(new Date(2024, 3, 2)),
        recallTypeCode: 'LR',
        createdByUsername: 'user11',
        createdByPrison: 'HMI',
      }

      fakeRemandAndSentencingApi
        .post('/recall', {
          prisonerId: nomsId,
          revocationDate: '2024-01-01',
          returnToCustodyDate: '2024-04-02',
          recallTypeCode: 'LR',
          createdByUsername: 'user11',
          createdByPrison: 'HMI',
        })
        .reply(200, { recallUuid: 'uuid-returned' } as CreateRecallResponse)

      const recall = await recallService.postRecall(recallToCreate, 'user11')

      expect(recall.recallUuid).toEqual('uuid-returned')
    })
  })

  describe('getAllRecalls', () => {
    it('Should return all recalls from api correctly', async () => {
      const nomsId = 'A1234BC'

      fakeRemandAndSentencingApi.get(`/recall/person/${nomsId}`).reply(200, [
        {
          recallUuid: '1234567',
          prisonerId: 'ABC12345',
          revocationDate: '2023-06-15',
          returnToCustodyDate: '2023-06-20',
          recallType: 'FTR_14',
          createdAt: '2023-06-10T14:30:00Z',
          createdByUsername: 'johndoe',
          createdByPrison: 'HMI',
          sentences: [{ sentenceUuid: '123ABC' }],
          courtCaseIds: ['CASE1'],
        } as ApiRecall,
      ])

      const recalls = await recallService.getAllRecalls(nomsId, 'user001')

      expect(recalls).toEqual([
        {
          recallId: '1234567',
          revocationDate: new Date('2023-06-15T00:00:00.000Z'),
          returnToCustodyDate: new Date('2023-06-20T00:00:00.000Z'),
          recallType: RecallTypes.FOURTEEN_DAY_FIXED_TERM_RECALL,
          ual: 4,
          ualString: '4 days',
          createdAt: '2023-06-10T14:30:00Z',
          location: 'HMI',
          sentenceIds: ['123ABC'],
          courtCaseIds: ['CASE1'],
        },
      ])
    })
  })
})
