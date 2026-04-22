import type { Express } from 'express'
import request from 'supertest'
import { SessionData } from 'express-session'
import { v4 as uuidv4 } from 'uuid'
import { RecallJourney } from '../../../@types/journeys'
import { appWithAllRoutes, user } from '../../testutils/appSetup'
import CalculateReleaseDatesService from '../../../services/calculateReleaseDatesService'
import { RecordARecallValidationResult } from '../../../@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'
import AuditService from '../../../services/auditService'
import RecallService from '../../../services/recallService'

let app: Express

type TestSession = Partial<SessionData> & {
  unknownPreRecallByNomsId?: Record<string, boolean | string>
}

let session: TestSession

let preExistingJourneysToAddToSession: Array<RecallJourney>

const nomsId = 'A1234BC'

const successfulCrdsValidationResult = {
  latestCriticalMessages: [],
  latestOtherMessages: [],
  penultimateCriticalMessages: [],
  penultimateOtherMessages: [],
  earliestSentenceDate: '2025-01-01',
} as RecordARecallValidationResult

jest.mock('../../../services/calculateReleaseDatesService')
jest.mock('../../../services/auditService')
jest.mock('../../../services/recallService')

const calculateReleaseDatesService = new CalculateReleaseDatesService(null) as jest.Mocked<CalculateReleaseDatesService>

const auditService = new AuditService(null) as jest.Mocked<AuditService>
const recallService = new RecallService(null, null, null, null) as jest.Mocked<RecallService>

beforeEach(() => {
  preExistingJourneysToAddToSession = undefined

  app = appWithAllRoutes({
    services: {
      calculateReleaseDatesService,
      auditService,
      recallService,
    },
    userSupplier: () => user,
    sessionReceiver: (receivedSession: Partial<SessionData>) => {
      session = receivedSession as TestSession

      // ensure session object exists
      if (!session.unknownPreRecallByNomsId) {
        session.unknownPreRecallByNomsId = {}
      }

      if (preExistingJourneysToAddToSession) {
        session.recallJourneys = {}
        preExistingJourneysToAddToSession.forEach((journey: RecallJourney) => {
          session.recallJourneys![journey.id] = journey
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
    calculateReleaseDatesService.validateForRecordARecall.mockResolvedValue(successfulCrdsValidationResult)
    recallService.hasSentences.mockResolvedValue(true)

    const response = await request(app).get(`/person/${nomsId}/recall/create/start`)

    expect(response.status).toEqual(302)

    const journeys = Object.values(session.recallJourneys!)
    expect(journeys).toHaveLength(1)

    expect(response.headers.location).toStrictEqual(`/person/${nomsId}/recall/create/${journeys[0].id}/revocation-date`)

    expect(recallService.fixManyCharges).toHaveBeenCalledWith(nomsId, 'user1')
  })

  it('should create the journey and redirect to validation intercept if critical errors exist', async () => {
    calculateReleaseDatesService.validateForRecordARecall.mockResolvedValue({
      latestCriticalMessages: [{ code: 'EDS_LICENCE_TERM_LESS_THAN_ONE_YEAR' }],
    } as RecordARecallValidationResult)

    recallService.hasSentences.mockResolvedValue(true)

    const response = await request(app).get(`/person/${nomsId}/recall/create/start`)

    expect(response.status).toEqual(302)

    const journeys = Object.values(session.recallJourneys!)
    expect(journeys).toHaveLength(1)

    expect(response.headers.location).toStrictEqual(
      `/person/${nomsId}/recall/create/${journeys[0].id}/validation-intercept`,
    )

    expect(recallService.fixManyCharges).toHaveBeenCalledWith(nomsId, 'user1')
  })

  it('should not remove any existing add journeys in the session', async () => {
    calculateReleaseDatesService.validateForRecordARecall.mockResolvedValue(successfulCrdsValidationResult)

    const existingUuid = uuidv4()

    preExistingJourneysToAddToSession = [
      {
        id: existingUuid,
        lastTouched: new Date().toISOString(),
        isCheckingAnswers: false,
        nomsId,
        revocationDate: { day: 1, month: 2, year: 2025 },
        crdsValidationResult: successfulCrdsValidationResult,
      },
    ]

    recallService.hasSentences.mockResolvedValue(true)

    const response = await request(app).get(`/person/${nomsId}/recall/create/start`)

    expect(response.status).toEqual(302)
    expect(response.headers.location).toContain('/revocation-date')

    const journeys = Object.values(session.recallJourneys!)
    expect(journeys).toHaveLength(2)

    const newId = journeys.find(it => it.id !== existingUuid)!.id
    expect(session.recallJourneys![newId]!.id).toEqual(newId)
    expect(session.recallJourneys![newId]!.lastTouched).toBeTruthy()
  })

  it('should remove the oldest if there will be more than 5 journeys', async () => {
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

    recallService.hasSentences.mockResolvedValue(true)

    const response = await request(app).get(`/person/${nomsId}/recall/create/start`)

    expect(response.headers.location).toContain('/revocation-date')

    const journeys = Object.values(session.recallJourneys!)
    const newId = journeys.find(it => it.id.length > 20)!.id

    expect(Object.keys(session.recallJourneys!).sort()).toStrictEqual(
      [newId, 'old', 'middle-aged', 'young', 'youngest'].sort(),
    )
  })

  it('should redirect to no-sentences intercept if prisoner has no sentences', async () => {
    calculateReleaseDatesService.validateForRecordARecall.mockResolvedValue(successfulCrdsValidationResult)
    recallService.hasSentences.mockResolvedValue(false)

    const response = await request(app).get(`/person/${nomsId}/recall/create/start`)

    expect(response.status).toEqual(302)
    expect(response.headers.location).toStrictEqual(`/person/${nomsId}/recall/create/no-sentences`)
    expect(recallService.fixManyCharges).not.toHaveBeenCalled()
  })

  it('should redirect to validation intercept if penultimate critical errors exist', async () => {
    calculateReleaseDatesService.validateForRecordARecall.mockResolvedValue({
      latestCriticalMessages: [],
      penultimateCriticalMessages: [{ code: 'EDS_LICENCE_TERM_MORE_THAN_EIGHT_YEARS' }],
    } as RecordARecallValidationResult)

    recallService.hasSentences.mockResolvedValue(true)

    const response = await request(app).get(`/person/${nomsId}/recall/create/start`)

    expect(response.status).toEqual(302)
    expect(response.headers.location).toMatch(new RegExp(`^/person/${nomsId}/recall/create/.+/validation-intercept$`))
  })

  it('should clear unknown pre recall flag when starting a new journey', async () => {
    calculateReleaseDatesService.validateForRecordARecall.mockResolvedValue(successfulCrdsValidationResult)
    recallService.hasSentences.mockResolvedValue(true)

    await request(app).get(`/person/${nomsId}/recall/create/start`).expect(302)

    session.unknownPreRecallByNomsId = session.unknownPreRecallByNomsId ?? {}
    session.unknownPreRecallByNomsId[nomsId] = 'PENDING'

    await request(app).get(`/person/${nomsId}/recall/create/start`)

    expect(session.unknownPreRecallByNomsId?.[nomsId]).toBeUndefined()
  })
})
