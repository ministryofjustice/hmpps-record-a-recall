import request from 'supertest'
import express, { Express } from 'express'
import session from 'express-session'
import nunjucks from 'nunjucks'
import path from 'path'
import { ExtendedRequest } from '../../../../controllers/base/ExpressBaseController'
import populateStoredRecallRouter from '../populate-stored-recall'
import { PrisonUser } from '../../../../interfaces/hmppsUser'
import getCourtCaseOptionsFromRas from '../../../../utils/rasCourtCasesUtils'
import PopulateStoredRecallController from '../../../../controllers/recall/edit/populateStoredRecallController'
import type { Services } from '../../../../services'

// Mock the config module
jest.mock('../../../../config', () => ({
  applications: {
    courtCasesReleaseDates: {
      url: 'http://localhost:8083',
    },
    adjustments: {
      url: 'http://localhost:8085',
    },
  },
}))

// Mock the utils and controller
jest.mock('../../../../utils/rasCourtCasesUtils')
jest.mock('../../../../controllers/recall/edit/populateStoredRecallController')

describe('Populate Stored Recall Route', () => {
  let app: Express
  const mockGetCourtCaseOptions = getCourtCaseOptionsFromRas as unknown as jest.MockedFunction<
    typeof getCourtCaseOptionsFromRas
  >
  const MockController = PopulateStoredRecallController as unknown as jest.MockedClass<
    typeof PopulateStoredRecallController
  >

  beforeEach(() => {
    app = express()

    // Set up nunjucks
    nunjucks.configure([path.join(__dirname, '../../../../../../views')], {
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

    // Mock session data
    app.use((req, res, next) => {
      const reqWithSession = req as unknown as ExtendedRequest
      if (!reqWithSession.session) {
        reqWithSession.session = {
          formData: {},
        } as Express.Request['session']
      }
      if (!reqWithSession.session.formData) {
        reqWithSession.session.formData = {}
      }
      next()
    })

    // Mock services
    app.use((req, res, next) => {
      const reqWithServices = req as unknown as ExtendedRequest
      reqWithServices.services = {
        recallService: {
          getRecall: jest.fn().mockResolvedValue({
            recallType: { code: 'FIXED' },
            revocationDate: '2024-01-01',
            returnToCustodyDate: '2024-01-02',
            courtCaseIds: ['case1'],
            sentenceIds: ['sent1'],
          }),
        } as unknown as Services['recallService'],
        adjustmentsService: {
          searchUal: jest.fn().mockResolvedValue([]),
        } as unknown as Services['adjustmentsService'],
      } as Services
      next()
    })

    // Mock locals middleware
    app.use((req, res, next) => {
      res.locals = {
        nomisId: 'A1234BC',
        recallId: 'recall-123',
        username: 'testuser',
        entrypoint: 'edit',
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
      next()
    })

    // Mount the router
    app.use('/recall/edit', populateStoredRecallRouter)

    // Reset mocks
    jest.clearAllMocks()
  })

  it('should redirect to edit-summary after populating stored recall', async () => {
    ;(mockGetCourtCaseOptions as jest.Mock).mockResolvedValue([])

    const mockConfigure = jest.fn().mockResolvedValue(undefined)
    const mockLocals = jest.fn().mockReturnValue({ isEdit: true })

    MockController.mockImplementation(
      () =>
        ({
          configure: mockConfigure,
          locals: mockLocals,
        }) as unknown as PopulateStoredRecallController,
    )

    const response = await request(app).get('/recall/edit/populate-stored-recall').expect(302)

    expect(response.headers.location).toBe('/recall/edit/edit-summary')
    expect(mockGetCourtCaseOptions).toHaveBeenCalled()
    expect(mockConfigure).toHaveBeenCalled()
    expect(mockLocals).toHaveBeenCalled()
  })

  it('should handle errors and pass them to error handler', async () => {
    ;(mockGetCourtCaseOptions as jest.Mock).mockRejectedValue(new Error('Court case fetch failed'))

    await request(app).get('/recall/edit/populate-stored-recall').expect(500)
  })

  it('should call getCourtCaseOptions and set up controller correctly', async () => {
    const mockCourtCaseOptions = [{ caseId: 'case1', caseNumber: '12345' }]
    ;(mockGetCourtCaseOptions as jest.Mock).mockResolvedValue(mockCourtCaseOptions)

    const mockConfigure = jest.fn().mockResolvedValue(undefined)
    const mockLocals = jest.fn().mockReturnValue({ isEdit: true })

    MockController.mockImplementation(
      () =>
        ({
          configure: mockConfigure,
          locals: mockLocals,
        }) as unknown as PopulateStoredRecallController,
    )

    await request(app).get('/recall/edit/populate-stored-recall').expect(302)

    // Verify that mockGetCourtCaseOptions was called
    expect(mockGetCourtCaseOptions).toHaveBeenCalled()
    // Verify the controller was configured and locals were generated
    expect(mockConfigure).toHaveBeenCalled()
    expect(mockLocals).toHaveBeenCalled()
  })
})
