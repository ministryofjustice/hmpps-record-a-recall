export type RecallType = {
  code: 'LR' | 'FTR_14' | 'FTR_28' | 'FTR_HDC_14' | 'FTR_HDC_28' | 'CUR_HDC' | 'IN_HDC'
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
