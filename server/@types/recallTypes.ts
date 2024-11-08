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
  HDC_RECALL: { code: 'HDC_RECALL', description: 'HDC recall', fixedTerm: false },
} as const

export { RecallTypes, RecallType }
