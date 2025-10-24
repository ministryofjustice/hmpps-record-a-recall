/* eslint-disable import/prefer-default-export */
import { Request } from 'express'
import logger from '../../logger'
import { PersonJourneyParams } from '../@types/journeys'
import asyncMiddleware from './asyncMiddleware'

export const ensureInCreateRecallJourney = asyncMiddleware(async (req: Request<PersonJourneyParams>, res, next) => {
  const { journeyId, nomsId } = req.params
  if (!req.session.createRecallJourneys) {
    req.session.createRecallJourneys = {}
  }
  if (!req.session.createRecallJourneys[journeyId]) {
    logger.warn(
      `Create recall journey (${journeyId}) not found in session for user ${res.locals.user?.username}. Returning to start of journey.`,
    )
    return res.redirect(`/person/${nomsId}/recall/create/start`)
  }
  req.session.createRecallJourneys[journeyId].lastTouched = new Date().toISOString()
  return next()
})
