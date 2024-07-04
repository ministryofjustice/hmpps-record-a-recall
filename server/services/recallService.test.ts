import type { DateForm } from 'forms'
import nock from 'nock'
import type { Recall } from 'models'
import RecallService from './recallService'
import HmppsAuthClient from '../data/hmppsAuthClient'
import config from '../config'
import { RecallTypes } from '../@types/refData'
import { ApiRecall, CreateRecallResponse } from '../@types/remandAndSentencingApi/remandAndSentencingTypes'

jest.mock('../data/hmppsAuthClient')

interface MockSession {
  recalls: { [key: string]: { recallDate?: Date } }
}

describe('Recall service', () => {
  let fakeRemandAndSentencingApi: nock.Scope
  let hmppsAuthClient: jest.Mocked<HmppsAuthClient>
  let recallService: RecallService

  beforeEach(() => {
    fakeRemandAndSentencingApi = nock(config.apis.remandAndSentencingApi.url)
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
})
