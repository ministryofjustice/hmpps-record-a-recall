import { Request as ExpressRequest, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { SessionData } from 'express-session'
import { PersonJourneyParams } from '../@types/journeys'
import { ensureInCreateRecallJourney } from './journeyMiddleware'
import { user } from '../routes/testutils/appSetup'

type Request = ExpressRequest<PersonJourneyParams>

describe('journeyMiddleware', () => {
  describe('ensureInCreateRecallJourney', () => {
    const journeyId = uuidv4()
    const nomsId = 'A1234BC'
    let req: Request
    let res: Response
    beforeEach(() => {
      req = {
        params: { journeyId, nomsId },
        session: {} as Partial<SessionData>,
      } as unknown as Request
      res = { redirect: jest.fn(), locals: { user } } as unknown as Response
    })

    it('should proceed if the journey is in the session and update the last touched date', () => {
      const next = jest.fn()
      const lastTouchedBeforeCall = new Date(2020, 1, 1)
      req.session.createRecallJourneys = {}
      req.session.createRecallJourneys[journeyId] = {
        id: journeyId,
        lastTouched: lastTouchedBeforeCall.toISOString(),
        nomsId,
        isManual: false,
        isCheckingAnswers: false,
        crdsValidationResult: {
          criticalValidationMessages: [],
          otherValidationMessages: [],
          earliestSentenceDate: '2019-01-01',
        },
      }
      ensureInCreateRecallJourney(req, res, next)
      expect(next).toHaveBeenCalledTimes(1)
      expect(new Date(req.session.createRecallJourneys[journeyId].lastTouched).getTime()).toBeGreaterThan(
        lastTouchedBeforeCall.getTime(),
      )
    })
    it('should return to start if the journey is not in the session', () => {
      const next = jest.fn()
      req.session.createRecallJourneys = {}
      ensureInCreateRecallJourney(req, res, next)
      expect(next).toHaveBeenCalledTimes(0)
      expect(res.redirect).toHaveBeenCalledWith(`/person/${nomsId}/recall/create/start`)
    })
    it('should return to start if no journeys created at all', () => {
      const next = jest.fn()
      ensureInCreateRecallJourney(req, res, next)
      expect(next).toHaveBeenCalledTimes(0)
      expect(res.redirect).toHaveBeenCalledWith(`/person/${nomsId}/recall/create/start`)
    })
  })
})
