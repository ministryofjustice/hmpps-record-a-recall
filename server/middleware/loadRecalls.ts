import { Request, Response, NextFunction } from 'express'
// eslint-disable-next-line import/no-unresolved
import { Recall } from 'models'
import logger from '../../logger'
import RecallService from '../services/recallService'
import PrisonService from '../services/PrisonService'
import ManageOffencesService from '../services/manageOffencesService'
import CourtCaseService from '../services/CourtCaseService'

/**
 * Middleware to load recalls with location names and offence descriptions into res.locals
 */
export default function loadRecalls(
  recallService: RecallService,
  prisonService: PrisonService,
  manageOffencesService: ManageOffencesService,
  courtCaseService: CourtCaseService,
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

        // Fetch firstDayInCustody from searchCourtCases
        let firstDayInCustody: string | null = null
        try {
          const courtCasesSearch = await recallService.searchCourtCases(nomisId, user.username)
          firstDayInCustody = courtCasesSearch?.content?.[0]?.firstDayInCustody || null
        } catch (err) {
          logger.error(`Error fetching firstDayInCustody for ${nomisId}:`, err)
        }
        res.locals.firstDayInCustody = firstDayInCustody

        // Fetch court cases to get offence codes
        let courtCasesResponse
        let courtCasesFetchError = false
        try {
          courtCasesResponse = await courtCaseService.getAllRecallableCourtCases(nomisId, user.username)
        } catch (error) {
          logger.error('Error fetching court cases for offence codes:', error)
          courtCasesFetchError = true
        }

        const courtCases = courtCasesResponse?.cases || []

        if (courtCasesFetchError) {
          logger.warn(`Unable to fetch court cases for ${nomisId}, offence descriptions may be missing`)
        }

        // Create a map of sentenceId to offenceCode from court cases
        const sentenceOffenceMap: Record<string, string> = {}
        courtCases.forEach(courtCase => {
          if (courtCase.sentences && Array.isArray(courtCase.sentences)) {
            courtCase.sentences.forEach(sentence => {
              if (sentence.sentenceUuid && sentence.offenceCode) {
                sentenceOffenceMap[sentence.sentenceUuid] = sentence.offenceCode
              }
            })
          }
        })

        // Collect all offence codes from all recalls
        const allOffenceCodes: string[] = []
        recalls.forEach(recall => {
          if (recall.sentences && Array.isArray(recall.sentences)) {
            recall.sentences.forEach(sentence => {
              // Try to get offence code from the sentence itself first
              if (sentence.offenceCode && typeof sentence.offenceCode === 'string') {
                allOffenceCodes.push(sentence.offenceCode)
              } else if (sentence.sentenceUuid && sentenceOffenceMap[sentence.sentenceUuid]) {
                // Otherwise, get it from the court case mapping
                allOffenceCodes.push(sentenceOffenceMap[sentence.sentenceUuid])
              }
            })
          }
        })

        // Fetch offence descriptions
        let offenceMap: Record<string, string> = {}
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

          const enhancedSentences = recall.sentences?.reduce((acc, sentence) => {
            if ('status' in sentence && sentence.status === 'DELETED') {
              return acc
            }

            const offenceCode =
              sentence.offenceCode || (sentence.sentenceUuid && sentenceOffenceMap[sentence.sentenceUuid]) || ''

            acc.push({
              ...sentence,
              offenceCode,
              offenceDescription: offenceMap[offenceCode] || undefined,
            })

            return acc
          }, [])

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
        res.locals.firstDayInCustody = null
      }
    } catch (error) {
      logger.error(error, `Failed to load recalls for ${nomisId}`)
      res.locals.recalls = []
      res.locals.firstDayInCustody = null
    }

    return next()
  }
}

export function isRecallFromNomis(recall: Recall): boolean {
  return recall?.source === 'NOMIS'
}

function findLatestRecallId(recalls: Recall[]): string | undefined {
  if (!recalls || recalls.length === 0) {
    return undefined
  }

  const latestRecall = recalls.reduce((latest, current) => {
    if (!latest.createdAt || (current.createdAt && new Date(current.createdAt) > new Date(latest.createdAt))) {
      return current
    }
    return latest
  }, recalls[0])

  return latestRecall?.recallId
}
