import { Request, Response, NextFunction } from 'express'
// eslint-disable-next-line import/no-unresolved
import { Recall } from 'models'
import logger from '../../logger'
import RecallService from '../services/recallService'
import PrisonService from '../services/PrisonService'
import ManageOffencesService from '../services/manageOffencesService'

/**
 * Middleware to load recalls with location names and offence descriptions into res.locals
 */
export default function loadRecalls(
  recallService: RecallService,
  prisonService: PrisonService,
  manageOffencesService: ManageOffencesService,
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { nomisId, user } = res.locals

    if (!nomisId || !user?.username) {
      logger.warn('Missing nomisId or username in res.locals')
      return next()
    }

    try {
      const allRecalls = await recallService.getAllRecalls(nomisId, user.username)

      // Filter out any recalls that might have a deleted status (defensively)
      const recalls =
        allRecalls?.filter(recall => {
          return !('status' in recall && recall.status === 'DELETED')
        }) || []

      if (recalls && recalls.length > 0) {
        // Get location names for all recalls
        const locationIds = recalls.map(r => r.location)
        const prisonNames = await prisonService.getPrisonNames(locationIds, user.username)

        // Collect all offence codes from all recalls
        const allOffenceCodes: string[] = []
        recalls.forEach(recall => {
          if (recall.sentences && Array.isArray(recall.sentences)) {
            recall.sentences.forEach(sentence => {
              if (sentence.offenceCode && typeof sentence.offenceCode === 'string') {
                allOffenceCodes.push(sentence.offenceCode)
              }
            })
          }
        })

        // Fetch offence descriptions
        let offenceMap: Record<string, string> = {}
        // Remove duplicates and filter out falsy values
        const offenceCodes = [...new Set(allOffenceCodes)].filter(Boolean)
        if (offenceCodes.length > 0) {
          try {
            offenceMap = await manageOffencesService.getOffenceMap(offenceCodes, user.token)
            logger.debug(`Fetched descriptions for ${Object.keys(offenceMap).length} offence codes`)
          } catch (error) {
            logger.error('Error fetching offence descriptions from ManageOffencesService:', error)
          }
        }

        const recallsWithExtras = recalls.map(recall => {
          const isFromNomis = recall.sentences?.some(isRecallFromNomis)

          // Enhance sentences with offence descriptions and filter out deleted ones
          const enhancedSentences = recall.sentences
            ?.filter(sentence => {
              // Filter out any sentences with deleted status (defensive)
              return !('status' in sentence && sentence.status === 'DELETED')
            })
            ?.map(sentence => ({
              ...sentence,
              offenceDescription: offenceMap[sentence.offenceCode || ''] || undefined,
            }))

          return {
            ...recall,
            locationName: prisonNames.get(recall.location),
            sentences: enhancedSentences || recall.sentences,
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
  return recall?.source === 'NOMIS'
}

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
