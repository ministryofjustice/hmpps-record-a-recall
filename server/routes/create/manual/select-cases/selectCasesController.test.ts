/* eslint-disable no-param-reassign */
import type { Express } from 'express'
import request from 'supertest'
import { SessionData } from 'express-session'
import { v4 as uuidv4 } from 'uuid'
import * as cheerio from 'cheerio'
import { CreateRecallJourney } from '../../../../@types/journeys'
import { appWithAllRoutes, user } from '../../../testutils/appSetup'
import RecallService from '../../../../services/recallService'
import {
  RecallableCourtCase,
  RecallableCourtCaseSentence,
} from '../../../../@types/remandAndSentencingApi/remandAndSentencingTypes'
import TestData from '../../../../testutils/testData'

let app: Express
let existingJourney: CreateRecallJourney
const nomsId = 'A1234BC'
const journeyId: string = uuidv4()

jest.mock('../../../../services/recallService')
const recallService = new RecallService(null, null, null, null) as jest.Mocked<RecallService>

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
    // Given
    const s1 = TestData.recallableSentence({ offenceCode: 'OFF1', offenceDescription: 'Offence 1' })
    const s2 = TestData.nonRecallableSentence({ offenceCode: 'OFF2', offenceDescription: 'Offence 2' })
    const s3 = TestData.recallableSentence({ offenceCode: 'OFF3', offenceDescription: 'Offence 3' })

    recallService.getRecallableCourtCases.mockResolvedValue([
      TestData.recallableCourtCase([s1], [s2], {
        courtCaseUuid: 'uuid-1',
        reference: 'REF-1',
      }),
      TestData.recallableCourtCase([s3], [], {
        courtCaseUuid: 'uuid-2',
        reference: 'REF-2',
      }),
    ] as Array<
      RecallableCourtCase & {
        recallableSentences: RecallableCourtCaseSentence[]
        nonRecallableSentences: RecallableCourtCaseSentence[]
      }
    >)

    // When
    const res = await request(app).get(url).expect(200)

    // Then
    const $ = cheerio.load(res.text)

    expect(recallService.getRecallableCourtCases).toHaveBeenCalledWith(nomsId)
    expect(res.text).toContain('Select all cases that had an active sentence')
    expect(res.text).toContain('Court case 1 of 2')
    expect(res.text).toContain('View offences which are not eligible for recall (1)')

    const recallableText = $('[data-qa="recallable-sentences"]').text()
    expect(recallableText).toContain('OFF1')
    expect(recallableText).toContain('Offence 1')

    const nonRecallableText = $('[data-qa="non-recallable-sentences"]').text()
    expect(nonRecallableText).toContain('OFF2')
    expect(nonRecallableText).toContain('Offence 2')
  })
})
