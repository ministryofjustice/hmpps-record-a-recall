import type { Express } from 'express'
import request from 'supertest'
import { appWithAllRoutes, user } from './testutils/appSetup'
import AuditService, { Page } from '../services/auditService'

jest.mock('../services/auditService')

const auditService = new AuditService(null) as jest.Mocked<AuditService>

let app: Express

beforeEach(() => {
  app = appWithAllRoutes({
    services: {
      auditService,
    },
    userSupplier: () => user,
  })
})

afterEach(() => {
  jest.resetAllMocks()
})

describe('GET /person/:nomsId/recall-entry/enter-dates', () => {
  it('should render enter-dates page and log page view', () => {
    auditService.logPageView.mockResolvedValue(null)

    return request(app)
      .get('/person/123/recall-entry/enter-dates')
      .expect('Content-Type', /html/)
      .expect(res => {
        expect(res.text).toContain('Enter the recall dates') // Adjust the expected text as per your template
        expect(auditService.logPageView).toHaveBeenCalledWith(Page.ENTER_RECALL_DATES, {
          who: user.username,
          correlationId: expect.any(String),
        })
      })
  })
})
