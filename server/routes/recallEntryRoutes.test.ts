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

describe('GET /person/:nomsId/recall-entry/enter-recall-date', () => {
  it('should render enter-dates page and log page view', () => {
    auditService.logPageView.mockResolvedValue(null)

    return request(app)
      .get('/person/123/recall-entry/enter-recall-date')
      .expect('Content-Type', /html/)
      .expect(res => {
        expect(res.text).toContain('What is the recall date for this person?')
        expect(auditService.logPageView).toHaveBeenCalledWith(Page.ENTER_RECALL_DATE, {
          who: user.username,
          correlationId: expect.any(String),
        })
      })
  })
})

describe('GET /person/:nomsId/recall-entry/enter-return-to-custody-date', () => {
  it('should render enter-dates page and log page view', () => {
    auditService.logPageView.mockResolvedValue(null)

    return request(app)
      .get('/person/123/recall-entry/enter-return-to-custody-date')
      .expect('Content-Type', /html/)
      .expect(res => {
        expect(res.text).toContain('What date was this person returned to custody?')
        expect(auditService.logPageView).toHaveBeenCalledWith(Page.ENTER_RETURN_TO_CUSTODY_DATE, {
          who: user.username,
          correlationId: expect.any(String),
        })
      })
  })
})
