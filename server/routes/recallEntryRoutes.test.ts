import type { Express } from 'express'
import request from 'supertest'
import type { Recall } from 'models'
import { appWithAllRoutes, user } from './testutils/appSetup'
import AuditService, { Page } from '../services/auditService'
import PrisonerService from '../services/prisonerService'
import { AnalysedSentenceAndOffence } from '../@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'
import RecallService from '../services/recallService'

jest.mock('../services/auditService')
jest.mock('../services/prisonerService')
jest.mock('../services/recallService')

const auditService = new AuditService(null) as jest.Mocked<AuditService>
const prisonerService = new PrisonerService(null) as jest.Mocked<PrisonerService>
const recallService = new RecallService(null) as jest.Mocked<RecallService>

let app: Express

beforeEach(() => {
  app = appWithAllRoutes({
    services: {
      auditService,
      prisonerService,
      recallService,
    },
    userSupplier: () => user,
  })
})

afterEach(() => {
  jest.resetAllMocks()
})

describe('GET /person/:nomsId/recall-entry/enter-recall-date', () => {
  it('should render enter-recall-date page and log page view', () => {
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

  it('should render enter-recall-date page when recallDate is populated', () => {
    auditService.logPageView.mockResolvedValue(null)
    recallService.getRecall.mockReturnValue({
      recallDate: new Date(2024, 0, 1),
    } as Recall)

    return request(app)
      .get('/person/123/recall-entry/enter-recall-date')
      .expect('Content-Type', /html/)
      .expect(res => {
        expect(res.text).toContain('What is the recall date for this person?')
        expect(res.text).toContain('name="recallDate[day]" type="text" value="1"')
        expect(res.text).toContain('name="recallDate[month]" type="text" value="1"')
        expect(res.text).toContain('name="recallDate[year]" type="text" value="2024"')
        expect(auditService.logPageView).toHaveBeenCalledWith(Page.ENTER_RECALL_DATE, {
          who: user.username,
          correlationId: expect.any(String),
        })
      })
  })

  it('should perform submission from enter-recall-date page correctly', () => {
    auditService.logPageView.mockResolvedValue(null)

    return request(app)
      .post('/person/123/recall-entry/enter-recall-date')
      .send({ recallDate: { day: '01', month: '02', year: '2023' } })
      .expect(302)
      .expect(() => {
        expect(recallService.setRecallDate).toBeCalledWith({}, '123', {
          day: '01',
          month: '02',
          year: '2023',
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

  it('should render enter-return-to-custody-date page when returnToCustodyDate is populated', () => {
    auditService.logPageView.mockResolvedValue(null)
    recallService.getRecall.mockReturnValue({
      returnToCustodyDate: new Date(2024, 0, 1),
    } as Recall)

    return request(app)
      .get('/person/123/recall-entry/enter-return-to-custody-date')
      .expect('Content-Type', /html/)
      .expect(res => {
        expect(res.text).toContain('What date was this person returned to custody?')
        expect(res.text).toContain('name="returnToCustodyDate[day]" type="text" value="1"')
        expect(res.text).toContain('name="returnToCustodyDate[month]" type="text" value="1"')
        expect(res.text).toContain('name="returnToCustodyDate[year]" type="text" value="2024"')
        expect(auditService.logPageView).toHaveBeenCalledWith(Page.ENTER_RETURN_TO_CUSTODY_DATE, {
          who: user.username,
          correlationId: expect.any(String),
        })
      })
  })

  it('should perform submission from enter-return-to-custody-date page correctly', () => {
    auditService.logPageView.mockResolvedValue(null)

    return request(app)
      .post('/person/123/recall-entry/enter-return-to-custody-date')
      .send({ returnToCustodyDate: { day: '01', month: '02', year: '2023' } })
      .expect(302)
      .expect(() => {
        expect(recallService.setReturnToCustodyDate).toBeCalledWith({}, '123', {
          day: '01',
          month: '02',
          year: '2023',
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
        expect(res.text).toContain('Case reference: TS001</h2>')
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

describe('GET /person/:nomsId/recall-entry/enter-recall-type', () => {
  it('should render enter-recall-type page and log page view', () => {
    auditService.logPageView.mockResolvedValue(null)

    return request(app)
      .get('/person/123/recall-entry/enter-recall-type')
      .expect('Content-Type', /html/)
      .expect(res => {
        expect(res.text).toContain('14_DAY_FTR')
        expect(auditService.logPageView).toHaveBeenCalledWith(Page.ENTER_RECALL_TYPE, {
          who: user.username,
          correlationId: expect.any(String),
        })
      })
  })

  it('should render enter-recall-type page when enterRecallType is populated', () => {
    auditService.logPageView.mockResolvedValue(null)
    recallService.getRecall.mockReturnValue({
      recallType: 'STANDARD_RECALL',
    } as Recall)

    return request(app)
      .get('/person/123/recall-entry/enter-recall-type')
      .expect('Content-Type', /html/)
      .expect(res => {
        expect(res.text).toContain('value="STANDARD_RECALL" checked')
      })
  })

  it('should perform submission from enter-recall-type page correctly', () => {
    auditService.logPageView.mockResolvedValue(null)

    return request(app)
      .post('/person/123/recall-entry/enter-recall-type')
      .send({ recallType: 'STANDARD_RECALL' })
      .expect(302)
      .expect(() => {
        expect(recallService.setRecallType).toBeCalledWith({}, '123', 'STANDARD_RECALL')
      })
  })
})

describe('GET /person/:nomsId/recall-entry/check-your-answers', () => {
  it('should render check-your-answers page and log page view', () => {
    auditService.logPageView.mockResolvedValue(null)
    recallService.getRecall.mockReturnValue({
      recallDate: new Date(2024, 0, 1),
    } as Recall)

    return request(app)
      .get('/person/123/recall-entry/check-your-answers')
      .expect('Content-Type', /html/)
      .expect(res => {
        expect(res.text).toContain('Jan 01 2024')
        expect(auditService.logPageView).toHaveBeenCalledWith(Page.CHECK_YOUR_ANSWERS, {
          who: user.username,
          correlationId: expect.any(String),
        })
      })
  })
})
