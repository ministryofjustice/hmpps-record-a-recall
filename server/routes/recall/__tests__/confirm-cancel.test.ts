import request from 'supertest'
import express, { Express, Response } from 'express'
import session from 'express-session'
import nunjucks from 'nunjucks'
import path from 'path'
import confirmCancelRouter from '../confirm-cancel'
import { PrisonUser } from '../../../interfaces/hmppsUser'

// Mock the config module
jest.mock('../../../config', () => ({
  applications: {
    courtCasesReleaseDates: {
      url: 'http://localhost:8083',
    },
    adjustments: {
      url: 'http://localhost:8085',
    },
  },
}))

describe('Confirm Cancel Route', () => {
  let app: Express

  beforeEach(() => {
    app = express()

    // Set up nunjucks
    nunjucks.configure([path.join(__dirname, '../../../../views')], {
      express: app,
      autoescape: true,
      noCache: true,
    })
    app.set('view engine', 'njk')

    // Set up middleware
    app.use(express.json())
    app.use(express.urlencoded({ extended: true }))
    app.use(
      session({
        secret: 'test-secret',
        resave: false,
        saveUninitialized: true,
        cookie: { secure: false },
      }),
    )

    // Mock locals middleware
    app.use((req, res, next) => {
      res.locals = {
        nomisId: 'A1234BC',
        recallId: null,
        user: {
          authSource: 'nomis',
          staffId: 1,
          activeCaseload: { id: 'TEST', name: 'Test' },
          caseloads: [],
          username: 'testuser',
          userId: '1',
          name: 'Test User',
          displayName: 'Test User',
          userRoles: [],
          token: 'token',
        } as PrisonUser, // Mock user object for testing
      }
      next()
    })

    // Mock the render function to avoid template errors
    app.use((req, res, next) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(res as any).render = function render(view: string, options?: Record<string, unknown>) {
        res.json(options || {})
        return this
      }
      next()
    })

    // Mount the router after mocking render
    app.use('/recall', confirmCancelRouter)
  })

  describe('GET /recall/confirm-cancel', () => {
    it('should render the confirmation page with correct locals', async () => {
      const agent = request.agent(app)

      // Set up session with journey history
      await agent.get('/recall/confirm-cancel').set('Cookie', ['connect.sid=test'])

      const response = await agent.get('/recall/confirm-cancel').expect(200)

      const rendered = response.body
      expect(rendered.nomisId).toBe('A1234BC')
      expect(rendered.hideCancel).toBe(true)
      expect(rendered.fields.confirmCancel).toBeDefined()
      expect(rendered.fields.confirmCancel.items).toHaveLength(2)
      expect(rendered.fields.confirmCancel.fieldset.legend.text).toBe(
        'Are you sure you want to cancel recording a recall?',
      )
    })

    it('should store return location when not already on confirm-cancel', async () => {
      // Create a new app with proper session setup
      const testApp = express()
      testApp.use(express.json())
      testApp.use(express.urlencoded({ extended: true }))
      testApp.use(
        session({
          secret: 'test-secret',
          resave: false,
          saveUninitialized: true,
          cookie: { secure: false },
        }),
      )

      // Add middleware to set up session data
      testApp.use((req, res, next) => {
        res.locals = {
          nomisId: 'A1234BC',
          recallId: null,
          user: {
            authSource: 'nomis',
            staffId: 1,
            activeCaseload: { id: 'TEST', name: 'Test' },
            caseloads: [],
            username: 'testuser',
            userId: '1',
            name: 'Test User',
            displayName: 'Test User',
            userRoles: [],
            token: 'token',
          } as PrisonUser,
        }
        // Initialize session with journey history
        if (!req.session.journeyHistory) {
          req.session.journeyHistory = ['/recall/revocation-date']
        }
        next()
      })

      // Mock render
      testApp.use((req, res, next) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(res as any).render = function render(view: string, options?: Record<string, unknown>) {
          res.json(options || {})
          return this
        }
        next()
      })

      testApp.use('/recall', confirmCancelRouter)

      const agent = request.agent(testApp)
      const response = await agent.get('/recall/confirm-cancel').expect(200)

      const rendered = response.body
      expect(rendered.backLink).toBe('/recall/revocation-date')
    })
  })

  describe('POST /recall/confirm-cancel', () => {
    it('should redirect to entrypoint URL when user confirms cancellation', async () => {
      const agent = request.agent(app)

      const response = await agent.post('/recall/confirm-cancel').send({ confirmCancel: 'true' }).expect(302)

      expect(response.headers.location).toBe('/person/A1234BC')
    })

    it('should redirect to CCARDS when cancelling with ccards entrypoint', async () => {
      const agent = request.agent(app)

      // Set up session with entrypoint by posting directly to confirm-cancel with entrypoint
      const response = await agent
        .post('/recall/confirm-cancel?entrypoint=ccards')
        .send({ confirmCancel: 'true' })
        .expect(302)

      expect(response.headers.location).toContain('/prisoner/A1234BC/overview')
    })

    it('should redirect back to previous page when user chooses not to cancel', async () => {
      // Create an app with session middleware that pre-populates the returnTo
      const testApp = express()
      testApp.use(express.json())
      testApp.use(express.urlencoded({ extended: true }))
      testApp.use(
        session({
          secret: 'test-secret',
          resave: false,
          saveUninitialized: true,
          cookie: { secure: false },
        }),
      )

      // Add middleware to set up session data
      testApp.use((req, res, next) => {
        res.locals = {
          nomisId: 'A1234BC',
          recallId: null,
          user: {
            authSource: 'nomis',
            staffId: 1,
            activeCaseload: { id: 'TEST', name: 'Test' },
            caseloads: [],
            username: 'testuser',
            userId: '1',
            name: 'Test User',
            displayName: 'Test User',
            userRoles: [],
            token: 'token',
          } as PrisonUser,
        }
        if (!req.session.formData) {
          req.session.formData = {}
        }
        req.session.formData.returnTo = '/recall/revocation-date'
        next()
      })

      // Mock render
      testApp.use((req, res, next) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(res as any).render = function render(view: string, options?: Record<string, unknown>) {
          res.json(options || {})
          return this
        }
        next()
      })

      testApp.use('/recall', confirmCancelRouter)

      const agent = request.agent(testApp)
      const response = await agent.post('/recall/confirm-cancel').send({ confirmCancel: 'false' }).expect(302)

      expect(response.headers.location).toBe('/recall/revocation-date')
    })

    it('should validate required field', async () => {
      const agent = request.agent(app)

      const response = await agent.post('/recall/confirm-cancel').send({}).expect(302)

      // Should redirect back to the same page with errors
      expect(response.headers.location).toBe('/recall/confirm-cancel')
    })

    it('should clear session data when cancelling', async () => {
      const agent = request.agent(app)

      // Set up session with form data
      await agent.post('/test-session').send({
        formData: { someField: 'value' },
        journeyHistory: ['/recall/step1', '/recall/step2'],
      })

      await agent.post('/recall/confirm-cancel').send({ confirmCancel: 'true' }).expect(302)

      // Session should be cleared
      const sessionResponse = await agent.get('/test-session')
      expect(sessionResponse.body.formData).toBeUndefined()
      expect(sessionResponse.body.journeyHistory).toBeUndefined()
    })
  })

  describe('Field validation', () => {
    it('should reject invalid values for confirmCancel', async () => {
      const agent = request.agent(app)

      const response = await agent.post('/recall/confirm-cancel').send({ confirmCancel: 'invalid' }).expect(302)

      // Should redirect back with error
      expect(response.headers.location).toBe('/recall/confirm-cancel')
    })

    it('should accept valid true value', async () => {
      const agent = request.agent(app)

      const response = await agent.post('/recall/confirm-cancel').send({ confirmCancel: 'true' }).expect(302)

      expect(response.headers.location).toBe('/person/A1234BC')
    })

    it('should accept valid false value', async () => {
      const agent = request.agent(app)

      const response = await agent.post('/recall/confirm-cancel').send({ confirmCancel: 'false' }).expect(302)

      expect(response.headers.location).toBe('/')
    })
  })
})
