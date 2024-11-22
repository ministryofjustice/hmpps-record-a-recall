type RecallType = { code: string; description: string; fixedTerm: boolean }

const RecallTypes = {
  FOURTEEN_DAY_FIXED_TERM_RECALL: {
    code: 'FOURTEEN_DAY_FIXED_TERM_RECALL',
    description: '14 day fixed-term recall',
    fixedTerm: true,
  },
  TWENTY_EIGHT_DAY_FIXED_TERM_RECALL: {
    code: 'TWENTY_EIGHT_DAY_FIXED_TERM_RECALL',
    description: '28 day fixed-term recall',
    fixedTerm: true,
  },
  STANDARD_RECALL: { code: 'STANDARD_RECALL', description: 'Standard recall', fixedTerm: false },
  HDC_STANDARD_RECALL: { code: 'HDC_STANDARD_RECALL', description: 'HDC Standard recall', fixedTerm: false },
  HDC_FOURTEEN_DAY_RECALL: { code: 'HDC_FOURTEEN_DAY_RECALL', description: 'HDC 14 day recall', fixedTerm: true },
  HDC_TWENTY_EIGHT_DAY_RECALL: {
    code: 'HDC_TWENTY_EIGHT_DAY_RECALL',
    description: 'HDC 28 day recall',
    fixedTerm: true,
  },
} as const

export { RecallTypes, RecallType }
