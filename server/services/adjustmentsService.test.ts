import type { UAL } from 'models'
import nock from 'nock'
import AdjustmentsService from './adjustmentsService'
import HmppsAuthClient from '../data/hmppsAuthClient'
import config from '../config'
import { CreateResponse } from '../@types/adjustmentsApi/adjustmentsApiTypes'

jest.mock('../data/hmppsAuthClient')

describe('Adjustments Service', () => {
  let fakeAdjustmentsApi: nock.Scope
  let hmppsAuthClient: jest.Mocked<HmppsAuthClient>
  let adjustmentsService: AdjustmentsService

  beforeEach(() => {
    fakeAdjustmentsApi = nock(config.apis.adjustmentsApi.url)
    hmppsAuthClient = new HmppsAuthClient(null) as jest.Mocked<HmppsAuthClient>
    adjustmentsService = new AdjustmentsService(hmppsAuthClient)
  })

  describe('post adjustments', () => {
    it('Should construct post request correctly when creating an adjustment', async () => {
      const username = 'A1234BC'
      const ual: UAL = {
        recallId: 'recallId',
        nomisId: 'nomidId',
        bookingId: 1,
        firstDay: new Date('2024-01-01'),
        lastDay: new Date('2024-01-02'),
      }
      fakeAdjustmentsApi
        .post('/adjustments', [
          {
            bookingId: ual.bookingId,
            adjustmentType: 'UNLAWFULLY_AT_LARGE',
            person: ual.nomisId,
            toDate: '2024-01-02',
            fromDate: '2024-01-01',
            days: ual.days,
            unlawfullyAtLarge: {
              type: 'RECALL',
            },
          },
        ])
        .reply(200, { adjustmentIds: ['123'] } as CreateResponse)

      const adjustment = await adjustmentsService.postUal(ual, username)
      expect(adjustment.adjustmentIds).toEqual(['123'])
    })
  })
})
