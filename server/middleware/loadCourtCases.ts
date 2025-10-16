import { NextFunction, Request, Response } from 'express'
import logger from '../../logger'
import CourtCaseService from '../services/CourtCaseService'
import ManageOffencesService from '../services/manageOffencesService'
import CourtService from '../services/CourtService'
import CalculationService from '../services/calculationService'
import NomisToDpsMappingService from '../services/NomisToDpsMappingService'
import { SessionManager } from '../services/sessionManager'
import { NomisSentenceId } from '../@types/nomisMappingApi/nomisMappingApiTypes'
import {
  RecallableCourtCase,
  RecallableCourtCaseSentenceAugmented,
} from '../@types/remandAndSentencingApi/remandAndSentencingTypes'

// Enhanced types for court cases with additional fields
export type EnhancedRecallableSentence = RecallableCourtCaseSentenceAugmented & {
  offenceDescription?: string
  adjustedSLED?: string
  adjustedCRD?: string
  releaseCalculationSource?: 'NOMIS' | 'CRDS' | 'UNAVAILABLE'
  sentenceLegacyData?: {
    sentenceCalcType?: string
    sentenceCategory?: string
    sentenceTypeDesc?: string
    postedDate: string
    active?: boolean
    nomisLineReference?: string
    bookingId?: number
  }
}

export type EnhancedRecallableCourtCase = RecallableCourtCase & {
  courtName?: string
  sentences: EnhancedRecallableSentence[]
}

/**
 * Middleware to load court cases details into res.locals with offence descriptions, court names, and release dates
 */
export default function loadCourtCases(
  courtCaseService: CourtCaseService,
  manageOffencesService: ManageOffencesService,
  courtService: CourtService,
  calculationService?: CalculationService,
  nomisMappingService?: NomisToDpsMappingService,
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { nomisId, user } = res.locals

    if (!nomisId || !user?.username) {
      logger.warn('Missing nomisId or username in res.locals')
      return next()
    }

    // Check for cached court cases data
    const cachedCourtCasesData =
      SessionManager.getSessionValue<Record<string, unknown>>(req, SessionManager.SESSION_KEYS.CACHED_COURT_CASES) || {}

    // Check if we have cached data for this prisoner
    const cacheKey = `${SessionManager.SESSION_KEYS.CACHED_COURT_CASES}_${nomisId}`
    const cachedCourtCases = SessionManager.getCachedData<EnhancedRecallableCourtCase[]>(req, cacheKey, 'COURT_CASES')

    if (cachedCourtCases) {
      logger.info(`Using cached court cases for ${nomisId}`)
      res.locals.recallableCourtCases = cachedCourtCases
      return next()
    }

    try {
      logger.info(`Fetching court cases from API for ${nomisId} (cache miss)`)
      const response = await courtCaseService.getAllRecallableCourtCases(nomisId, user.username)
      const recallableCourtCases: RecallableCourtCase[] = response.cases || []

      // Enhance court cases with offence descriptions, court names, and release dates
      if (recallableCourtCases && Array.isArray(recallableCourtCases) && recallableCourtCases.length > 0) {
        const [offenceEnhancedCases, courtNamesMap, releaseDates] = await Promise.all([
          enhanceCourtCasesWithOffenceDescriptions(recallableCourtCases, manageOffencesService, user.token, req),
          getCourtNamesMap(recallableCourtCases, courtService, user.username, req),
          calculationService && nomisMappingService
            ? getReleaseDates(nomisId, user.username, calculationService, nomisMappingService, req)
            : null,
        ])

        // Apply court names to the offence-enhanced cases
        let enhancedCases = applyCourtNamesToEnhancedCases(offenceEnhancedCases, courtNamesMap)

        // Apply release dates if available
        if (releaseDates) {
          enhancedCases = applyReleaseDatesToCases(enhancedCases, releaseDates)
        }

        res.locals.recallableCourtCases = enhancedCases

        // Cache the enhanced court cases
        SessionManager.setCachedData(req, cacheKey, enhancedCases)
        cachedCourtCasesData[nomisId] = true
        SessionManager.setSessionValue(req, SessionManager.SESSION_KEYS.CACHED_COURT_CASES, cachedCourtCasesData)
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
  req: Request,
): Promise<EnhancedRecallableCourtCase[]> {
  try {
    // Collect unique offence codes
    const allOffenceCodes = new Set<string>()

    cases.forEach(courtCase => {
      if (courtCase.sentences && Array.isArray(courtCase.sentences)) {
        courtCase.sentences.forEach((sentence: RecallableCourtCaseSentenceAugmented) => {
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

    // Check cached offences first
    const cachedOffences =
      SessionManager.getCachedData<Record<string, string>>(
        req,
        SessionManager.SESSION_KEYS.CACHED_OFFENCES,
        'OFFENCES',
      ) || {}

    // Determine which offence codes we need to fetch
    const missingOffenceCodes = uniqueOffenceCodes.filter(code => !cachedOffences[code])

    let offenceMap: Record<string, string> = { ...cachedOffences }

    if (missingOffenceCodes.length > 0) {
      // Fetch offence descriptions for missing codes only
      try {
        logger.info(
          `Fetching ${missingOffenceCodes.length} offence descriptions from API (${uniqueOffenceCodes.length - missingOffenceCodes.length} cached)`,
        )
        const newOffences = await manageOffencesService.getOffenceMap(missingOffenceCodes, userToken)

        // Merge new offences with existing cache
        offenceMap = { ...offenceMap, ...newOffences }

        // Update cache with all offences
        SessionManager.setCachedData(req, SessionManager.SESSION_KEYS.CACHED_OFFENCES, offenceMap)

        logger.debug(`Fetched and cached descriptions for ${Object.keys(newOffences).length} offence codes`)
      } catch (error) {
        logger.error('Error fetching offence descriptions from ManageOffencesService:', error)
        // Continue with cached offences only
      }
    } else {
      logger.info(`Using cached offence descriptions for all ${uniqueOffenceCodes.length} codes`)
    }

    // Enhance with offence descriptions
    return cases.map(courtCase => ({
      ...courtCase,
      sentences:
        courtCase.sentences?.map(
          (sentence: RecallableCourtCaseSentenceAugmented): EnhancedRecallableSentence => ({
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
  req: Request,
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

    // Check cached court names first
    const cachedCourtNames =
      SessionManager.getCachedData<Record<string, string>>(
        req,
        SessionManager.SESSION_KEYS.CACHED_COURT_NAMES,
        'COURT_NAMES',
      ) || {}

    // Determine which court codes we need to fetch
    const missingCourtCodes = uniqueCourtCodes.filter(code => !cachedCourtNames[code])

    const courtNamesMap = new Map<string, string>(Object.entries(cachedCourtNames))

    if (missingCourtCodes.length > 0) {
      // Fetch court names for missing codes only
      try {
        logger.info(
          `Fetching ${missingCourtCodes.length} court names from API (${uniqueCourtCodes.length - missingCourtCodes.length} cached)`,
        )
        const newCourtNames = await courtService.getCourtNames(missingCourtCodes, username)

        // Merge new court names with existing cache
        newCourtNames.forEach((value, key) => {
          courtNamesMap.set(key, value)
          cachedCourtNames[key] = value
        })

        // Update cache with all court names
        SessionManager.setCachedData(req, SessionManager.SESSION_KEYS.CACHED_COURT_NAMES, cachedCourtNames)

        logger.debug(`Fetched and cached names for ${newCourtNames.size} court codes`)
      } catch (error) {
        logger.error('Error fetching court names from CourtService:', error)
      }
    } else {
      logger.info(`Using cached court names for all ${uniqueCourtCodes.length} codes`)
    }

    return courtNamesMap
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

/**
 * Fetches release dates from CRD API
 * @param nomisId Prison number
 * @param username Username for authentication
 * @param calculationService Service to fetch release dates
 * @param nomisMappingService Service to map NOMIS to DPS sentence IDs
 * @returns Release dates data or null if unavailable
 */
async function getReleaseDates(
  nomisId: string,
  username: string,
  calculationService: CalculationService,
  nomisMappingService: NomisToDpsMappingService,
  req: Request,
): Promise<{
  sled?: string
  crd?: string
  source: 'NOMIS' | 'CRDS' | 'UNAVAILABLE'
  sentenceReleaseDates?: Map<string, { sled?: string; crd?: string }>
} | null> {
  try {
    // Check if this calculation has previously failed
    if (SessionManager.isCalculationFailed(req, nomisId)) {
      logger.info(`Skipping calculation for ${nomisId} - previously failed and cached`)
      return { source: 'UNAVAILABLE' }
    }
    let latestCalculation
    try {
      latestCalculation = await calculationService.getLatestCalculation(nomisId, username)
    } catch (error) {
      // Record the failed calculation to prevent retries
      if (error.status === 422) {
        SessionManager.recordFailedCalculation(req, nomisId, 'Stale calculation (422 error)')
        logger.warn(`Recorded failed calculation for ${nomisId}: Stale calculation`)
      }
      throw error
    }

    if (!latestCalculation) {
      logger.debug(`No calculation available for ${nomisId}`)
      return { source: 'UNAVAILABLE' }
    }

    // Extract overall SLED and CRD
    const overallSled = latestCalculation.dates?.find(d => d.type === 'SLED')?.date
    const overallCrd = latestCalculation.dates?.find(d => d.type === 'CRD')?.date

    // Try to get sentence-specific release dates if calculationRequestId is available
    const sentenceReleaseDates = new Map<string, { sled?: string; crd?: string }>()

    if (latestCalculation.calculationRequestId) {
      try {
        const [breakdown, sentencesAndReleaseDates] = await Promise.all([
          calculationService.getCalculationBreakdown(latestCalculation.calculationRequestId, username, nomisId),
          calculationService.getSentencesAndReleaseDates(latestCalculation.calculationRequestId, username),
        ])

        // Map sentences using NOMIS to DPS UUID mapping
        if (sentencesAndReleaseDates && sentencesAndReleaseDates.length > 0) {
          // Extract NOMIS sentence identifiers from CRDS sentences
          const nomisSentenceIds: NomisSentenceId[] = sentencesAndReleaseDates.map(sentence => ({
            nomisBookingId: sentence.bookingId,
            nomisSentenceSequence: sentence.sentenceSequence,
          }))

          // Get the UUID mappings from NOMIS to DPS
          const dpsMappings = await nomisMappingService.getNomisToDpsMappingLookup(nomisSentenceIds, username)

          // Create a map from NOMIS identifiers to DPS UUIDs for quick lookup
          const nomisToUuidMap = new Map<string, string>()
          dpsMappings.forEach(mapping => {
            const key = `${mapping.nomisSentenceId.nomisBookingId}-${mapping.nomisSentenceId.nomisSentenceSequence}`
            nomisToUuidMap.set(key, mapping.dpsSentenceId)
          })

          // Now map the release dates by DPS UUID
          sentencesAndReleaseDates.forEach(sentence => {
            const nomisKey = `${sentence.bookingId}-${sentence.sentenceSequence}`
            const dpsUuid = nomisToUuidMap.get(nomisKey)

            if (dpsUuid) {
              // Get release dates for this sentence
              let sledDate: string | undefined
              let crdDate: string | undefined

              // First try to find matching sentence in breakdown
              const concurrentMatch = breakdown?.concurrentSentences?.find(
                s => s.caseSequence === sentence.caseSequence && s.lineSequence === sentence.lineSequence,
              )

              if (concurrentMatch?.dates) {
                sledDate = concurrentMatch.dates.SLED?.adjusted || concurrentMatch.dates.SLED?.unadjusted
                crdDate = concurrentMatch.dates.CRD?.adjusted || concurrentMatch.dates.CRD?.unadjusted
              }

              // Store with UUID as key
              if (sledDate || crdDate) {
                sentenceReleaseDates.set(dpsUuid, { sled: sledDate, crd: crdDate })
                logger.debug(`Stored release dates for sentence with UUID: ${dpsUuid}`)
              }
            } else {
              logger.warn(`No UUID mapping found for NOMIS sentence ${sentence.bookingId}-${sentence.sentenceSequence}`)
            }
          })
        }

        // If we couldn't get release dates from sentencesAndReleaseDates,
        // try using the breakdown as fallback
        if (sentenceReleaseDates.size === 0 && breakdown?.breakdownByReleaseDateType) {
          logger.warn(
            `No individual sentence dates found, using overall breakdown as fallback, can lead to expired sentences being treated as eligible`,
          )
          const sledBreakdown = breakdown.breakdownByReleaseDateType.SLED
          const crdBreakdown = breakdown.breakdownByReleaseDateType.CRD

          if (sledBreakdown?.releaseDate || crdBreakdown?.releaseDate) {
            sentenceReleaseDates.set('overall', {
              sled: sledBreakdown?.releaseDate,
              crd: crdBreakdown?.releaseDate,
            })
          }
        }
      } catch (error) {
        logger.warn(`Could not fetch sentence-specific release dates: ${error.message}`)
      }
    } else {
      logger.debug(`No calculation request ID available - using NOMIS dates only`)
    }

    return {
      sled: overallSled,
      crd: overallCrd,
      source: latestCalculation.source || 'NOMIS',
      sentenceReleaseDates: sentenceReleaseDates.size > 0 ? sentenceReleaseDates : undefined,
    }
  } catch (error) {
    logger.error('Error fetching release dates from CRD API:', error)

    // Record specific error types for negative caching
    if (error.status === 422) {
      SessionManager.recordFailedCalculation(req, nomisId, 'CRD API error 422')
    }

    return { source: 'UNAVAILABLE' }
  }
}

/**
 * Applies release dates to enhanced court cases
 * @param cases Array of enhanced court cases
 * @param releaseDates Release dates data from CRD API
 * @returns Court cases with release dates applied
 */
function applyReleaseDatesToCases(
  cases: EnhancedRecallableCourtCase[],
  releaseDates: {
    sled?: string
    crd?: string
    source: 'NOMIS' | 'CRDS' | 'UNAVAILABLE'
    sentenceReleaseDates?: Map<string, { sled?: string; crd?: string }>
  },
): EnhancedRecallableCourtCase[] {
  return cases.map(courtCase => ({
    ...courtCase,
    sentences:
      courtCase.sentences?.map((sentence: EnhancedRecallableSentence): EnhancedRecallableSentence => {
        // Match using the sentence UUID
        const { sentenceUuid } = sentence

        // Try to find sentence-specific dates using the UUID
        let specificDates: { sled?: string; crd?: string } | undefined

        if (sentenceUuid) {
          specificDates = releaseDates.sentenceReleaseDates?.get(sentenceUuid)
          if (specificDates) {
            logger.debug(`Found specific dates for sentence with UUID: ${sentenceUuid}`)
          }
        }

        // If no specific dates found with UUID, try the overall fallback
        if (!specificDates) {
          specificDates = releaseDates.sentenceReleaseDates?.get('overall')
          if (specificDates && sentenceUuid) {
            logger.debug(`Using overall dates as fallback for sentence ${sentenceUuid}`)
          }
        }

        return {
          ...sentence,
          adjustedSLED: specificDates?.sled || releaseDates.sled,
          adjustedCRD: specificDates?.crd || releaseDates.crd,
          releaseCalculationSource: releaseDates.source,
        }
      }) || [],
  }))
}
