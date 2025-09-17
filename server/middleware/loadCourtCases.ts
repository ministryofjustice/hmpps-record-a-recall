import { NextFunction, Request, Response } from 'express'
import logger from '../../logger'
import CourtCaseService from '../services/CourtCaseService'
import ManageOffencesService from '../services/manageOffencesService'
import CourtService from '../services/CourtService'
import CalculationService from '../services/calculationService'
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

      // Enhance court cases with offence descriptions, court names, and release dates
      if (recallableCourtCases && Array.isArray(recallableCourtCases) && recallableCourtCases.length > 0) {
        const [offenceEnhancedCases, courtNamesMap, releaseDates] = await Promise.all([
          enhanceCourtCasesWithOffenceDescriptions(recallableCourtCases, manageOffencesService, user.token),
          getCourtNamesMap(recallableCourtCases, courtService, user.username),
          calculationService ? getReleaseDates(nomisId, user.username, calculationService) : null,
        ])

        // Apply court names to the offence-enhanced cases
        let enhancedCases = applyCourtNamesToEnhancedCases(offenceEnhancedCases, courtNamesMap)

        // Apply release dates if available
        if (releaseDates) {
          enhancedCases = applyReleaseDatesToCases(enhancedCases, releaseDates)

          let totalSentences = 0
          let sentencesWithSLED = 0
          let sentencesWithCRD = 0

          enhancedCases.forEach(courtCase => {
            if (courtCase.sentences) {
              totalSentences += courtCase.sentences.length
              courtCase.sentences.forEach((sentence: EnhancedRecallableSentence) => {
                if (sentence.adjustedSLED) sentencesWithSLED += 1
                if (sentence.adjustedCRD) sentencesWithCRD += 1
              })
            }
          })
        }

        res.locals.recallableCourtCases = enhancedCases
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

/**
 * Fetches release dates from CRD API
 * @param nomisId Prison number
 * @param username Username for authentication
 * @param calculationService Service to fetch release dates
 * @returns Release dates data or null if unavailable
 */
async function getReleaseDates(
  nomisId: string,
  username: string,
  calculationService: CalculationService,
): Promise<{
  sled?: string
  crd?: string
  source: 'NOMIS' | 'CRDS' | 'UNAVAILABLE'
  sentenceReleaseDates?: Map<string, { sled?: string; crd?: string }>
} | null> {
  try {
    const latestCalculation = await calculationService.getLatestCalculation(nomisId, username)

    if (!latestCalculation) {
      console.debug(`No calculation available for ${nomisId}`)
      return { source: 'UNAVAILABLE' }
    }

    if (latestCalculation.dates && latestCalculation.dates.length > 0) {
      console.info(`  Available release dates:`)
      latestCalculation.dates.forEach(date => {
        console.info(`    ${date.type}: ${date.date} (${date.description || 'No description'})`)
      })
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

        // try to map usng sentencesAndReleaseDates which has sentenceSequence
        if (sentencesAndReleaseDates && sentencesAndReleaseDates.length > 0) {
          sentencesAndReleaseDates.forEach(sentence => {
            // Create multiple possible keys for matching
            // TODO: use sentence date to match?
            const keys = [
              `seq-${sentence.sentenceSequence}`, // sentenceSequence key
              `${sentence.caseSequence}-${sentence.lineSequence}`, // case-line key
              `case-${sentence.caseSequence}`, // just case sequence
            ]

            // Check the breakdown for this specific sentence's dates
            let sledDate: string | undefined
            let crdDate: string | undefined

            // Find matching sentence in breakdown
            const concurrentMatch = breakdown?.concurrentSentences?.find(
              s => s.caseSequence === sentence.caseSequence && s.lineSequence === sentence.lineSequence,
            )

            if (concurrentMatch?.dates) {
              sledDate = concurrentMatch.dates.SLED?.adjusted || concurrentMatch.dates.SLED?.unadjusted
              crdDate = concurrentMatch.dates.CRD?.adjusted || concurrentMatch.dates.CRD?.unadjusted
            }

            // Store with multiple keys for flexible matching
            if (sledDate || crdDate) {
              keys.forEach(key => {
                sentenceReleaseDates.set(key, { sled: sledDate, crd: crdDate })
              })
            }
          })
        }

        if (breakdown) {
          // Extract individual sentence dates from concurrent sentences
          if (breakdown.concurrentSentences && breakdown.concurrentSentences.length > 0) {
            breakdown.concurrentSentences.forEach(sentence => {
              // Use lineSequence and caseSequence as the key to map to court case sentences
              const sentenceKey = `${sentence.caseSequence}-${sentence.lineSequence}`

              // Extract SLED and CRD from the sentence's dates map
              const sledDate = sentence.dates?.SLED
              const crdDate = sentence.dates?.CRD

              if (sledDate || crdDate) {
                sentenceReleaseDates.set(sentenceKey, {
                  sled: sledDate?.adjusted || sledDate?.unadjusted,
                  crd: crdDate?.adjusted || crdDate?.unadjusted,
                })
              }
            })
          }

          // Also handle consecutive sentences if present
          if (breakdown.consecutiveSentence) {
            // For consecutive sentences, use the overall consecutive dates
            const consSled = breakdown.consecutiveSentence.dates?.SLED
            const consCrd = breakdown.consecutiveSentence.dates?.CRD

            // Apply these dates to each sentence part
            breakdown.consecutiveSentence.sentenceParts?.forEach(part => {
              const sentenceKey = `${part.caseSequence}-${part.lineSequence}`

              if (consSled || consCrd) {
                sentenceReleaseDates.set(sentenceKey, {
                  sled: consSled?.adjusted || consSled?.unadjusted,
                  crd: consCrd?.adjusted || consCrd?.unadjusted,
                })
              }
            })
          }

          // Fallback to overall breakdown dates if no individual sentence dates found
          if (sentenceReleaseDates.size === 0 && breakdown?.breakdownByReleaseDateType) {
            console.warn(
              `No individual sentence dates found, using overall breakdown as fallback which may cause ineligible sentences to be displayed`,
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
        } else {
          console.info(`No calculation breakdown available (may be stale or from NOMIS)`)
        }
      } catch (error) {
        console.warn(`Could not fetch sentence-specific release dates: ${error.message}`)
      }
    } else {
      console.info(`No calculation request ID available - using NOMIS dates only`)
    }

    return {
      sled: overallSled,
      crd: overallCrd,
      source: latestCalculation.source || 'NOMIS',
      sentenceReleaseDates: sentenceReleaseDates.size > 0 ? sentenceReleaseDates : undefined,
    }
  } catch (error) {
    console.error('Error fetching release dates from CRD API:', error)
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
  return cases.map((courtCase, caseIndex) => ({
    ...courtCase,
    sentences:
      courtCase.sentences?.map((sentence: EnhancedRecallableSentence, sentenceIndex): EnhancedRecallableSentence => {
        // Try to find sentence-specific dates using caseSequence-lineSequence mapping
        // Note: We need to map from court case sentence to CRD sentence
        // The court case sentence doesn't have caseSequence/lineSequence directly,
        // but we can try to match using available identifiers
        let specificDates: { sled?: string; crd?: string } | undefined

        // Try different key combinations to find matching dates
        // We need to find a way to match court case sentences to CRD sentences

        // Try multiple matching strategies
        const possibleKeys = [
          // If we have countNumber and lineNumber
          sentence.countNumber && sentence.lineNumber ? `${sentence.countNumber}-${sentence.lineNumber}` : null,
          // Try with just countNumber as case sequence
          sentence.countNumber ? `case-${sentence.countNumber}` : null,
          // Try with sentenceLegacyData if available
          sentence.sentenceLegacyData?.nomisLineReference
            ? `seq-${sentence.sentenceLegacyData.nomisLineReference}`
            : null,
        ].filter(Boolean)

        for (const key of possibleKeys) {
          if (key) {
            specificDates = releaseDates.sentenceReleaseDates?.get(key)
            if (specificDates) {
              logger.info(`  Found specific dates for sentence using key: ${key}`)
              break
            }
          }
        }

        // If no specific dates found, try the overall fallback
        if (!specificDates) {
          specificDates = releaseDates.sentenceReleaseDates?.get('overall')
          if (specificDates) {
            console.info(`  Using overall dates as fallback for sentence ${sentenceIndex + 1}`)
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
