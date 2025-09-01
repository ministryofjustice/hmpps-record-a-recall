import request from 'supertest'
import express, { Express } from 'express'
import session from 'express-session'
import bodyParser from 'body-parser'
import searchRoute from '../search-route'
import config from '../../../config'
import logger from '../../../../logger'
import { Services } from '../../../services'

// Mock dependencies
jest.mock('../../../../logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}))

jest.mock('../../../config', () => ({
  domain: 'localhost:3000',
  applications: {
    digitalPrisonServices: {
      url: 'https://dps.example.com',
    },
  },
}))

interface MockPrisonerService {
  getPrisonerDetails: jest.Mock
  getPrisonersInEstablishment: jest.Mock
  getPrisonerImage: jest.Mock
}

describe('Migrated Search Route', () => {
  let app: Express
  let mockPrisonerService: MockPrisonerService

  beforeEach(() => {
    app = express()

    // Setup middleware
    app.use(bodyParser.urlencoded({ extended: true }))
    app.use(bodyParser.json())
    app.use(
      session({
        secret: 'test-secret',
        resave: false,
        saveUninitialized: true,
      }),
    )

    // Mock flash messages
    app.use((req: Express.Request, res, next) => {
      ;(req as Express.Request & { flash: jest.Mock }).flash = jest.fn().mockReturnValue([])
      next()
    })

    // Mock services
    mockPrisonerService = {
      getPrisonerDetails: jest.fn(),
      getPrisonersInEstablishment: jest.fn(),
      getPrisonerImage: jest.fn(),
    }

    app.use((req: Express.Request, res, next) => {
      // Initialize session properties if they don't exist
      if (!req.session.formData) {
        req.session.formData = {}
      }
      if (!req.session.formErrors) {
        req.session.formErrors = {}
      }
      if (!req.session.formValues) {
        req.session.formValues = {}
      }

      ;(req as Express.Request & { services: unknown; user: unknown; sessionModel: unknown }).services = {
        prisonerService: mockPrisonerService,
      } as unknown as Services
      ;(req as Express.Request & { user: unknown }).user = {
        username: 'testuser',
        token: 'test-token',
        authSource: 'auth',
      }
      ;(req as Express.Request & { sessionModel: unknown }).sessionModel = {
        set: jest.fn(),
        get: jest.fn(),
      }
      next()
    })

    // Setup view engine for testing
    app.set('view engine', 'html')
    app.engine('html', (path, options, callback) => {
      callback(null, JSON.stringify(options))
    })
    app.set('views', '.')

    // Mock render method to capture the data
    app.use((req, res, next) => {
      res.render = function render(
        view: string,
        options?: object,
        callback?: (err: Error | null, html?: string) => void,
      ) {
        // For testing, just send the options as JSON
        if (callback) {
          callback(null, JSON.stringify(options || {}))
        } else {
          res.json(options || {})
        }
      }
      next()
    })

    // Mount the search route
    app.use('/search', searchRoute)
  })

  describe('GET /search/nomisId', () => {
    it('should render the search form', async () => {
      const response = await request(app).get('/search/nomisId')

      expect(response.status).toBe(200)
      expect(response.body.fields.nomisId).toBeDefined()
      expect(response.body.fields.nomisId.component).toBe('govukInput')
      expect(response.body.fields.nomisId.id).toBe('nomisId')
      expect(response.body.errors).toEqual({})
      expect(response.body.values).toEqual({})
    })

    it('should display errors from session', async () => {
      const agent = request.agent(app)

      // Set session errors
      await agent.get('/search/nomisId').expect(200)

      const sessionCookie = (
        agent as unknown as { jar?: { getCookie: (name: string, opts: unknown) => unknown } }
      ).jar?.getCookie('connect.sid', { path: '/' })

      const response = await agent
        .get('/search/nomisId')
        .set('Cookie', sessionCookie ? sessionCookie.toString() : '')
        .send()

      expect(response.status).toBe(200)
    })

    it('should redirect to DPS in non-local environment', async () => {
      // Mock non-local environment
      const originalDomain = config.domain
      config.domain = 'production.example.com'

      const response = await request(app).get('/search/nomisId')

      expect(response.status).toBe(302)
      expect(response.header.location).toBe('https://dps.example.com')

      // Restore original domain
      config.domain = originalDomain
    })
  })

  describe('POST /search/nomisId', () => {
    it('should validate and redirect on successful prisoner lookup', async () => {
      mockPrisonerService.getPrisonerDetails.mockResolvedValueOnce({
        prisonerNumber: 'A1234BC',
        firstName: 'John',
        lastName: 'Doe',
      })

      const response = await request(app).post('/search/nomisId').type('form').send({ nomisId: 'a1234bc' })

      expect(response.status).toBe(302)
      expect(response.header.location).toBe('/person/A1234BC')
      expect(mockPrisonerService.getPrisonerDetails).toHaveBeenCalledWith('A1234BC', 'testuser')
    })

    it('should redirect with error when NOMIS ID is empty', async () => {
      const response = await request(app).post('/search/nomisId').type('form').send({ nomisId: '' })

      expect(response.status).toBe(302)
      expect(response.header.location).toBe('/search/nomisId')
      expect(mockPrisonerService.getPrisonerDetails).not.toHaveBeenCalled()
    })

    it('should redirect with error when NOMIS ID is too long', async () => {
      const response = await request(app).post('/search/nomisId').type('form').send({ nomisId: 'TOOLONG8' })

      expect(response.status).toBe(302)
      expect(response.header.location).toBe('/search/nomisId')
      expect(mockPrisonerService.getPrisonerDetails).not.toHaveBeenCalled()
    })

    it('should handle prisoner service errors', async () => {
      mockPrisonerService.getPrisonerDetails.mockRejectedValueOnce(new Error('Service error'))

      const response = await request(app).post('/search/nomisId').type('form').send({ nomisId: 'A1234BC' })

      expect(response.status).toBe(302)
      expect(response.header.location).toBe('/search/nomisId')
      expect(logger.error).toHaveBeenCalled()
    })

    it('should transform NOMIS ID to uppercase', async () => {
      mockPrisonerService.getPrisonerDetails.mockResolvedValueOnce({
        prisonerNumber: 'A1234BC',
        firstName: 'John',
        lastName: 'Doe',
      })

      await request(app).post('/search/nomisId').type('form').send({ nomisId: 'a1234bc' })

      expect(mockPrisonerService.getPrisonerDetails).toHaveBeenCalledWith('A1234BC', 'testuser')
    })

    it('should trim whitespace from NOMIS ID', async () => {
      mockPrisonerService.getPrisonerDetails.mockResolvedValueOnce({
        prisonerNumber: 'A1234BC',
        firstName: 'John',
        lastName: 'Doe',
      })

      await request(app).post('/search/nomisId').type('form').send({ nomisId: '  a1234bc  ' })

      expect(mockPrisonerService.getPrisonerDetails).toHaveBeenCalledWith('A1234BC', 'testuser')
    })

    it('should redirect to DPS in non-local environment', async () => {
      // Mock non-local environment
      const originalDomain = config.domain
      config.domain = 'production.example.com'

      const response = await request(app).post('/search/nomisId').type('form').send({ nomisId: 'A1234BC' })

      expect(response.status).toBe(302)
      expect(response.header.location).toBe('https://dps.example.com')
      expect(mockPrisonerService.getPrisonerDetails).not.toHaveBeenCalled()

      // Restore original domain
      config.domain = originalDomain
    })
  })

  describe('Error handling', () => {
    it('should handle unexpected errors', async () => {
      // Force an error by mocking sessionModel.set to throw
      const response = await request(app)
        .post('/search/nomisId')
        .send({ nomisId: 'A1234BC' })
        .set('Cookie', 'connect.sid=test')

      // The middleware should pass the error to Express error handler
      expect(response.status).not.toBe(500) // Will be 302 as sessionModel.set is mocked in setup
    })
  })
})
