import request from 'supertest'
import express, { Express } from 'express'
import session from 'express-session'
import nunjucks from 'nunjucks'
import path from 'path'
import router from '../revocation-date'

import { RecallRoutingService } from '../../../../services/RecallRoutingService'
import {
  getCrdsSentencesFromSession,
  getCourtCaseOptionsFromSession,
  getExistingAdjustmentsFromSession,
} from '../../../../helpers/migratedFormHelper'
import { initialiseName } from '../../../../utils/utils'
import {
  personProfileName,
  personDateOfBirth,
  personStatus,
  firstNameSpaceLastName,
} from '@ministryofjustice/hmpps-court-cases-release-dates-design/hmpps/utils/utils'
import dayjs from 'dayjs'

jest.mock('../../../../services/RecallRoutingService')
jest.mock('../../../../helpers/migratedFormHelper')
jest.mock('../../../../../logger', () => ({
  default: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}))

describe.skip('Revocation Date Route', () => {
  let app: Express
  const originalEnv = process.env

  beforeEach(() => {
    // Enable migrated routes for testing
    process.env = { ...originalEnv, USE_MIGRATED_DATE_ROUTES: 'true' }
    
    app = express()
    app.use(express.urlencoded({ extended: true }))
    app.use(
      session({
        secret: 'test',
        resave: false,
        saveUninitialized: true,
      }),
    )

    app.use((req, res, next) => {
      res.locals = {
        user: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          activeCaseload: {} as any,
          authSource: 'nomis' as const,
          caseloads: [],
          username: 'testuser',
          userId: '123',
          name: 'Test User',
          displayName: 'Test User',
          userRoles: [],
          token: 'token',
          staffId: 123,
        },
        prisoner: {
          prisonerNumber: 'A1234BC',
          firstName: 'John',
          lastName: 'Doe',
        },
      }
      next()
    })

    const viewPath = path.join(__dirname, '../../../../views')
    const njkEnv = nunjucks.configure(
      [
        viewPath,
        'node_modules/govuk-frontend/dist',
        'node_modules/@ministryofjustice/frontend/moj',
        'node_modules/@ministryofjustice/hmpps-court-cases-release-dates-design/hmpps/components/',
        'node_modules/@ministryofjustice/hmpps-court-cases-release-dates-design/',
      ],
      {
        express: app,
        autoescape: true,
      },
    )
    
    // Add custom filters
    njkEnv.addFilter('initialiseName', initialiseName)
    njkEnv.addFilter('personProfileName', personProfileName)
    njkEnv.addFilter('personDateOfBirth', personDateOfBirth)
    njkEnv.addFilter('personStatus', personStatus)
    njkEnv.addFilter('firstNameSpaceLastName', firstNameSpaceLastName)
    njkEnv.addFilter('date', (date, format = 'DD MMM YYYY') => dayjs(date).format(format))
    njkEnv.addFilter('eightDigitDate', (date, format = 'DD/MM/YYYY') => dayjs(date).format(format))
    njkEnv.addFilter('fullMonthdate', (date, format = 'DD MMMM YYYY') => dayjs(date).format(format))
    
    app.set('view engine', 'njk')

    app.use('/recall', router)
  })

  afterEach(() => {
    jest.clearAllMocks()
    process.env = originalEnv
  })

  describe('GET /revocation-date', () => {
    it('should render the revocation date form', async () => {
      const response = await request(app).get('/recall/revocation-date').expect(200)

      expect(response.text).toContain('Enter the date of revocation')
      expect(response.text).toContain('For example, 27 3 2007')
    })

    it('should include back link to person page', async () => {
      const response = await request(app).get('/recall/revocation-date').expect(200)

      expect(response.text).toContain('/person/A1234BC')
    })

    it('should include back link to edit summary when editing', async () => {
      app.use((req, res, next) => {
        res.locals.isEditRecall = true
        res.locals.recallId = 'recall-123'
        next()
      })

      const response = await request(app).get('/recall/revocation-date').expect(200)

      expect(response.text).toContain('/person/A1234BC/recall/recall-123/edit/edit-summary')
    })
  })

  describe('POST /revocation-date', () => {
    const mockRoutingResponse = {
      eligibilityDetails: {
        invalidRecallTypes: [] as string[],
        eligibleSentenceCount: 2,
        hasNonSdsSentences: false,
      },
      routing: 'AUTOMATIC',
      nextSteps: [] as string[],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      validationMessages: [] as any[],
    }

    beforeEach(() => {
      ;(getCrdsSentencesFromSession as jest.Mock).mockReturnValue([])
      ;(getCourtCaseOptionsFromSession as jest.Mock).mockReturnValue([])
      ;(getExistingAdjustmentsFromSession as jest.Mock).mockReturnValue([])
      ;(RecallRoutingService as jest.Mock).mockImplementation(() => ({
        routeRecall: jest.fn().mockResolvedValue(mockRoutingResponse),
      }))
    })

    it('should accept valid past date and redirect to next step', async () => {
      const response = await request(app)
        .post('/recall/revocation-date')
        .send({ revocationDate: '2024-01-01' })
        .expect(302)

      expect(response.header.location).toBe('/rtc-date')
    })

    it("should accept today's date", async () => {
      const today = new Date().toISOString().split('T')[0]

      const response = await request(app).post('/recall/revocation-date').send({ revocationDate: today }).expect(302)

      expect(response.header.location).toBe('/rtc-date')
    })

    it('should reject future date', async () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 1)

      const response = await request(app)
        .post('/recall/revocation-date')
        .send({ revocationDate: futureDate.toISOString().split('T')[0] })
        .expect(302)

      expect(response.header.location).toBe('/recall/revocation-date')
    })

    it('should reject empty date', async () => {
      const response = await request(app).post('/recall/revocation-date').send({ revocationDate: '' }).expect(302)

      expect(response.header.location).toBe('/recall/revocation-date')
    })

    it('should validate against earliest sentence date', async () => {
      ;(getCrdsSentencesFromSession as jest.Mock).mockReturnValue([
        { sentenceDate: '2024-01-15' },
        { sentenceDate: '2024-02-01' },
      ])

      const response = await request(app)
        .post('/recall/revocation-date')
        .send({ revocationDate: '2024-01-01' })
        .expect(302)

      expect(response.header.location).toBe('/recall/revocation-date')
    })

    it('should handle routing validation messages', async () => {
      const mockErrorResponse = {
        ...mockRoutingResponse,
        validationMessages: [{ code: 'ADJUSTMENT_FUTURE_DATED_UAL', message: 'UAL conflict' }],
      }

      ;(RecallRoutingService as jest.Mock).mockImplementation(() => ({
        routeRecall: jest.fn().mockResolvedValue(mockErrorResponse),
      }))

      const response = await request(app)
        .post('/recall/revocation-date')
        .send({ revocationDate: '2024-01-01' })
        .expect(302)

      expect(response.header.location).toBe('/recall/revocation-date')
    })

    it('should handle FTR conflict validation', async () => {
      const mockErrorResponse = {
        ...mockRoutingResponse,
        validationMessages: [{ code: 'FTR_SENTENCES_CONFLICT_WITH_EACH_OTHER', message: 'FTR conflict' }],
      }

      ;(RecallRoutingService as jest.Mock).mockImplementation(() => ({
        routeRecall: jest.fn().mockResolvedValue(mockErrorResponse),
      }))

      const response = await request(app)
        .post('/recall/revocation-date')
        .send({ revocationDate: '2024-01-01' })
        .expect(302)

      expect(response.header.location).toBe('/recall/revocation-date')
    })

    it('should handle concurrent sentence validation', async () => {
      const mockErrorResponse = {
        ...mockRoutingResponse,
        validationMessages: [{ code: 'CONCURRENT_CONSECUTIVE_SENTENCES_DURATION', message: 'Concurrent conflict' }],
      }

      ;(RecallRoutingService as jest.Mock).mockImplementation(() => ({
        routeRecall: jest.fn().mockResolvedValue(mockErrorResponse),
      }))

      const response = await request(app)
        .post('/recall/revocation-date')
        .send({ revocationDate: '2024-01-01' })
        .expect(302)

      expect(response.header.location).toBe('/recall/revocation-date')
    })

    it('should fall back to manual case selection on routing service error', async () => {
      ;(RecallRoutingService as jest.Mock).mockImplementation(() => ({
        routeRecall: jest.fn().mockRejectedValue(new Error('Service error')),
      }))

      const response = await request(app)
        .post('/recall/revocation-date')
        .send({ revocationDate: '2024-01-01' })
        .expect(302)

      expect(response.header.location).toBe('/rtc-date')
    })

    it('should save validated data to session', async () => {
      const agent = request.agent(app)

      await agent.post('/recall/revocation-date').send({ revocationDate: '2024-01-01' }).expect(302)

      const sessionResponse = await agent.get('/recall/revocation-date')

      expect(sessionResponse.text).toContain('2024-01-01')
    })
  })
})
