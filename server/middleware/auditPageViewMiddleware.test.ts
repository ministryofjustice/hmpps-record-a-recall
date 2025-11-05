import type { Express } from 'express'
import request from 'supertest'
import createError from 'http-errors'
import { appWithAllRoutes, user } from '../routes/testutils/appSetup'
import AuditService, { Page } from '../services/auditService'
import PrisonerSearchService from '../services/prisonerSearchService'
import CourtCasesReleaseDatesService from '../services/courtCasesReleaseDatesService'
import RecallService from '../services/recallService'
import TestData from '../testutils/testData'

jest.mock('../services/auditService')
jest.mock('../services/courtCasesReleaseDatesService')
jest.mock('../services/prisonerSearchService')
jest.mock('../services/recallService')

const auditService = new AuditService(null) as jest.Mocked<AuditService>
const courtCasesReleaseDatesService = new CourtCasesReleaseDatesService(
  null,
) as jest.Mocked<CourtCasesReleaseDatesService>
const prisonerSearchService = new PrisonerSearchService(null) as jest.Mocked<PrisonerSearchService>
const recallService = new RecallService(null, null, null, null) as jest.Mocked<RecallService>

let app: Express
const nomsId = 'A1234BC'

beforeEach(() => {
  app = appWithAllRoutes({
    services: {
      auditService,
      courtCasesReleaseDatesService,
      prisonerSearchService,
      recallService,
    },
  })
  prisonerSearchService.getPrisonerDetails.mockResolvedValue(TestData.prisoner({ prisonerNumber: nomsId }))
  courtCasesReleaseDatesService.getServiceDefinitions.mockResolvedValue(TestData.serviceDefinitions())
  recallService.getRecallsForPrisoner.mockResolvedValue([])
})

afterEach(() => {
  jest.resetAllMocks()
})

describe('auditPageViewMiddleware', () => {
  it('should only log page view event on successful access', async () => {
    const response = await request(app).get(`/person/${nomsId}`)

    expect(response.status).toEqual(200)
    expect(auditService.logPageView).toHaveBeenCalledWith(Page.HOME, {
      who: user.username,
      correlationId: expect.any(String),
      subjectId: nomsId,
      subjectType: 'PERSON',
      details: {
        url: `/person/${nomsId}`,
        statusCode: 200,
        prisonNumber: nomsId,
      },
    })
    expect(auditService.logAuditEvent).not.toHaveBeenCalled()
  })

  it('should log forbidden access event on failed access', async () => {
    recallService.getRecallsForPrisoner.mockRejectedValue(createError.NotFound())

    const response = await request(app).get(`/person/${nomsId}`)

    expect(response.status).toEqual(404)
    expect(auditService.logPageView).not.toHaveBeenCalled()
    expect(auditService.logAuditEvent).toHaveBeenCalledWith({
      who: user.username,
      correlationId: expect.any(String),
      subjectId: 'A1234BC',
      subjectType: 'PERSON',
      what: 'UNAUTHORISED_PAGE_VIEW',
      details: {
        prisonNumber: 'A1234BC',
        statusCode: 404,
        url: `/person/${nomsId}`,
        page: 'HOME',
      },
    })
  })

  it('should log failed access event on server error', async () => {
    recallService.getRecallsForPrisoner.mockRejectedValue(createError.InternalServerError())

    const response = await request(app).get(`/person/${nomsId}`)

    expect(response.status).toEqual(500)
    expect(auditService.logPageView).not.toHaveBeenCalled()
    expect(auditService.logAuditEvent).toHaveBeenCalledWith({
      who: user.username,
      correlationId: expect.any(String),
      subjectId: 'A1234BC',
      subjectType: 'PERSON',
      what: 'FAILED_PAGE_VIEW',
      details: {
        prisonNumber: 'A1234BC',
        statusCode: 500,
        url: `/person/${nomsId}`,
        page: 'HOME',
      },
    })
  })
})
