import type { Express } from 'express'
import request from 'supertest'
import { SessionData } from 'express-session'
import { v4 as uuidv4 } from 'uuid'
import { CreateRecallJourney } from '../../../@types/journeys'
import { appWithAllRoutes, user } from '../../testutils/appSetup'
import CalculateReleaseDatesService from '../../../services/calculateReleaseDatesService'
import { RecordARecallValidationResult } from '../../../@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'
import AuditService from '../../../services/auditService'

let app: Express
let session: Partial<SessionData>
let preExistingJourneysToAddToSession: Array<CreateRecallJourney>
const nomsId = 'A1234BC'
const successfulCrdsValidationResult = {
  criticalValidationMessages: [],
  otherValidationMessages: [],
  earliestSentenceDate: '2025-01-01',
} as RecordARecallValidationResult
jest.mock('../../../services/calculateReleaseDatesService')
jest.mock('../../../services/auditService')

const calculateReleaseDatesService = new CalculateReleaseDatesService(null) as jest.Mocked<CalculateReleaseDatesService>
const auditService = new AuditService(null) as jest.Mocked<AuditService>

beforeEach(() => {
  app = appWithAllRoutes({
    services: {
      calculateReleaseDatesService,
      auditService,
    },
    userSupplier: () => user,
    sessionReceiver: (receivedSession: Partial<SessionData>) => {
      session = receivedSession
      if (preExistingJourneysToAddToSession) {
        session.createRecallJourneys = {}
        preExistingJourneysToAddToSession.forEach((journey: CreateRecallJourney) => {
          session.createRecallJourneys![journey.id] = journey
        })
      }
    },
  })
})

afterEach(() => {
  jest.resetAllMocks()
})

describe('GET /person/:nomsId/recall/create/start', () => {
  it('should create the journey and redirect to revocation date page', async () => {
    // Given
    calculateReleaseDatesService.validateForRecordARecall.mockResolvedValue(successfulCrdsValidationResult)

    // When
    const response = await request(app).get(`/person/${nomsId}/recall/create/start`)

    // Then
    expect(response.status).toEqual(302)
    const journeys = Object.values(session.createRecallJourneys!)
    expect(journeys).toHaveLength(1)
    expect(response.headers.location).toStrictEqual(`/person/${nomsId}/recall/create/${journeys[0].id}/revocation-date`)
  })
  it('should create the journey and redirect to validation intercept if critical errors exist', async () => {
    // Given
    calculateReleaseDatesService.validateForRecordARecall.mockResolvedValue({
      criticalValidationMessages: [
        {
          code: 'EDS_LICENCE_TERM_LESS_THAN_ONE_YEAR',
        },
      ],
    } as RecordARecallValidationResult)

    // When
    const response = await request(app).get(`/person/${nomsId}/recall/create/start`)

    // Then
    expect(response.status).toEqual(302)
    const journeys = Object.values(session.createRecallJourneys!)
    expect(journeys).toHaveLength(1)
    expect(response.headers.location).toStrictEqual(
      `/person/${nomsId}/recall/create/${journeys[0].id}/validation-intercept`,
    )
  })

  it('should not remove any existing add journeys in the session', async () => {
    // Given
    calculateReleaseDatesService.validateForRecordARecall.mockResolvedValue(successfulCrdsValidationResult)
    const existingUuid = uuidv4()
    preExistingJourneysToAddToSession = [
      {
        id: existingUuid,
        lastTouched: new Date().toISOString(),
        isCheckingAnswers: false,
        nomsId,
        revocationDate: {
          day: 1,
          month: 2,
          year: 2025,
        },
        crdsValidationResult: successfulCrdsValidationResult,
      },
    ]

    // When
    const response = await request(app).get(`/person/${nomsId}/recall/create/start`)
    const { location } = response.headers

    // Then
    expect(response.status).toEqual(302)
    expect(location).toContain('/revocation-date')
    const journeys = Object.values(session.createRecallJourneys!)
    expect(journeys).toHaveLength(2)
    const newId = journeys.find(it => it.id !== existingUuid).id
    expect(session.createRecallJourneys![newId]!.id).toEqual(newId)
    expect(session.createRecallJourneys![newId]!.lastTouched).toBeTruthy()
  })

  it('should remove the oldest if there will be more than 5 journeys', async () => {
    // Given
    calculateReleaseDatesService.validateForRecordARecall.mockResolvedValue(successfulCrdsValidationResult)
    preExistingJourneysToAddToSession = [
      {
        id: 'old',
        lastTouched: new Date(2024, 1, 1, 11, 30).toISOString(),
        nomsId,
        isCheckingAnswers: false,
        crdsValidationResult: successfulCrdsValidationResult,
      },
      {
        id: 'middle-aged',
        lastTouched: new Date(2024, 1, 1, 12, 30).toISOString(),
        nomsId,
        isCheckingAnswers: false,
        crdsValidationResult: successfulCrdsValidationResult,
      },
      {
        id: 'youngest',
        lastTouched: new Date(2024, 1, 1, 14, 30).toISOString(),
        nomsId,
        isCheckingAnswers: false,
        crdsValidationResult: successfulCrdsValidationResult,
      },
      {
        id: 'oldest',
        lastTouched: new Date(2024, 1, 1, 10, 30).toISOString(),
        nomsId,
        isCheckingAnswers: false,
        crdsValidationResult: successfulCrdsValidationResult,
      },
      {
        id: 'young',
        lastTouched: new Date(2024, 1, 1, 13, 30).toISOString(),
        nomsId,
        isCheckingAnswers: false,
        crdsValidationResult: successfulCrdsValidationResult,
      },
    ]

    // When
    const response = await request(app).get(`/person/${nomsId}/recall/create/start`)
    const { location } = response.headers

    // Then
    expect(location).toContain('/revocation-date')
    const journeys = Object.values(session.createRecallJourneys!)
    const newId = journeys.find(it => it.id.length > 20).id
    expect(Object.keys(session.createRecallJourneys!).sort()).toStrictEqual(
      [newId, 'old', 'middle-aged', 'young', 'youngest'].sort(),
    )
  })
})
