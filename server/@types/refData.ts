const RecallTypes = {
  FOURTEEN_DAY_FIXED_TERM_RECALL: { code: 'FOURTEEN_DAY_FIXED_TERM_RECALL', description: '14 day fixed-term recall' },
  TWENTY_EIGHT_DAY_FIXED_TERM_RECALL: {
    code: 'TWENTY_EIGHT_DAY_FIXED_TERM_RECALL',
    description: '28 day fixed-term recall',
  },
  STANDARD_RECALL: { code: 'STANDARD_RECALL', description: 'Standard recall' },
  HDC_RECALL: { code: 'HDC_RECALL', description: 'HDC recall' },
} as const

type RecallType = { code: string; description: string }

type SentenceDetail = {
  lineSequence: number
  sentencedAt: string
  sentenceLength: string
  consecutiveTo: number | null
  crd: string
  sled: string
}

export { RecallTypes, RecallType, SentenceDetail }
