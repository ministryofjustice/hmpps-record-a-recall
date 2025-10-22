import { Request } from 'express'
import { RecallSessionData, RecallJourneyData } from './sessionTypes'
import { getRecallType } from '../@types/recallTypes'
import { SummarisedSentenceGroup } from '../utils/sentenceUtils'
import logger from '../../logger'

class SessionManager {
  static readonly SESSION_KEYS = {
    ENTRYPOINT: 'entrypoint',
    CRDS_ERRORS: 'crdsValidationErrors',
    HAPPY_PATH_FAIL_REASONS: 'autoRecallFailErrors',
    PRISONER: 'prisoner',
    UAL: 'UAL',
    RECALL_ID: 'recallId',
    STORED_RECALL: 'storedRecall',
    STANDARD_ONLY: 'standardOnlyRecall',
    RECALL_TYPE: 'recallType',
    MANUAL_CASE_SELECTION: 'manualCaseSelection',
    COURT_CASE_OPTIONS: 'courtCaseOptions',
    COURT_CASES: 'courtCases',
    IN_PRISON_AT_RECALL: 'inPrisonAtRecall',
    RTC_DATE: 'returnToCustodyDate',
    REVOCATION_DATE: 'revocationDate',
    ELIGIBLE_SENTENCE_COUNT: 'eligibleSentenceCount',
    SUMMARISED_SENTENCES: 'summarisedSentenceGroups',
    IS_EDIT: 'isEdit',
    RETURN_TO: 'returnTo',
    JOURNEY_COMPLETE: 'journeyComplete',
    SENTENCES: 'crdsSentences',
    RAS_SENTENCES: 'rasSentences',
    TEMP_CALC: 'temporaryCalculation',
    BREAKDOWN: 'breakdown',
    GROUPED_SENTENCES: 'groupedSentences',
    CASES_WITH_ELIGIBLE_SENTENCES: 'casesWithEligibleSentences',
    RECALL_ELIGIBILITY: 'recallEligibility',
    RECALL_TYPE_MISMATCH: 'recallTypeMismatch',
    EXISTING_ADJUSTMENTS: 'existingAdjustments',
    INVALID_RECALL_TYPES: 'invalidRecallTypes',
    CONFLICTING_ADJUSTMENTS: 'conflictingAdjustments',
    RELEVANT_ADJUSTMENTS: 'relevantAdjustment',
    UAL_TO_CREATE: 'ualToCreate',
    UAL_TO_EDIT: 'ualToEdit',
    INCOMPATIBLE_TYPES_AND_MULTIPLE_CONFLICTING_ADJUSTMENTS: 'incompatibleTypesAndMultipleConflictingAdjustments',
    HAS_MULTIPLE_OVERLAPPING_UAL_TYPE_RECALL: 'hasMultipleOverlappingUalTypeRecall',
    DPS_SENTENCE_IDS: 'dpsSentenceIds',
    REVIEWABLE_COURT_CASES: 'reviewableCourtCases',
    CURRENT_CASE_INDEX: 'currentCaseIndex',
    MANUAL_RECALL_DECISIONS: 'manualRecallDecisions',
    UNKNOWN_SENTENCES_TO_UPDATE: 'unknownSentencesToUpdate',
    UPDATED_SENTENCE_TYPES: 'updatedSentences',
    SELECTED_COURT_CASE_UUID: 'selectedCourtCaseUuid',
    BULK_UPDATE_MODE: 'bulkUpdateMode',
    SENTENCES_IN_CURRENT_CASE: 'sentencesInCurrentCase',
    CURRENT_SENTENCE_INDEX: 'currentSentenceIndex',
    ACTIVE_SENTENCE_CHOICE: 'activeSentenceChoice',
    SENTENCE_GROUPS: 'sentenceGroups',
    // Cache-related keys
    CACHED_CASELOADS: 'cachedCaseloads',
    CACHED_COMPONENTS: 'cachedComponents',
    CACHED_PRISONER_DATA: 'cachedPrisonerData',
    CACHED_COURT_CASES: 'cachedCourtCases',
    CACHED_OFFENCES: 'cachedOffences',
    CACHED_COURT_NAMES: 'cachedCourtNames',
    FAILED_CALCULATIONS: 'failedCalculations',
    CACHE_TIMESTAMPS: 'cacheTimestamps',
  }

  // Cache TTL configurations (in milliseconds)
  static readonly CACHE_TTL = {
    USER_DATA: 30 * 60 * 1000, // 30 minutes for user/session data
    COMPONENTS: 60 * 60 * 1000, // 1 hour for UI components
    PRISONER_DATA: 15 * 60 * 1000, // 15 minutes for prisoner data
    COURT_CASES: 15 * 60 * 1000, // 15 minutes for court cases
    OFFENCES: 60 * 60 * 1000, // 1 hour for offence descriptions
    COURT_NAMES: 60 * 60 * 1000, // 1 hour for court names
    FAILED_CALCULATIONS: 5 * 60 * 1000, // 5 minutes for failed calculation states
  }

  static getRecallData(req: Request): RecallJourneyData {
    try {
      const courtCases = this.getSessionValue<string[]>(req, this.SESSION_KEYS.COURT_CASES)
      const courtCaseCount = courtCases ? courtCases.length : 0
      const groups = this.getSessionValue<SummarisedSentenceGroup[]>(req, this.SESSION_KEYS.SUMMARISED_SENTENCES)
      const sentenceIds = groups?.flatMap((g: SummarisedSentenceGroup) =>
        g.eligibleSentences.flatMap(s => s.sentenceId),
      )

      const revocationDateString = this.getSessionValue<string>(req, this.SESSION_KEYS.REVOCATION_DATE)
      const rtcDateString = this.getSessionValue<string>(req, this.SESSION_KEYS.RTC_DATE)
      const ual = this.getSessionValue<number>(req, this.SESSION_KEYS.UAL)
      const recallTypeCode = this.getSessionValue<string>(req, this.SESSION_KEYS.RECALL_TYPE)

      return {
        storedRecall: this.getSessionValue(req, this.SESSION_KEYS.STORED_RECALL),
        revocationDate: revocationDateString ? new Date(revocationDateString) : undefined,
        revDateString: revocationDateString,
        inPrisonAtRecall: this.getSessionValue<boolean>(req, this.SESSION_KEYS.IN_PRISON_AT_RECALL) || false,
        returnToCustodyDate: rtcDateString ? new Date(rtcDateString) : undefined,
        returnToCustodyDateString: rtcDateString,
        ual,
        ualText: ual !== undefined ? `${ual} day${ual === 1 ? '' : 's'}` : undefined,
        manualCaseSelection: this.getSessionValue<boolean>(req, this.SESSION_KEYS.MANUAL_CASE_SELECTION) === true,
        recallType: recallTypeCode ? getRecallType(recallTypeCode) : undefined,
        courtCaseCount,
        eligibleSentenceCount: this.getSessionValue<number>(req, this.SESSION_KEYS.ELIGIBLE_SENTENCE_COUNT) || 0,
        sentenceIds,
        isEdit: this.getSessionValue<boolean>(req, this.SESSION_KEYS.IS_EDIT) || false,
      }
    } catch (error) {
      logger.error('Error getting recall data from session', error)
      throw error
    }
  }

  static updateRecallData(req: Request, data: Partial<RecallSessionData>) {
    try {
      logger.info('SessionManager.updateRecallData called with:', data)
      Object.entries(data).forEach(([key, value]) => {
        const sessionKey = this.getSessionKeyForDataKey(key)
        if (sessionKey) {
          if (value === undefined || value === null) {
            logger.info(`SessionManager: Unsetting ${key} (sessionKey: ${sessionKey})`)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            delete (req.session as any)[sessionKey]
          } else {
            logger.info(`SessionManager: Setting ${key} (sessionKey: ${sessionKey}) to:`, value)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ;(req.session as any)[sessionKey] = value
          }
        } else {
          logger.warn(`SessionManager: No session key found for data key: ${key}`)
        }
      })
    } catch (error) {
      logger.error('Error updating recall data in session', error)
      throw error
    }
  }

  static clearRecallData(req: Request) {
    try {
      Object.values(this.SESSION_KEYS).forEach(key => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (req.session as any)[key]
      })
    } catch (error) {
      logger.error('Error clearing recall data from session', error)
      throw error
    }
  }

  static getAllSessionData(req: Request): RecallSessionData {
    try {
      const data: RecallSessionData = {}

      Object.entries(this.SESSION_KEYS).forEach(([_, sessionKey]) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const value = (req.session as any)?.[sessionKey]
        if (value !== undefined) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ;(data as any)[sessionKey] = value
        }
      })

      return data
    } catch (error) {
      logger.error('Error getting all session data', error)
      throw error
    }
  }

  private static getSessionKeyForDataKey(dataKey: string): string | undefined {
    // Check if the dataKey exists as a session key value (all are in camelCase)
    const sessionKeyValues = Object.values(this.SESSION_KEYS)
    if (sessionKeyValues.includes(dataKey)) {
      return dataKey
    }
    return undefined
  }

  static hasSession(req: Request): boolean {
    return !!req.session
  }

  static getSessionValue<T>(req: Request, key: string): T | undefined {
    try {
      if (!req.session) {
        return undefined
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (req.session as any)[key] as T
    } catch (error) {
      logger.error(`Error getting session value for key ${key}`, error)
      return undefined
    }
  }

  static setSessionValue(req: Request, key: string, value: unknown) {
    try {
      if (!req.session) {
        return
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(req.session as any)[key] = value
    } catch (error) {
      logger.error(`Error setting session value for key ${key}`, error)
      throw error
    }
  }

  static async save(req: Request): Promise<void> {
    if (!req.session) {
      logger.warn('SessionManager.save called but no session exists')
      return Promise.resolve()
    }

    return new Promise((resolve, reject) => {
      req.session.save(err => {
        if (err) {
          logger.error('Session save error:', err)
          reject(err)
        } else {
          logger.info('SessionManager.save: Session save completed')
          resolve()
        }
      })
    })
  }

  // Cache management methods
  static getCachedData<T>(req: Request, cacheKey: string, ttlKey: keyof typeof SessionManager.CACHE_TTL): T | null {
    try {
      const cachedData = this.getSessionValue<T>(req, cacheKey)
      if (!cachedData) {
        logger.debug(`Cache miss for ${cacheKey}`)
        return null
      }

      // Check if cache is still valid
      const timestamps = this.getSessionValue<Record<string, number>>(req, this.SESSION_KEYS.CACHE_TIMESTAMPS) || {}
      const cacheTime = timestamps[cacheKey]

      if (!cacheTime) {
        logger.debug(`No timestamp found for cached ${cacheKey}`)
        return null
      }

      const ttl = this.CACHE_TTL[ttlKey]
      const now = Date.now()
      const isExpired = now - cacheTime > ttl

      if (isExpired) {
        logger.info(`Cache expired for ${cacheKey} (age: ${Math.round((now - cacheTime) / 1000)}s)`)
        // Clean up expired cache
        this.invalidateCache(req, cacheKey)
        return null
      }

      logger.info(`Cache hit for ${cacheKey} (age: ${Math.round((now - cacheTime) / 1000)}s)`)
      return cachedData
    } catch (error) {
      logger.error(`Error getting cached data for ${cacheKey}`, error)
      return null
    }
  }

  static setCachedData<T>(req: Request, cacheKey: string, data: T): void {
    try {
      this.setSessionValue(req, cacheKey, data)

      // Update timestamp
      const timestamps = this.getSessionValue<Record<string, number>>(req, this.SESSION_KEYS.CACHE_TIMESTAMPS) || {}
      timestamps[cacheKey] = Date.now()
      this.setSessionValue(req, this.SESSION_KEYS.CACHE_TIMESTAMPS, timestamps)

      logger.info(`Cached data for ${cacheKey}`)
    } catch (error) {
      logger.error(`Error setting cached data for ${cacheKey}`, error)
    }
  }

  static invalidateCache(req: Request, cacheKey?: string): void {
    try {
      if (cacheKey) {
        // Invalidate specific cache
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (req.session as any)[cacheKey]

        const timestamps = this.getSessionValue<Record<string, number>>(req, this.SESSION_KEYS.CACHE_TIMESTAMPS) || {}
        delete timestamps[cacheKey]
        this.setSessionValue(req, this.SESSION_KEYS.CACHE_TIMESTAMPS, timestamps)

        logger.info(`Invalidated cache for ${cacheKey}`)
      } else {
        // Invalidate all caches
        const cacheKeys = [
          this.SESSION_KEYS.CACHED_CASELOADS,
          this.SESSION_KEYS.CACHED_COMPONENTS,
          this.SESSION_KEYS.CACHED_PRISONER_DATA,
          this.SESSION_KEYS.CACHED_COURT_CASES,
          this.SESSION_KEYS.CACHED_OFFENCES,
          this.SESSION_KEYS.CACHED_COURT_NAMES,
          this.SESSION_KEYS.FAILED_CALCULATIONS,
        ]

        cacheKeys.forEach(key => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          delete (req.session as any)[key]
        })

        this.setSessionValue(req, this.SESSION_KEYS.CACHE_TIMESTAMPS, {})
        logger.info('Invalidated all caches')
      }
    } catch (error) {
      logger.error('Error invalidating cache', error)
    }
  }

  static recordFailedCalculation(req: Request, prisonerId: string, error: string): void {
    try {
      const failedCalcs =
        this.getSessionValue<Record<string, { error: string; timestamp: number }>>(
          req,
          this.SESSION_KEYS.FAILED_CALCULATIONS,
        ) || {}

      failedCalcs[prisonerId] = {
        error,
        timestamp: Date.now(),
      }

      this.setSessionValue(req, this.SESSION_KEYS.FAILED_CALCULATIONS, failedCalcs)
      logger.info(`Recorded failed calculation for ${prisonerId}: ${error}`)
    } catch (err) {
      logger.error(`Error recording failed calculation for ${prisonerId}`, err)
    }
  }

  static isCalculationFailed(req: Request, prisonerId: string): boolean {
    try {
      const failedCalcs =
        this.getSessionValue<Record<string, { error: string; timestamp: number }>>(
          req,
          this.SESSION_KEYS.FAILED_CALCULATIONS,
        ) || {}

      const failedCalc = failedCalcs[prisonerId]
      if (!failedCalc) {
        return false
      }

      // Check if the failure is still within the TTL
      const ttl = this.CACHE_TTL.FAILED_CALCULATIONS
      const now = Date.now()
      const isExpired = now - failedCalc.timestamp > ttl

      if (isExpired) {
        // Clean up expired failure record
        delete failedCalcs[prisonerId]
        this.setSessionValue(req, this.SESSION_KEYS.FAILED_CALCULATIONS, failedCalcs)
        return false
      }

      logger.info(
        `Calculation still marked as failed for ${prisonerId} (age: ${Math.round((now - failedCalc.timestamp) / 1000)}s)`,
      )
      return true
    } catch (error) {
      logger.error(`Error checking failed calculation for ${prisonerId}`, error)
      return false
    }
  }

  static clearPrisonerRelatedCache(req: Request, prisonerId?: string): void {
    try {
      // Clear prisoner-specific caches
      if (prisonerId) {
        const cachedCourtCases = this.getSessionValue<Record<string, unknown>>(
          req,
          this.SESSION_KEYS.CACHED_COURT_CASES,
        )
        if (cachedCourtCases && cachedCourtCases[prisonerId]) {
          delete cachedCourtCases[prisonerId]
          this.setSessionValue(req, this.SESSION_KEYS.CACHED_COURT_CASES, cachedCourtCases)
        }

        const cachedPrisonerData = this.getSessionValue<Record<string, unknown>>(
          req,
          this.SESSION_KEYS.CACHED_PRISONER_DATA,
        )
        if (cachedPrisonerData && cachedPrisonerData[prisonerId]) {
          delete cachedPrisonerData[prisonerId]
          this.setSessionValue(req, this.SESSION_KEYS.CACHED_PRISONER_DATA, cachedPrisonerData)
        }

        const failedCalcs = this.getSessionValue<Record<string, unknown>>(req, this.SESSION_KEYS.FAILED_CALCULATIONS)
        if (failedCalcs && failedCalcs[prisonerId]) {
          delete failedCalcs[prisonerId]
          this.setSessionValue(req, this.SESSION_KEYS.FAILED_CALCULATIONS, failedCalcs)
        }
      } else {
        // Clear all prisoner-related caches
        this.invalidateCache(req, this.SESSION_KEYS.CACHED_PRISONER_DATA)
        this.invalidateCache(req, this.SESSION_KEYS.CACHED_COURT_CASES)
        this.invalidateCache(req, this.SESSION_KEYS.FAILED_CALCULATIONS)
      }

      logger.info(`Cleared prisoner-related cache ${prisonerId ? `for ${prisonerId}` : 'for all prisoners'}`)
    } catch (error) {
      logger.error('Error clearing prisoner-related cache', error)
    }
  }
}

export default SessionManager
export { SessionManager }
