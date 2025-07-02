import { Request, Response, NextFunction } from 'express'
// eslint-disable-next-line import/no-unresolved
import { Recall } from 'models'
import logger from '../../logger'
import RecallService from '../services/recallService'
import PrisonService from '../services/PrisonService'
import { RecallableSentence } from '../@types/remandAndSentencingApi/remandAndSentencingTypes'

/**
 * Middleware to load recalls with location names into res.locals
 */
export default function loadRecalls(recallService: RecallService, prisonService: PrisonService) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { nomisId, user } = res.locals

    if (!nomisId || !user?.username) {
      logger.warn('Missing nomisId or username in res.locals')
      return next()
    }

    try {
      const recalls = await recallService.getAllRecalls(nomisId, user.username)

      if (recalls && recalls.length > 0) {
        // Get location names for all recalls
        const locationIds = recalls.map(r => r.location)
        const prisonNames = await prisonService.getPrisonNames(locationIds, user.username)

        // Enhance recalls with location name and source (if from NOMIS)
        const recallsWithExtras = recalls.map(recall => {
          const isFromNomis = recall.sentences?.some(isRecallFromNomis)

          return {
            ...recall,
            locationName: prisonNames.get(recall.location),
            ...(isFromNomis ? { source: 'nomis' as const } : {}),
          }
        })

        res.locals.recalls = recallsWithExtras
        res.locals.latestRecallId = findLatestRecallId(recallsWithExtras)
      } else {
        res.locals.recalls = []
        res.locals.latestRecallId = undefined
      }
    } catch (error) {
      logger.error(error, `Failed to load recalls for ${nomisId}`)
      res.locals.recalls = []
    }

    return next()
  }
}

export function isRecallFromNomis(recall: Recall): boolean {
  return recall?.created_by_username === 'hmpps-prisoner-from-nomis-migration-court-sentencing-1'
}

// check the last sentence in recall 


/**
 * Find the latest recall by createdAt date
 */
function findLatestRecallId(recalls: Recall[]): string | undefined {
  if (!recalls || recalls.length === 0) {
    return undefined
  }

  const latestRecall = recalls.reduce((latest, current) => {
    if (
      !latest ||
      (current.createdAt && latest.createdAt && new Date(current.createdAt) > new Date(latest.createdAt))
    ) {
      return current
    }
    return latest
  }, null)

  return latestRecall?.recallId
}
