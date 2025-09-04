import request from 'supertest'
import express, { Express } from 'express'
import session from 'express-session'
import nunjucks from 'nunjucks'
import path from 'path'
import notPossibleRouter from '../not-possible'
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

describe('Not Possible Route', () => {
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

    // Mock the render function to avoid template errors (before mounting router)
    app.use((req, res, next) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(res as any).render = function render(view: string, options?: Record<string, unknown>) {
        res.json(options || {})
        return this
      }
      next()
    })

    // Mount the router
    app.use('/recall', notPossibleRouter)

    // Add error handler to catch any errors
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    app.use((err: Error, req: any, res: any, next: any) => {
      // eslint-disable-next-line no-console
      console.error('Test Error:', err)
      res.status(500).json({ error: err.message })
    })
  })

  describe('GET /recall/not-possible', () => {
    it('should render the not-possible page with correct locals for new recall', async () => {
      const response = await request(app).get('/recall/not-possible').expect(200)

      const rendered = response.body
      expect(rendered.nomisId).toBe('A1234BC')
      expect(rendered.isEditRecall).toBe(false)
      expect(rendered.backLink).toBe('/person/A1234BC')
      expect(rendered.reloadLink).toBe('/person/A1234BC/record-recall')
      expect(rendered.cancelLink).toBe('/person/A1234BC/record-recall/confirm-cancel')
    })

    it('should render the not-possible page with correct locals for edit recall', async () => {
      // Create a new app with different locals for edit recall
      const editApp = express()
      editApp.use(express.json())
      editApp.use(express.urlencoded({ extended: true }))
      editApp.use(
        session({
          secret: 'test-secret',
          resave: false,
          saveUninitialized: true,
          cookie: { secure: false },
        }),
      )

      // Update locals for edit recall
      editApp.use((req, res, next) => {
        res.locals = {
          nomisId: 'A1234BC',
          recallId: 'recall-123',
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

      // Mock render
      editApp.use((req, res, next) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(res as any).render = function render(view: string, options?: Record<string, unknown>) {
          res.json(options || {})
          return this
        }
        next()
      })

      editApp.use('/recall', notPossibleRouter)

      const response = await request(editApp).get('/recall/not-possible').expect(200)

      const rendered = response.body
      expect(rendered.nomisId).toBe('A1234BC')
      expect(rendered.isEditRecall).toBe(true)
      expect(rendered.reloadLink).toBe('/person/A1234BC/edit-recall/recall-123')
      expect(rendered.cancelLink).toBe('/person/A1234BC/edit-recall/recall-123/confirm-cancel')
    })

    it('should handle entrypoint parameter correctly', async () => {
      const response = await request(app).get('/recall/not-possible?entrypoint=ccards').expect(200)

      const rendered = response.body
      expect(rendered.backLink).toContain('/prisoner/A1234BC/overview')
      expect(rendered.reloadLink).toBe('/person/A1234BC/record-recall?entrypoint=ccards')
    })

    it('should handle adjustment entrypoint correctly', async () => {
      const response = await request(app).get('/recall/not-possible?entrypoint=adj_remand').expect(200)

      const rendered = response.body
      expect(rendered.backLink).toContain('/A1234BC/remand/view')
    })
  })
})
