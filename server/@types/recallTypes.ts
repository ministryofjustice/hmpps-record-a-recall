import config from '../config'
import { ApiRecallType, RecallableCourtCaseSentence } from './remandAndSentencingApi/remandAndSentencingTypes'

export type RecallType = {
  code: ApiRecallType
  description: string
  fixedTerm: boolean
}

export const RecallTypes = {
  STANDARD_RECALL: {
    code: 'LR',
    description: 'Standard',
    fixedTerm: false,
  },
  FOURTEEN_DAY_FIXED_TERM_RECALL: {
    code: 'FTR_14',
    description: '14-day fixed-term',
    fixedTerm: true,
  },
  TWENTY_EIGHT_DAY_FIXED_TERM_RECALL: {
    code: 'FTR_28',
    description: '28-day fixed-term',
    fixedTerm: true,
  },
  ...(config.featureToggles.ftr56 === 'true'
    ? {
        FIFTY_SIX_DAY_RECALL: {
          code: 'FTR_56',
          description: '56-day fixed-term',
          fixedTerm: true,
        } as RecallType,
      }
    : {}),
  HDC_FOURTEEN_DAY_RECALL: {
    code: 'FTR_HDC_14',
    description: '14-day fixed-term from HDC',
    fixedTerm: true,
  },
  HDC_TWENTY_EIGHT_DAY_RECALL: {
    code: 'FTR_HDC_28',
    description: '28-day fixed-term from HDC',
    fixedTerm: true,
  },
  HDC_CURFEW_VIOLATION_RECALL: {
    code: 'CUR_HDC',
    description: 'HDC recalled from curfew conditions',
    fixedTerm: false,
  },
  HDC_INABILITY_TO_MONITOR_RECALL: {
    code: 'IN_HDC',
    description: 'HDC recalled from inability to monitor',
    fixedTerm: false,
  },
} as const

export const getRecallType = (code: string): RecallType => {
  return Object.values(RecallTypes).find(it => it.code === code)
}

export interface SentenceAndOffence extends RecallableCourtCaseSentence {
  offenceDescription?: string | null
}

export type ExtraQueryParams = { caseIndex?: number }
