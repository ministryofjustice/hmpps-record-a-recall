/* eslint-disable import/prefer-default-export */
import { Request } from 'express'
import logger from '../../logger'
import { PersonJourneyParams } from '../@types/journeys'
import asyncMiddleware from './asyncMiddleware'
import RecallJourneyUrls from '../routes/create/createRecallUrls'

export const ensureInCreateRecallJourney = asyncMiddleware(async (req: Request<PersonJourneyParams>, res, next) => {
  const { journeyId, nomsId, createOrEdit, recallId } = req.params
  if (!req.session.recallJourneys) {
    req.session.recallJourneys = {}
  }
  if (!req.session.recallJourneys[journeyId]) {
    logger.warn(
      `Create recall journey (${journeyId}) not found in session for user ${res.locals.user?.username}. Returning to start of journey.`,
    )
    return res.redirect(RecallJourneyUrls.start(nomsId, createOrEdit, recallId))
  }
  req.session.recallJourneys[journeyId].lastTouched = new Date().toISOString()
  return next()
})
