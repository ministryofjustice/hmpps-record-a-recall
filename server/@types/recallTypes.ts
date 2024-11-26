type RecallType = { code: string; description: string; fixedTerm: boolean; subTwelveMonthApplicable?: boolean }

const RecallTypes = {
  STANDARD_RECALL: { code: 'STANDARD_RECALL', description: 'Standard recall', fixedTerm: false },
  FOURTEEN_DAY_FIXED_TERM_RECALL: {
    code: 'FOURTEEN_DAY_FIXED_TERM_RECALL',
    description: '14-day fixed term recall',
    fixedTerm: true,
    subTwelveMonthApplicable: true,
  },
  TWENTY_EIGHT_DAY_FIXED_TERM_RECALL: {
    code: 'TWENTY_EIGHT_DAY_FIXED_TERM_RECALL',
    description: '28-day fixed term recall',
    fixedTerm: true,
    subTwelveMonthApplicable: false,
  },
  HDC_STANDARD_RECALL: { code: 'HDC_STANDARD_RECALL', description: 'HDC Standard recall', fixedTerm: false },
  HDC_FOURTEEN_DAY_RECALL: {
    code: 'HDC_FOURTEEN_DAY_RECALL',
    description: 'HDC 14-day fixed term recall',
    fixedTerm: true,
    subTwelveMonthApplicable: true,
  },
  HDC_TWENTY_EIGHT_DAY_RECALL: {
    code: 'HDC_TWENTY_EIGHT_DAY_RECALL',
    description: 'HDC 28-day fixed term recall',
    fixedTerm: true,
    subTwelveMonthApplicable: false,
  },
  HDC_CURFEW_VIOLATION_RECALL: {
    code: 'HDC_CURFEW_VIOLATION_RECALL',
    description: 'HDC recall with curfew violation',
    fixedTerm: false,
  },
  HDC_INABILITY_TO_MONITOR_RECALL: {
    code: 'HDC_CURFEW_VIOLATION_RECALL',
    description: 'HDC recall with inability to monitor',
    fixedTerm: false,
  },
} as const

export { RecallTypes, RecallType }
