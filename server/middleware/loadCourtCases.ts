import { NextFunction, Request, Response } from 'express'
import logger from '../../logger'
import CourtCaseService from '../services/CourtCaseService'
import ManageOffencesService from '../services/manageOffencesService'
import CourtService from '../services/CourtService'
import { RecallableCourtCase, RecallableSentence } from '../@types/remandAndSentencingApi/remandAndSentencingTypes'

// Enhanced types for court cases with additional fields
export type EnhancedRecallableSentence = RecallableSentence & {
  offenceDescription?: string
}

export type EnhancedRecallableCourtCase = RecallableCourtCase & {
  courtName?: string
  sentences: EnhancedRecallableSentence[]
}

/**
 * Middleware to load court cases details into res.locals with offence descriptions and court names
 */
export default function loadCourtCases(
  courtCaseService: CourtCaseService,
  manageOffencesService: ManageOffencesService,
  courtService: CourtService,
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { nomisId, user } = res.locals

    if (!nomisId || !user?.username) {
      logger.warn('Missing nomisId or username in res.locals')
      return next()
    }

    try {
      const response = await courtCaseService.getAllRecallableCourtCases(nomisId, user.username)
      const recallableCourtCases: RecallableCourtCase[] = response.cases || []

      // Enhance court cases with offence descriptions and court names
      if (recallableCourtCases && Array.isArray(recallableCourtCases) && recallableCourtCases.length > 0) {
        const [offenceEnhancedCases, courtNamesMap] = await Promise.all([
          enhanceCourtCasesWithOffenceDescriptions(recallableCourtCases, manageOffencesService, user.token),
          getCourtNamesMap(recallableCourtCases, courtService, user.username),
        ])

        // Apply court names to the offence-enhanced cases
        res.locals.recallableCourtCases = applyCourtNamesToEnhancedCases(offenceEnhancedCases, courtNamesMap)
      } else {
        res.locals.recallableCourtCases = recallableCourtCases
      }

      logger.debug(`Court cases details loaded for ${nomisId}`)
    } catch (error) {
      logger.error(error, `Failed to retrieve Court cases for: ${nomisId}`)
      res.locals.recallableCourtCases = null
    }
    return next()
  }
}

/**
 * Enhances court cases by adding offence descriptions to sentences
 * @param cases Array of court cases to enhance
 * @param manageOffencesService Service to fetch offence descriptions
 * @param userToken User authentication token
 * @returns Enhanced court cases with offence descriptions
 */
async function enhanceCourtCasesWithOffenceDescriptions(
  cases: RecallableCourtCase[],
  manageOffencesService: ManageOffencesService,
  userToken: string,
): Promise<EnhancedRecallableCourtCase[]> {
  try {
    // Collect unique offence codes
    const allOffenceCodes = new Set<string>()

    cases.forEach(courtCase => {
      if (courtCase.sentences && Array.isArray(courtCase.sentences)) {
        courtCase.sentences.forEach((sentence: RecallableSentence) => {
          if (sentence.offenceCode && typeof sentence.offenceCode === 'string') {
            allOffenceCodes.add(sentence.offenceCode)
          }
        })
      }
    })

    // Filter out empty values
    const uniqueOffenceCodes = [...allOffenceCodes].filter(Boolean)

    if (uniqueOffenceCodes.length === 0) {
      logger.debug('No offence codes found in court cases')
      return cases
    }

    // Fetch offence descriptions
    let offenceMap: Record<string, string> = {}
    try {
      offenceMap = await manageOffencesService.getOffenceMap(uniqueOffenceCodes, userToken)
      logger.debug(`Fetched descriptions for ${Object.keys(offenceMap).length} offence codes`)
    } catch (error) {
      logger.error('Error fetching offence descriptions from ManageOffencesService:', error)
      // Continue with empty offence map
    }

    // Enhance with offence descriptions
    return cases.map(courtCase => ({
      ...courtCase,
      sentences:
        courtCase.sentences?.map(
          (sentence: RecallableSentence): EnhancedRecallableSentence => ({
            ...sentence,
            offenceDescription: offenceMap[sentence.offenceCode || ''] || 'Description not available',
          }),
        ) || [],
    }))
  } catch (error) {
    logger.error('Error enhancing court cases with offence descriptions:', error)
    // Return original cases if enhancement fails
    return cases
  }
}

/**
 * Fetches court names map for the given court cases
 * @param cases Array of court cases to get court codes from
 * @param courtService Service to fetch court names
 * @param username Username for authentication
 * @returns Map of court code to court name
 */
async function getCourtNamesMap(
  cases: RecallableCourtCase[],
  courtService: CourtService,
  username: string,
): Promise<Map<string, string>> {
  try {
    // Collect unique court codes
    const allCourtCodes = new Set<string>()

    cases.forEach(courtCase => {
      if (courtCase.courtCode && typeof courtCase.courtCode === 'string') {
        allCourtCodes.add(courtCase.courtCode)
      }
    })

    // Filter out empty values
    const uniqueCourtCodes = [...allCourtCodes].filter(Boolean)

    if (uniqueCourtCodes.length === 0) {
      logger.debug('No court codes found in court cases')
      return new Map()
    }

    // Fetch court names
    try {
      const courtNamesMap = await courtService.getCourtNames(uniqueCourtCodes, username)
      logger.debug(`Fetched names for ${courtNamesMap.size} court codes`)
      return courtNamesMap
    } catch (error) {
      logger.error('Error fetching court names from CourtService:', error)
      return new Map()
    }
  } catch (error) {
    logger.error('Error getting court names map:', error)
    return new Map()
  }
}

/**
 * Applies court names to already enhanced court cases
 * @param cases Array of enhanced court cases
 * @param courtNamesMap Map of court code to court name
 * @returns Court cases with court names applied
 */
function applyCourtNamesToEnhancedCases(
  cases: EnhancedRecallableCourtCase[],
  courtNamesMap: Map<string, string>,
): EnhancedRecallableCourtCase[] {
  return cases.map(courtCase => ({
    ...courtCase,
    courtName: courtNamesMap.get(courtCase.courtCode) || 'Court name not available',
  }))
}
