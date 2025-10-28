/* eslint-disable no-param-reassign */
import type { Express } from 'express'
import request from 'supertest'
import { SessionData } from 'express-session'
import { v4 as uuidv4 } from 'uuid'
import * as cheerio from 'cheerio'
import { CreateRecallJourney } from '../../../../@types/journeys'
import { appWithAllRoutes, user } from '../../../testutils/appSetup'
import RecallService from '../../../../services/recallService'
import { RecallableCourtCase } from '../../../../@types/remandAndSentencingApi/remandAndSentencingTypes'

let app: Express
let existingJourney: CreateRecallJourney
const nomsId = 'A1234BC'
const journeyId: string = uuidv4()

jest.mock('../../../../services/recallService')
const recallService = new RecallService(null) as jest.Mocked<RecallService>

beforeEach(() => {
  existingJourney = {
    id: journeyId,
    lastTouched: new Date().toISOString(),
    nomsId,
    isCheckingAnswers: false,
    crdsValidationResult: {
      criticalValidationMessages: [],
      otherValidationMessages: [],
      earliestSentenceDate: '2025-01-01',
    },
  }
  app = appWithAllRoutes({
    services: { recallService },
    userSupplier: () => user,
    sessionReceiver: (receivedSession: Partial<SessionData>) => {
      receivedSession.createRecallJourneys = {}
      receivedSession.createRecallJourneys[journeyId] = existingJourney
    },
  })
})

afterEach(() => {
  jest.resetAllMocks()
})

describe('GET', () => {
  const url = `/person/${nomsId}/recall/create/${journeyId}/manual/select-court-cases`

  it('renders the first recallable court case (index defaults to 0) and shows recallable/non-recallable sections', async () => {
    // Arrange: set service return to include split sentences
    const s1 = { isRecallable: true, sentenceTypeDescription: 'Standard Determinate' } as any
    const s2 = { isRecallable: false, sentenceTypeDescription: 'Community Order' } as any
    const s3 = { isRecallable: true, sentenceTypeDescription: 'Standard Determinate' } as any

    recallService.getRecallableCourtCases.mockResolvedValue([
      {
        courtCaseUuid: 'uuid-1',
        reference: 'REF-1',
        courtCode: 'ABC',
        status: 'ACTIVE',
        isSentenced: true,
        date: '2025-01-01',
        firstDayInCustody: '2024-12-15',
        sentences: [s1, s2],
        recallableSentences: [s1],
        nonRecallableSentences: [s2],
      },
      {
        courtCaseUuid: 'uuid-2',
        reference: 'REF-2',
        courtCode: 'DEF',
        status: 'ACTIVE',
        isSentenced: true,
        date: '2025-02-10',
        sentences: [s3],
        recallableSentences: [s3],
        nonRecallableSentences: [],
      },
    ] as Array<
      RecallableCourtCase & {
        recallableSentences: any[]
        nonRecallableSentences: any[]
      }
    >)

    // Act
    const res = await request(app).get(url).expect(200)
    console.log(res.text)
    const $ = cheerio.load(res.text)

    // Assert: service call
    expect(recallService.getRecallableCourtCases).toHaveBeenCalledWith(nomsId)

    // Page framing
    expect(res.text).toContain('Select all cases that had an active sentence')
    expect(res.text).toContain('Court case 1 of 2')

    // // Recallable section heading from the NJK
    expect(res.text).toContain('View offences which are not eligible for recall (1)')

    // todo
  })
})
