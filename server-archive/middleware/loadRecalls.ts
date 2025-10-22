import { Request, Response, NextFunction } from 'express'
// eslint-disable-next-line import/no-unresolved
import { Recall, SentenceWithDpsUuid } from 'models'
import logger from '../../logger'
import RecallService from '../services/recallService'
import PrisonService from '../services/PrisonService'
import ManageOffencesService from '../services/manageOffencesService'
import CourtCaseService from '../services/CourtCaseService'
import CourtService from '../services/CourtService'

/**
 * Middleware to load recalls with location names and offence descriptions into res.locals
 */
export default function loadRecalls(
  recallService: RecallService,
  prisonService: PrisonService,
  manageOffencesService: ManageOffencesService,
  courtCaseService: CourtCaseService,
  courtService: CourtService,
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

        // Fetch court cases to get offence codes and sentence details
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

        // Get court names for all court cases
        const courtCodes = [...new Set(courtCases.map(cc => cc.courtCode).filter(Boolean))]
        let courtNameMap: Map<string, string> = new Map()
        if (courtCodes.length > 0 && courtService) {
          try {
            courtNameMap = await courtService.getCourtNames(courtCodes, user.username)
          } catch (error) {
            logger.error('Error fetching court names:', error)
          }
        }

        // Create a map of sentenceId to offenceCode from court cases
        const sentenceOffenceMap: Record<string, string> = {}
        // Create a map of sentenceId to court case info
        const sentenceCourtCaseMap: Record<
          string,
          { reference?: string; courtName?: string; courtCode?: string; date?: string }
        > = {}

        courtCases.forEach(courtCase => {
          const courtName = courtNameMap.get(courtCase.courtCode) || undefined

          if (courtCase.sentences && Array.isArray(courtCase.sentences)) {
            courtCase.sentences.forEach(sentence => {
              if (sentence.sentenceUuid && sentence.offenceCode) {
                sentenceOffenceMap[sentence.sentenceUuid] = sentence.offenceCode
              }
              if (sentence.sentenceUuid) {
                sentenceCourtCaseMap[sentence.sentenceUuid] = {
                  reference: courtCase.reference || undefined,
                  courtName,
                  courtCode: courtCase.courtCode,
                  date: courtCase.date,
                }
              }
            })
          }
        })

        // Build a map of sentenceUuid to grab sentenceDate
        const sentenceDetailsMap: Record<string, SentenceWithDpsUuid> = {}
        courtCases.forEach(courtCase => {
          courtCase.sentences?.forEach(sentence => {
            if (sentence.sentenceUuid) {
              sentenceDetailsMap[sentence.sentenceUuid] = sentence
            }
          })
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

          const enhancedSentences = recall.sentences?.reduce((acc, sentence) => {
            // Filter out any sentences with deleted status (defensive)
            if ('status' in sentence && sentence.status === 'DELETED') {
              return acc
            }

            // Get offence code either from sentence or from court case mapping
            const offenceCode =
              sentence.offenceCode || (sentence.sentenceUuid && sentenceOffenceMap[sentence.sentenceUuid]) || ''

            const sentenceDetails = sentenceDetailsMap[sentence.sentenceUuid] || {}
            const courtCaseInfo = sentenceCourtCaseMap[sentence.sentenceUuid] || {}

            acc.push({
              ...sentence,
              offenceCode, // Ensure offenceCode is populated
              offenceDescription: offenceMap[offenceCode] || undefined,
              sentenceDate: sentenceDetailsMap[sentence.sentenceUuid]?.sentenceDate || null,
              offenceStartDate: sentenceDetails.offenceStartDate || null,
              offenceEndDate: sentenceDetails.offenceEndDate || null,
              lineNumber: sentenceDetails.lineNumber ?? null,
              countNumber: sentenceDetails.countNumber ?? null,
              courtCaseReference: courtCaseInfo.reference,
              courtName: courtCaseInfo.courtName,
              courtCaseDate: courtCaseInfo.date,
            })

            return acc
          }, [])

          // Sort sentences by court case to ensure proper grouping in UI
          if (enhancedSentences && enhancedSentences.length > 0) {
            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
            enhancedSentences.sort((a: any, b: any) => {
              const caseKeyA = `${a.courtCaseReference || ''}|${a.courtCaseDate || ''}|${a.courtName || ''}`
              const caseKeyB = `${b.courtCaseReference || ''}|${b.courtCaseDate || ''}|${b.courtName || ''}`
              if (caseKeyA < caseKeyB) return -1
              if (caseKeyA > caseKeyB) return 1
              return 0
            })
          }

          return {
            ...recall,
            locationName: prisonNames.get(recall.location),
            sentences: enhancedSentences || recall.sentences,
            ...(isFromNomis ? { source: 'NOMIS' as const } : {}),
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
    if (!latest.createdAt || (current.createdAt && new Date(current.createdAt) > new Date(latest.createdAt))) {
      return current
    }
    return latest
  }, recalls[0])

  return latestRecall?.recallId
}
