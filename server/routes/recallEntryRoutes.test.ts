import type { Express } from 'express'
import request from 'supertest'
import { appWithAllRoutes, user } from './testutils/appSetup'
import AuditService, { Page } from '../services/auditService'
import PrisonerService from '../services/prisonerService'
import { AnalysedSentenceAndOffence } from '../@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'

jest.mock('../services/auditService')
jest.mock('../services/prisonerService')

const auditService = new AuditService(null) as jest.Mocked<AuditService>
const prisonerService = new PrisonerService(null) as jest.Mocked<PrisonerService>

let app: Express

beforeEach(() => {
  app = appWithAllRoutes({
    services: {
      auditService,
      prisonerService,
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

describe('GET /person/:nomsId/recall-entry/check-sentences', () => {
  it('should render check-sentences page and log page view', () => {
    auditService.logPageView.mockResolvedValue(null)
    prisonerService.getActiveAnalyzedSentencesAndOffences.mockResolvedValue([
      {
        caseReference: 'TS001',
        sentenceTypeDescription: 'EDS Sentence',
        sentenceDate: '2023-01-01',
        offence: { offenceCode: 'OF1', offenceDescription: 'Offence X' },
      } as AnalysedSentenceAndOffence,
    ])

    return request(app)
      .get('/person/123/recall-entry/check-sentences')
      .expect('Content-Type', /html/)
      .expect(res => {
        expect(res.text).toContain('TS001</h2>')
        expect(res.text).toMatch(/Sentence Type\s*<\/dt>\s*<dd class="govuk-summary-list__value">\s*EDS Sentence/)
        expect(res.text).toMatch(/Sentence Date\s*<\/dt>\s*<dd class="govuk-summary-list__value">\s*2023-01-01/)
        expect(res.text).toMatch(/Offence\s*<\/dt>\s*<dd class="govuk-summary-list__value">\s*OF1 Offence X/)
        expect(auditService.logPageView).toHaveBeenCalledWith(Page.CHECK_SENTENCES, {
          who: user.username,
          correlationId: expect.any(String),
        })
      })
  })
})
