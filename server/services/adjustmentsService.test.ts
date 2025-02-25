import nock from 'nock'
import AdjustmentsService from './adjustmentsService'
import HmppsAuthClient from '../data/hmppsAuthClient'
import config from '../config'
import { CreateResponse, AdjustmentDto } from '../@types/adjustmentsApi/adjustmentsApiTypes'

import { formatDate } from '../utils/utils'

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
      const adjustmentToCreate: AdjustmentDto = {
        id: '123',
        bookingId: 1,
        person: 'change',
        adjustmentType: 'REMAND', // | "TAGGED_BAIL" | "UNLAWFULLY_AT_LARGE" | "LAWFULLY_AT_LARGE" | "ADDITIONAL_DAYS_AWARDED" | "RESTORATION_OF_ADDITIONAL_DAYS_AWARDED" | "SPECIAL_REMISSION" | "UNUSED_DEDUCTIONS" | "CUSTODY_ABROAD" | "APPEAL_APPLICANT";
        toDate: '2024-01-01',
        fromDate: '2024-01-02',
        days: 5,
        // remand?: components["schemas"]["RemandDto"];
        // additionalDaysAwarded?: components["schemas"]["AdditionalDaysAwardedDto"];
        // unlawfullyAtLarge?: components["schemas"]["UnlawfullyAtLargeDto"];
        // lawfullyAtLarge?: components["schemas"]["LawfullyAtLargeDto"];
        // specialRemission?: components["schemas"]["SpecialRemissionDto"];
        // taggedBail?: components["schemas"]["TaggedBailDto"];
        // timeSpentInCustodyAbroad?: components["schemas"]["TimeSpentInCustodyAbroadDto"];
        // timeSpentAsAnAppealApplicant?: components["schemas"]["TimeSpentAsAnAppealApplicantDto"];
        // sentenceSequence?: number;

        // readonly adjustmentTypeText?: string;
        // readonly adjustmentArithmeticType?: "ADDITION" | "DEDUCTION" | "NONE";
        // readonly prisonName?: string;
        // readonly prisonId?: string;
        // readonly lastUpdatedBy?: string;
        // readonly status?: "ACTIVE" | "INACTIVE" | "DELETED" | "INACTIVE_WHEN_DELETED";
        // readonly lastUpdatedDate?: string;
        // readonly createdDate?: string
        // readonly effectiveDays?: number;
        // readonly source?: "NOMIS" | "DPS";
      }
      fakeAdjustmentsApi
        .post('/adjustments', {
          id: '123',
          bookingId: 1,
          person: 'change',
          adjustmentType: 'REMAND',
          toDate: '2024-01-01',
          fromDate: '2024-01-02',
          days: 5,
        })
        .reply(200, { adjustmentIds: ['123'] } as CreateResponse)

      const adjustment = await adjustmentsService.postAdjustments(adjustmentToCreate, username)
      expect(adjustment.adjustmentIds).toEqual(['123'])
    })
  })
})
