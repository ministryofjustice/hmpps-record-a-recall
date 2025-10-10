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
      Object.entries(data).forEach(([key, value]) => {
        const sessionKey = this.getSessionKeyForDataKey(key)
        if (sessionKey) {
          if (value === undefined || value === null) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            delete (req.session as any)[sessionKey]
          } else {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ;(req.session as any)[sessionKey] = value
          }
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

      Object.entries(this.SESSION_KEYS).forEach(([dataKey, sessionKey]) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const value = (req.session as any)?.[sessionKey]
        if (value !== undefined) {
          const camelCaseKey = this.toCamelCase(dataKey)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ;(data as any)[camelCaseKey] = value
        }
      })

      return data
    } catch (error) {
      logger.error('Error getting all session data', error)
      throw error
    }
  }

  private static getSessionKeyForDataKey(dataKey: string): string | undefined {
    const upperSnakeKey = this.toUpperSnakeCase(dataKey)

    for (const [key, value] of Object.entries(this.SESSION_KEYS)) {
      if (key === upperSnakeKey || value === dataKey) {
        return value
      }
    }

    return undefined
  }

  private static toUpperSnakeCase(str: string): string {
    return str.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase()
  }

  private static toCamelCase(str: string): string {
    return str.toLowerCase().replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
  }

  static hasSessionModel(req: Request): boolean {
    return !!req.session
  }

  static getSessionValue<T>(req: Request, key: string): T | undefined {
    try {
      if (!req.session) {
        return undefined
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (req.session as any)?.[key] as T
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

  static save(req: Request) {
    try {
      if (!req.session || !req.session.save) {
        return
      }
      req.session.save(err => {
        if (err) {
          logger.error('Error saving session:', err)
          throw err
        }
      })
    } catch (error) {
      logger.error('Error saving session', error)
      throw error
    }
  }
}

export default SessionManager
export { SessionManager }
