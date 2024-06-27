const RecallType = {
  _14_DAY_FTR: { code: '14_DAY_FTR', description: '14 day fixed-term recall' },
  _28_DAY_FTR: { code: '28_DAY_FTR', description: '28 day fixed-term recall' },
  STANDARD_RECALL: { code: 'STANDARD_RECALL', description: 'Standard recall' },
  HDC_RECALL: { code: 'HDC_RECALL', description: 'HDC recall' },
} as const

type RecallTypeCode = (typeof RecallType)[keyof typeof RecallType]['code']

export { RecallType, RecallTypeCode }
