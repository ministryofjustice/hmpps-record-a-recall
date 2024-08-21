import type { Express } from 'express'
import request from 'supertest'
import type { Recall } from 'models'
import { appWithAllRoutes, user } from './testutils/appSetup'
import AuditService, { Page } from '../services/auditService'
import PrisonerService from '../services/prisonerService'
import { CalculationBreakdown } from '../@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'
import RecallService from '../services/recallService'
import { CreateRecallResponse } from '../@types/remandAndSentencingApi/remandAndSentencingTypes'
import { RecallTypes } from '../@types/refData'
import ValidationService from '../services/validationService'

jest.mock('../services/auditService')
jest.mock('../services/prisonerService')
jest.mock('../services/recallService')
jest.mock('../services/validationService')

const auditService = new AuditService(null) as jest.Mocked<AuditService>
const prisonerService = new PrisonerService(null) as jest.Mocked<PrisonerService>
const recallService = new RecallService(null) as jest.Mocked<RecallService>
const validationService = new ValidationService() as jest.Mocked<ValidationService>

let app: Express

beforeEach(() => {
  app = appWithAllRoutes({
    services: {
      auditService,
      prisonerService,
      recallService,
      validationService,
    },
    userSupplier: () => user,
  })
})

afterEach(() => {
  jest.resetAllMocks()
})

function getAppForErrorMessages(errorMessages: { text: string; href: string }[]) {
  const flashProvider = jest.fn().mockImplementation((type: string) => {
    if (type === 'errors') {
      return errorMessages
    }
    return []
  })

  return appWithAllRoutes({
    services: {
      auditService,
      prisonerService,
      recallService,
      validationService,
    },
    userSupplier: () => user,
    flashProvider,
  })
}

describe('Routes for /person/:nomsId', () => {
  it('Populate person home page correctly', () => {
    recallService.getAllRecalls.mockResolvedValue([
      {
        recallDate: new Date(2024, 0, 1),
        returnToCustodyDate: new Date(2024, 3, 2),
        recallType: Object.values(RecallTypes).find(it => it.code === 'STANDARD_RECALL'),
      } as Recall,
    ])

    return request(app)
      .get('/person/123')
      .expect('Content-Type', /html/)
      .expect(res => {
        expect(res.text).toContain('01 Jan 2024')
        expect(res.text).toContain('02 Apr 2024')
        expect(res.text).toContain('Standard recall')
        expect(auditService.logPageView).toHaveBeenCalledWith(Page.PERSON_HOME_PAGE, {
          who: user.username,
          correlationId: expect.any(String),
        })
      })
  })
})

describe('GET /person/:nomsId/recall-entry/enter-recall-date', () => {
  it('should render enter-recall-date page with error messages', () => {
    const errorMessages = [
      { text: 'Day must be a valid number', href: '#recallDateDay' },
      { text: 'Month must be a valid number', href: '#recallDateMonth' },
      { text: 'Year must be a valid number', href: '#recallDateYear' },
    ]

    const appWithFlash = getAppForErrorMessages(errorMessages)

    return request(appWithFlash)
      .get('/person/123/recall-entry/enter-recall-date')
      .expect('Content-Type', /html/)
      .expect(res => {
        expect(res.text).toContain('There is a problem')
        expect(res.text).toContain('Day must be a valid number')
        expect(res.text).toContain('Month must be a valid number')
        expect(res.text).toContain('Year must be a valid number')
      })
  })

  it('should render enter-recall-date page and log page view', () => {
    auditService.logPageView.mockResolvedValue(null)

    return request(app)
      .get('/person/123/recall-entry/enter-recall-date')
      .expect('Content-Type', /html/)
      .expect(res => {
        expect(res.text).toContain('Enter the date the person’s licence was revoked')
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
      recallDateForm: { day: '01', month: '01', year: '2024' },
    } as Recall)

    return request(app)
      .get('/person/123/recall-entry/enter-recall-date')
      .expect('Content-Type', /html/)
      .expect(res => {
        expect(res.text).toContain('Enter the date the person’s licence was revoked')
        expect(res.text).toContain('name="recallDate[day]" type="text" value="01"')
        expect(res.text).toContain('name="recallDate[month]" type="text" value="01"')
        expect(res.text).toContain('name="recallDate[year]" type="text" value="2024"')
        expect(auditService.logPageView).toHaveBeenCalledWith(Page.ENTER_RECALL_DATE, {
          who: user.username,
          correlationId: expect.any(String),
        })
      })
  })

  it('should perform submission from enter-recall-date page correctly', () => {
    auditService.logPageView.mockResolvedValue(null)
    validationService.validateRecallDateForm.mockReturnValue([])

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

describe('POST /person/:nomsId/recall-entry/enter-recall-date', () => {
  it('should handle validation errors and redirect back', async () => {
    validationService.validateRecallDateForm.mockReturnValue([{ text: 'Date is invalid', href: '#recallDate' }])

    await request(app)
      .post('/person/123/recall-entry/enter-recall-date')
      .send({ recallDate: { day: 'invalid', month: '02', year: '2023' } })
      .expect(302)
      .expect('Location', '/person/123/recall-entry/enter-recall-date')
  })

  it('should set recall date and redirect to check your answers page', async () => {
    validationService.validateRecallDateForm.mockReturnValue([])

    await request(app)
      .post('/person/123/recall-entry/enter-recall-date?submitToCheckAnswers=true')
      .send({ recallDate: { day: '01', month: '02', year: '2023' } })
      .expect(302)
      .expect('Location', '/person/123/recall-entry/check-your-answers')

    expect(recallService.setRecallDate).toHaveBeenCalledWith({}, '123', {
      day: '01',
      month: '02',
      year: '2023',
    })
  })

  it('should set recall date and redirect to enter return to custody date page', async () => {
    validationService.validateRecallDateForm.mockReturnValue([])

    await request(app)
      .post('/person/123/recall-entry/enter-recall-date')
      .send({ recallDate: { day: '01', month: '02', year: '2023' } })
      .expect(302)
      .expect('Location', '/person/123/recall-entry/enter-return-to-custody-date')

    expect(recallService.setRecallDate).toHaveBeenCalledWith({}, '123', {
      day: '01',
      month: '02',
      year: '2023',
    })
  })
})

describe('routes for /person/:nomsId/recall-entry/enter-return-to-custody-date', () => {
  it('should render enter-return-to-custody-date page with error messages', () => {
    const errorMessages = [
      { text: 'Day must be a valid number', href: '#returnToCustodyDateDay' },
      { text: 'Month must be a valid number', href: '#returnToCustodyDateMonth' },
      { text: 'Year must be a valid number', href: '#returnToCustodyDateYear' },
    ]

    const appWithFlash = getAppForErrorMessages(errorMessages)

    return request(appWithFlash)
      .get('/person/123/recall-entry/enter-return-to-custody-date')
      .expect('Content-Type', /html/)
      .expect(res => {
        expect(res.text).toContain('There is a problem')
        expect(res.text).toContain('Day must be a valid number')
        expect(res.text).toContain('Month must be a valid number')
        expect(res.text).toContain('Year must be a valid number')
      })
  })

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
      returnToCustodyDateForm: { day: '01', month: '01', year: '2024' },
    } as Recall)

    return request(app)
      .get('/person/123/recall-entry/enter-return-to-custody-date')
      .expect('Content-Type', /html/)
      .expect(res => {
        expect(res.text).toContain('What date was this person returned to custody?')
        expect(res.text).toContain('name="returnToCustodyDate[day]" type="text" value="01"')
        expect(res.text).toContain('name="returnToCustodyDate[month]" type="text" value="01"')
        expect(res.text).toContain('name="returnToCustodyDate[year]" type="text" value="2024"')
        expect(auditService.logPageView).toHaveBeenCalledWith(Page.ENTER_RETURN_TO_CUSTODY_DATE, {
          who: user.username,
          correlationId: expect.any(String),
        })
      })
  })

  it('should perform submission from enter-return-to-custody-date page correctly', () => {
    auditService.logPageView.mockResolvedValue(null)
    validationService.validateReturnToCustodyDateForm.mockReturnValue([])

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

    prisonerService.getCalculationBreakdown.mockResolvedValue({
      concurrentSentences: [
        {
          sentencedAt: '2022-06-10',
          sentenceLength: '7 years',
          sentenceLengthDays: 2557,
          dates: {
            SLED: {
              unadjusted: '2029-06-09',
              adjusted: '2029-06-09',
              daysFromSentenceStart: 2557,
              adjustedByDays: 0,
            },
            CRD: {
              unadjusted: '2027-02-08',
              adjusted: '2027-02-18',
              daysFromSentenceStart: 1705,
              adjustedByDays: -10,
            },
          },
          lineSequence: 1,
          caseSequence: 1,
          caseReference: null,
        },
        {
          sentencedAt: '2022-06-10',
          sentenceLength: '84 months',
          sentenceLengthDays: 2557,
          dates: {
            SLED: {
              unadjusted: '2029-06-09',
              adjusted: '2029-06-09',
              daysFromSentenceStart: 2557,
              adjustedByDays: 0,
            },
            CRD: {
              unadjusted: '2025-12-09',
              adjusted: '2025-12-19',
              daysFromSentenceStart: 1279,
              adjustedByDays: -10,
            },
          },
          lineSequence: 2,
          caseSequence: 1,
          caseReference: null,
        },
      ],
      consecutiveSentence: {
        sentencedAt: '2022-06-10',
        sentenceLength: '6 years 13 months',
        sentenceLengthDays: 2587,
        dates: {
          SLED: {
            unadjusted: '2029-07-09',
            adjusted: '2029-07-09',
            daysFromSentenceStart: 2587,
            adjustedByDays: 0,
          },
          CRD: {
            unadjusted: '2025-12-24',
            adjusted: '2026-01-03',
            daysFromSentenceStart: 1294,
            adjustedByDays: -10,
          },
        },
        caseSequence: 1,
        caseReference: null,
      },
    } as unknown as CalculationBreakdown)

    return request(app)
      .get('/person/123/recall-entry/check-sentences')
      .expect('Content-Type', /html/)
      .expect(res => {
        // Verify concurrent sentences
        expect(res.text).toContain('Calculation Breakdown Lookup from CRD')
        expect(auditService.logPageView).toHaveBeenCalledWith(Page.CHECK_SENTENCES, {
          who: user.username,
          correlationId: expect.any(String),
        })
      })
  })
})

describe('routes for /person/:nomsId/recall-entry/enter-recall-type', () => {
  it('should render enter-recall-type page and log page view', () => {
    auditService.logPageView.mockResolvedValue(null)

    return request(app)
      .get('/person/123/recall-entry/enter-recall-type')
      .expect('Content-Type', /html/)
      .expect(res => {
        expect(res.text).toContain('FOURTEEN_DAY_FIXED_TERM_RECALL')
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
      returnToCustodyDate: new Date(2024, 3, 2),
      recallType: Object.values(RecallTypes).find(it => it.code === 'STANDARD_RECALL'),
    } as Recall)

    return request(app)
      .get('/person/123/recall-entry/check-your-answers')
      .expect('Content-Type', /html/)
      .expect(res => {
        expect(res.text).toContain('01 Jan 2024')
        expect(res.text).toContain('02 Apr 2024')
        expect(res.text).toContain('Standard recall')
        expect(auditService.logPageView).toHaveBeenCalledWith(Page.CHECK_YOUR_ANSWERS, {
          who: user.username,
          correlationId: expect.any(String),
        })
      })
  })

  it('should perform submission from check-your-answers page correctly', () => {
    auditService.logPageView.mockResolvedValue(null)
    recallService.createRecall.mockResolvedValue({ recallUuid: '11-22-33-44' } as CreateRecallResponse)

    return request(app)
      .post('/person/123/recall-entry/check-your-answers')
      .expect(302)
      .expect(() => {
        expect(recallService.createRecall).toBeCalledWith({}, '123', user.username)
      })
  })
})

describe('routes for /person/:nomsId/recall-entry/success-confirmation', () => {
  it('should render success-confirmation page', () => {
    auditService.logPageView.mockResolvedValue(null)

    return request(app)
      .get('/person/123/recall-entry/success-confirmation?uuid=11-22-33-44')
      .expect('Content-Type', /html/)
      .expect(res => {
        expect(res.text).toContain('Recall complete')
        expect(res.text).toContain('11-22-33-44')
        expect(auditService.logPageView).toHaveBeenCalledWith(Page.RECALL_ENTRY_SUCCESS, {
          who: user.username,
          correlationId: expect.any(String),
        })
      })
  })
})
