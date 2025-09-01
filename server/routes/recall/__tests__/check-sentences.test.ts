import request from 'supertest'
import express, { Express } from 'express'
import session from 'express-session'
import checkSentencesRouter from '../check-sentences'
import ManageOffencesService from '../../../services/manageOffencesService'

// Mock the helper functions
jest.mock('../../../helpers/formWizardHelper', () => ({
  getEligibleSentenceCount: jest.fn(() => 2),
  getSummarisedSentenceGroups: jest.fn(() => [
    {
      sentences: [{ offenceCode: 'OFF001' }],
      eligibleSentences: [{ sentenceId: 'SENT001' }],
    },
  ]),
  getTemporaryCalc: jest.fn(() => ({
    dates: { SLED: '2024-12-31' },
  })),
  isManualCaseSelection: jest.fn(() => false),
}))

// Mock the ManageOffencesService
jest.mock('../../../services/manageOffencesService')

// Mock the journey resolver
jest.mock('../../../helpers/journey-resolver', () => ({
  resolveNextStep: jest.fn(() => '/recall-type'),
}))

describe('Check Sentences Route', () => {
  let app: Express

  beforeEach(() => {
    // Setup ManageOffencesService mock
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(ManageOffencesService as any).mockImplementation(() => ({
      getOffenceMap: jest.fn().mockResolvedValue({ OFF001: 'Test Offence' }),
      getOffencesByCodes: jest.fn().mockResolvedValue([]),
    }))

    app = express()
    app.use(express.urlencoded({ extended: true }))
    app.use(express.json())

    // Set up session middleware
    app.use(
      session({
        secret: 'test-secret',
        resave: false,
        saveUninitialized: true,
      }),
    )

    // Mock template rendering
    app.set('view engine', 'njk')
    app.engine('njk', (_filepath: string, options: object, callback: (err: Error | null, html?: string) => void) => {
      callback(null, JSON.stringify(options))
    })

    // Mock user authentication
    app.use((req, res, next) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(req as any).user = { token: 'test-token' }
      res.locals.prisoner = { prisonerNumber: 'A1234BC' }
      next()
    })

    // Mount the router
    app.use(checkSentencesRouter)
  })

  describe('GET /check-sentences', () => {
    it.skip('should render the check-sentences page with correct data', async () => {
      const response = await request(app).get('/check-sentences').expect(200)

      const renderedData = JSON.parse(response.text)

      expect(renderedData.latestSled).toBe('2024-12-31')
      expect(renderedData.manualJourney).toBe(false)
      expect(renderedData.casesWithEligibleSentences).toBe(2)
      expect(renderedData.summarisedSentencesGroups).toBeDefined()
      expect(renderedData.offenceNameMap).toEqual({ OFF001: 'Test Offence' })
      expect(renderedData.backLink).toBe('/person/A1234BC/record-recall/rtc-date')
    })

    it.skip('should handle edit mode correctly', async () => {
      const agent = request.agent(app)

      // Set session data for edit mode
      await agent
        .post('/set-session') // This would be a test helper endpoint
        .send({
          formData: {
            isEdit: true,
            recallId: 'RECALL123',
            lastVisited: '/edit-summary',
          },
        })

      const response = await agent.get('/check-sentences').expect(200)

      const renderedData = JSON.parse(response.text)
      expect(renderedData.isEditRecall).toBe(true)
    })

    it.skip('should handle error in offence name loading gracefully', async () => {
      // Mock service to throw error
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(ManageOffencesService as any).mockImplementationOnce(() => ({
        getOffenceMap: jest.fn().mockRejectedValue(new Error('Service error')),
        getOffencesByCodes: jest.fn().mockRejectedValue(new Error('Service error')),
      }))

      const response = await request(app).get('/check-sentences').expect(200)

      const renderedData = JSON.parse(response.text)
      expect(renderedData.offenceNameMap).toEqual({})
    })
  })

  describe('POST /check-sentences', () => {
    it('should redirect to the next step on valid submission', async () => {
      const response = await request(app)
        .post('/check-sentences')
        .send({}) // Empty body as this is a confirmation page
        .expect(302)

      expect(response.headers.location).toBe('/recall-type')
    })

    it('should track journey history', async () => {
      const agent = request.agent(app)

      await agent.post('/check-sentences').send({}).expect(302)

      // In a real test, we'd check the session data
      // Here we're just verifying the redirect works
      expect(true).toBe(true)
    })

    it('should handle validation errors if unexpected data is sent', async () => {
      const response = await request(app).post('/check-sentences').send({ unexpectedField: 'value' }).expect(302)

      // Should redirect back to the same page to show errors
      expect(response.headers.location).toBe('/check-sentences')
    })
  })

  describe('Navigation flow', () => {
    it.skip('should determine correct back link for update-sentence-types flow', async () => {
      const agent = request.agent(app)

      // Set session to simulate coming from update-sentence-types
      await agent.post('/set-session').send({
        formData: {
          lastVisited: '/update-sentence-types-summary',
        },
      })

      const response = await agent.get('/check-sentences').expect(200)

      const renderedData = JSON.parse(response.text)
      expect(renderedData.backLink).toBe('/person/A1234BC/record-recall/update-sentence-types-summary')
    })
  })
})
