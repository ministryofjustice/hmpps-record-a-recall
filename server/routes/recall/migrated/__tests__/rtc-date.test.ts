import request from 'supertest'
import express, { Express } from 'express'
import session from 'express-session'
import nunjucks from 'nunjucks'
import path from 'path'
import router from '../rtc-date'
import {
  getAdjustmentsToConsiderForValidationFromSession,
  getExistingAdjustmentsFromSession,
  getPrisonerFromSession,
  getRevocationDateFromSession,
  hasMultipleConflictingFromSession,
  hasMultipleUALTypeRecallConflictingFromSession,
  isManualCaseSelectionFromSession,
  getEligibleSentenceCountFromSession,
} from '../../../../helpers/migratedFormHelper'
import { initialiseName } from '../../../../utils/utils'
import {
  personProfileName,
  personDateOfBirth,
  personStatus,
  firstNameSpaceLastName,
} from '@ministryofjustice/hmpps-court-cases-release-dates-design/hmpps/utils/utils'
import dayjs from 'dayjs'

jest.mock('../../../../helpers/migratedFormHelper')
jest.mock('../../../../../logger', () => ({
  default: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}))

describe.skip('RTC Date Route', () => {
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
      req.session.formData = {
        revocationDate: '2024-01-01',
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
    ;(getRevocationDateFromSession as jest.Mock).mockReturnValue(new Date('2024-01-01'))
    ;(getPrisonerFromSession as jest.Mock).mockReturnValue({ bookingId: 12345 })
    ;(getExistingAdjustmentsFromSession as jest.Mock).mockReturnValue([])
    ;(getAdjustmentsToConsiderForValidationFromSession as jest.Mock).mockReturnValue([])
    ;(hasMultipleConflictingFromSession as jest.Mock).mockReturnValue(false)
    ;(hasMultipleUALTypeRecallConflictingFromSession as jest.Mock).mockReturnValue(false)
    ;(isManualCaseSelectionFromSession as jest.Mock).mockReturnValue(false)
    ;(getEligibleSentenceCountFromSession as jest.Mock).mockReturnValue(1)
  })

  afterEach(() => {
    jest.clearAllMocks()
    process.env = originalEnv
  })

  describe('GET /rtc-date', () => {
    it('should render the RTC date form', async () => {
      const response = await request(app).get('/recall/rtc-date')
      
      if (response.status === 500) {
        console.error('500 error response:', response.text)
      }
      
      expect(response.status).toBe(200)
      expect(response.text).toContain('Was this person in prison when the recall was made?')
      expect(response.text).toContain('Date they were arrested')
    })

    it('should include correct back link', async () => {
      const response = await request(app).get('/recall/rtc-date').expect(200)

      expect(response.text).toContain('/person/A1234BC/record-recall/revocation-date')
    })

    it('should include back link to edit summary when editing', async () => {
      app.use((req, res, next) => {
        res.locals.isEditRecall = true
        res.locals.recallId = 'recall-123'
        next()
      })

      const response = await request(app).get('/recall/rtc-date').expect(200)

      expect(response.text).toContain('/person/A1234BC/recall/recall-123/edit/edit-summary')
    })
  })

  describe('POST /rtc-date', () => {
    describe('when in prison at recall', () => {
      it('should accept "Yes" and not require date', async () => {
        const response = await request(app).post('/recall/rtc-date').send({ inPrisonAtRecall: 'true' }).expect(302)

        expect(response.header.location).toBe('/check-sentences')
      })

      it('should clear any previously set return to custody date', async () => {
        const agent = request.agent(app)

        await agent
          .post('/recall/rtc-date')
          .send({
            inPrisonAtRecall: 'false',
            returnToCustodyDate: '2024-01-15',
          })
          .expect(302)

        await agent.post('/recall/rtc-date').send({ inPrisonAtRecall: 'true' }).expect(302)

        const sessionResponse = await agent.get('/recall/rtc-date')
        expect(sessionResponse.text).not.toContain('2024-01-15')
      })
    })

    describe('when not in prison at recall', () => {
      it('should require arrest date when "No" is selected', async () => {
        const response = await request(app).post('/recall/rtc-date').send({ inPrisonAtRecall: 'false' }).expect(302)

        expect(response.header.location).toBe('/recall/rtc-date')
      })

      it('should accept valid arrest date on or after revocation date', async () => {
        const response = await request(app)
          .post('/recall/rtc-date')
          .send({
            inPrisonAtRecall: 'false',
            returnToCustodyDate: '2024-01-15',
          })
          .expect(302)

        expect(response.header.location).toBe('/check-sentences')
      })

      it('should accept arrest date equal to revocation date', async () => {
        const response = await request(app)
          .post('/recall/rtc-date')
          .send({
            inPrisonAtRecall: 'false',
            returnToCustodyDate: '2024-01-01',
          })
          .expect(302)

        expect(response.header.location).toBe('/check-sentences')
      })

      it('should reject arrest date before revocation date', async () => {
        const response = await request(app)
          .post('/recall/rtc-date')
          .send({
            inPrisonAtRecall: 'false',
            returnToCustodyDate: '2023-12-31',
          })
          .expect(302)

        expect(response.header.location).toBe('/recall/rtc-date')
      })

      it('should reject empty arrest date', async () => {
        const response = await request(app)
          .post('/recall/rtc-date')
          .send({
            inPrisonAtRecall: 'false',
            returnToCustodyDate: '',
          })
          .expect(302)

        expect(response.header.location).toBe('/recall/rtc-date')
      })

      it('should reject future arrest date', async () => {
        const futureDate = new Date()
        futureDate.setDate(futureDate.getDate() + 1)

        const response = await request(app)
          .post('/recall/rtc-date')
          .send({
            inPrisonAtRecall: 'false',
            returnToCustodyDate: futureDate.toISOString().split('T')[0],
          })
          .expect(302)

        expect(response.header.location).toBe('/recall/rtc-date')
      })
    })

    describe('conditional routing', () => {
      it('should route to conflicting adjustments interrupt when multiple UAL conflicts exist', async () => {
        const adjustments = [
          {
            adjustmentType: 'UNLAWFULLY_AT_LARGE',
            fromDate: '2024-01-01',
            toDate: '2024-01-20',
            unlawfullyAtLarge: { type: 'RECALL' },
          },
          {
            adjustmentType: 'UNLAWFULLY_AT_LARGE',
            fromDate: '2024-01-05',
            toDate: '2024-01-25',
            unlawfullyAtLarge: { type: 'RECALL' },
          },
        ]
        ;(getExistingAdjustmentsFromSession as jest.Mock).mockReturnValue(adjustments)
        ;(getAdjustmentsToConsiderForValidationFromSession as jest.Mock).mockReturnValue(adjustments)

        const response = await request(app)
          .post('/recall/rtc-date')
          .send({
            inPrisonAtRecall: 'false',
            returnToCustodyDate: '2024-01-10',
          })
          .expect(302)

        expect(response.header.location).toBe('/conflicting-adjustments-interrupt')
      })

      it('should route to manual recall intercept when manual case selection is required', async () => {
        app.use((req, res, next) => {
          req.session.formData = {
            ...req.session.formData,
            manualCaseSelection: true,
          }
          next()
        })

        const response = await request(app).post('/recall/rtc-date').send({ inPrisonAtRecall: 'true' }).expect(302)

        expect(response.header.location).toBe('/manual-recall-intercept')
      })

      it('should route to no sentences interrupt when no eligible sentences', async () => {
        app.use((req, res, next) => {
          req.session.formData = {
            ...req.session.formData,
            eligibleSentenceCount: 0,
          }
          next()
        })

        const response = await request(app).post('/recall/rtc-date').send({ inPrisonAtRecall: 'true' }).expect(302)

        expect(response.header.location).toBe('/no-sentences-interrupt')
      })
    })

    describe('UAL calculations', () => {
      it('should calculate UAL when not in prison at recall', async () => {
        const agent = request.agent(app)

        await agent
          .post('/recall/rtc-date')
          .send({
            inPrisonAtRecall: 'false',
            returnToCustodyDate: '2024-01-15',
          })
          .expect(302)

        const sessionResponse = await agent.get('/recall/rtc-date')
        expect(sessionResponse.text).toContain('2024-01-15')
      })

      it('should handle conflicting adjustments', async () => {
        ;(getExistingAdjustmentsFromSession as jest.Mock).mockReturnValue([
          {
            id: 'adj-123',
            adjustmentType: 'REMAND',
            fromDate: '2024-01-10',
            toDate: '2024-01-20',
            bookingId: 12345,
            person: 'A1234BC',
          },
        ])

        const response = await request(app)
          .post('/recall/rtc-date')
          .send({
            inPrisonAtRecall: 'false',
            returnToCustodyDate: '2024-01-15',
          })
          .expect(302)

        expect(response.header.location).toBe('/recall/rtc-date')
      })
    })

    describe('validation', () => {
      it('should validate required fields', async () => {
        const response = await request(app).post('/recall/rtc-date').send({}).expect(302)

        expect(response.header.location).toBe('/recall/rtc-date')
      })

      it('should preserve form values on validation error', async () => {
        const agent = request.agent(app)

        await agent
          .post('/recall/rtc-date')
          .send({
            inPrisonAtRecall: 'false',
            returnToCustodyDate: '2023-12-31',
          })
          .expect(302)

        const sessionResponse = await agent.get('/recall/rtc-date')
        expect(sessionResponse.text).toContain('false')
      })
    })
  })
})
