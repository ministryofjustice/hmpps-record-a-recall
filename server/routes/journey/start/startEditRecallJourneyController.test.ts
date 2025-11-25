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
import TestData from '../../../testutils/testData'
import { ExistingRecallCourtCase } from '../../../model/ExistingRecall'

let app: Express
let session: Partial<SessionData>
let preExistingJourneysToAddToSession: Array<RecallJourney>
const nomsId = 'A1234BC'
const successfulCrdsValidationResult = {
  criticalValidationMessages: [],
  otherValidationMessages: [],
  earliestSentenceDate: '2025-01-01',
} as RecordARecallValidationResult
const recallId = uuidv4()

jest.mock('../../../services/calculateReleaseDatesService')
jest.mock('../../../services/auditService')
jest.mock('../../../services/recallService')

const recallService = new RecallService(null, null, null, null) as jest.Mocked<RecallService>
const calculateReleaseDatesService = new CalculateReleaseDatesService(null) as jest.Mocked<CalculateReleaseDatesService>
const auditService = new AuditService(null) as jest.Mocked<AuditService>

beforeEach(() => {
  app = appWithAllRoutes({
    services: {
      calculateReleaseDatesService,
      auditService,
      recallService,
    },
    userSupplier: () => user,
    sessionReceiver: (receivedSession: Partial<SessionData>) => {
      session = receivedSession
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

describe('GET /person/:nomsId/recall/edit/:recallId/start', () => {
  it('should create the journey session from api and redirect to check answers page', async () => {
    // Given
    recallService.getRecall.mockResolvedValue(TestData.existingRecall())
    calculateReleaseDatesService.validateForRecordARecall.mockResolvedValue(successfulCrdsValidationResult)

    // When
    const response = await request(app).get(`/person/${nomsId}/recall/edit/${recallId}/start`)

    // Then
    expect(response.status).toEqual(302)
    const journeys = Object.values(session.recallJourneys!)
    expect(journeys).toHaveLength(1)
    expect(journeys[0].recallId).toBe(recallId)
    expect(response.headers.location).toStrictEqual(
      `/person/${nomsId}/recall/edit/${recallId}/${journeys[0].id}/check-answers`,
    )
  })
  it('should create the journey and redirect to validation intercept if critical errors exist', async () => {
    // Given
    recallService.getRecall.mockResolvedValue(TestData.existingRecall())
    calculateReleaseDatesService.validateForRecordARecall.mockResolvedValue({
      criticalValidationMessages: [
        {
          code: 'EDS_LICENCE_TERM_LESS_THAN_ONE_YEAR',
        },
      ],
    } as RecordARecallValidationResult)

    // When
    const response = await request(app).get(`/person/${nomsId}/recall/edit/${recallId}/start`)

    // Then
    expect(response.status).toEqual(302)
    const journeys = Object.values(session.recallJourneys!)
    expect(journeys).toHaveLength(1)
    expect(response.headers.location).toStrictEqual(
      `/person/${nomsId}/recall/edit/${recallId}/${journeys[0].id}/validation-intercept`,
    )
  })

  it('should not remove any existing add journeys in the session', async () => {
    // Given
    recallService.getRecall.mockResolvedValue(TestData.existingRecall())
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
    const response = await request(app).get(`/person/${nomsId}/recall/edit/${recallId}/start`)
    const { location } = response.headers

    // Then
    expect(response.status).toEqual(302)
    expect(location).toContain('/check-answers')
    const journeys = Object.values(session.recallJourneys!)
    expect(journeys).toHaveLength(2)
    const newId = journeys.find(it => it.id !== existingUuid).id
    expect(session.recallJourneys![newId]!.id).toEqual(newId)
    expect(session.recallJourneys![newId]!.lastTouched).toBeTruthy()
  })

  it('should remove the oldest if there will be more than 5 journeys', async () => {
    // Given
    recallService.getRecall.mockResolvedValue(TestData.existingRecall())
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
    const response = await request(app).get(`/person/${nomsId}/recall/edit/${recallId}/start`)
    const { location } = response.headers

    // Then
    expect(location).toContain('/check-answers')
    const journeys = Object.values(session.recallJourneys!)
    const newId = journeys.find(it => it.id.length > 20).id
    expect(Object.keys(session.recallJourneys!).sort()).toStrictEqual(
      [newId, 'old', 'middle-aged', 'young', 'youngest'].sort(),
    )
  })

  it('should call getRecallableCourtCases on manual journey and set courtCaseIdsExcludedFromRecall correctly', async () => {
    // Given: manual journey (no calculationRequestId)
    const existingRecall = TestData.existingRecall()
    existingRecall.calculationRequestId = undefined
    preExistingJourneysToAddToSession = []

    recallService.getRecall.mockResolvedValue(existingRecall)
    calculateReleaseDatesService.validateForRecordARecall.mockResolvedValue(successfulCrdsValidationResult)

    recallService.getRecallableCourtCases.mockResolvedValue([TestData.recallableCourtCase()])

    // When
    const response = await request(app).get(`/person/${nomsId}/recall/edit/${recallId}/start`)

    // Then
    expect(response.status).toEqual(302)
    expect(recallService.getRecallableCourtCases).toHaveBeenCalledWith(nomsId, user.username)

    const journeys = Object.values(session.recallJourneys!)
    expect(journeys).toHaveLength(1)
    const newJourney = journeys[0]
    expect(newJourney.courtCaseIdsSelectedForRecall).toEqual([])
    expect(newJourney.courtCaseIdsExcludedFromRecall).toEqual(['uuid-1'])
    expect(response.headers.location).toContain('/check-answers')
  })

  it('should call getRecallableCourtCases on manual journey and set courtCaseIdsSelectedForRecall correctly', async () => {
    // Given: manual journey (no calculationRequestId)
    const courtCase = { courtCaseUuid: 'uuid-1' } as ExistingRecallCourtCase
    const existingRecall = TestData.existingRecall({ courtCases: [courtCase] })
    existingRecall.calculationRequestId = undefined
    preExistingJourneysToAddToSession = []

    recallService.getRecall.mockResolvedValue(existingRecall)
    calculateReleaseDatesService.validateForRecordARecall.mockResolvedValue(successfulCrdsValidationResult)

    recallService.getRecallableCourtCases.mockResolvedValue([TestData.recallableCourtCase()])

    // When
    const response = await request(app).get(`/person/${nomsId}/recall/edit/${recallId}/start`)

    // Then
    expect(response.status).toEqual(302)
    expect(recallService.getRecallableCourtCases).toHaveBeenCalledWith(nomsId, user.username)

    const journeys = Object.values(session.recallJourneys!)
    expect(journeys).toHaveLength(1)
    const newJourney = journeys[0]
    expect(newJourney.courtCaseIdsSelectedForRecall).toEqual(['uuid-1'])
    expect(newJourney.courtCaseIdsExcludedFromRecall).toEqual([])
    expect(response.headers.location).toContain('/check-answers')
  })
})
