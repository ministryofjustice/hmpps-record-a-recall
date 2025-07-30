import { Request, Response, NextFunction } from 'express'
import logger from '../../logger'
import RecallService from '../services/recallService'
import PrisonService from '../services/PrisonService'
import ManageOffencesService from '../services/manageOffencesService'
import CourtService from '../services/CourtService'
import { Recall } from 'models'

export default function loadRecalls(
  recallService: RecallService,
  prisonService: PrisonService,
  manageOffencesService: ManageOffencesService,
  courtService: CourtService,
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { nomisId, user, recallableCourtCases } = res.locals

    if (!nomisId || !user?.username) {
      logger.warn('Missing nomisId or username in res.locals')
      return next()
    }

    if (!recallableCourtCases || !Array.isArray(recallableCourtCases)) {
      logger.warn('No recallableCourtCases in res.locals, skipping recall load')
      res.locals.recalls = []
      res.locals.latestRecallId = undefined
      return next()
    }

    try {
      const allRecalls = await recallService.getAllRecalls(nomisId, user.username)
      const recalls = allRecalls?.filter(r => true) || []

      if (recalls.length === 0) {
        res.locals.recalls = []
        res.locals.latestRecallId = undefined
        return next()
      }

      // Fetch prison names for recall locations
      const locationIds = recalls.map(r => r.location).filter(Boolean)
      const prisonNames = await prisonService.getPrisonNames(locationIds, user.username)

      // before we were mapping through sentences inside the recall to get offence codes, but they are not in there
      const offenceCodeSet = new Set<string>()
      recallableCourtCases.forEach((courtCase: any) => {
        courtCase.sentences?.forEach((sentence: any) => {
          if (sentence.offenceCode) offenceCodeSet.add(sentence.offenceCode)
        })
      })
      const offenceCodes = [...offenceCodeSet].filter(Boolean)

      // Fetch offence descriptions map using ManageOffencesService
      let offenceMap: Record<string, string> = {}
      if (offenceCodes.length > 0) {
        try {
          offenceMap = await manageOffencesService.getOffenceMap(offenceCodes, user.token)
          logger.debug(`[loadRecalls] Fetched offence descriptions for ${Object.keys(offenceMap).length} codes`)
        } catch (error) {
          logger.error('Error fetching offence descriptions:', error)
        }
      } else {
        logger.debug('[loadRecalls] No offence codes found to fetch descriptions')
      }
      const courtCodeSet = new Set<string>()
      recallableCourtCases.forEach((courtCase: any) => {
        if (courtCase.courtCode) courtCodeSet.add(courtCase.courtCode)
      })
      const courtNamesMap = await courtService.getCourtNames([...courtCodeSet], user.username)

      const enrichedRecalls = recalls.map(recall => {
        const enhancedSentences = recall.sentences
          ?.filter(sentence => sentence.status !== 'DELETED')
          .map(sentence => ({
            ...sentence,
            offenceDescription: offenceMap[sentence.offenceCode || ''] || undefined,
          }))

        let courtName: string | undefined
        for (const courtCaseId of recall.courtCaseIds || []) {
          const matchedCourtCase = recallableCourtCases.find((c: any) => c.caseId === courtCaseId)
          if (matchedCourtCase) {
            courtName = courtNamesMap.get(matchedCourtCase.courtCode) || undefined
            if (courtName) break
          }
        }

        return {
          ...recall,
          locationName: prisonNames.get(recall.location),
          courtName,
          sentences: enhancedSentences || recall.sentences,
        }
      })

      res.locals.recalls = enrichedRecalls
      res.locals.latestRecallId = findLatestRecallId(enrichedRecalls)
    } catch (error) {
      logger.error(error, `Failed to load recalls for ${nomisId}`)
      res.locals.recalls = []
      res.locals.latestRecallId = undefined
    }

    return next()
  }
}

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
  }, null as Recall | null)

  return latestRecall?.recallId
}
