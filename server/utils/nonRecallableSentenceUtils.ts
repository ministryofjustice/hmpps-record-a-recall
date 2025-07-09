import { RecallableSentence } from '../@types/remandAndSentencingApi/remandAndSentencingTypes'

// Non-recallable sentence calc types (NOMIS)
export const NON_RECALLABLE_SENTENCE_CALC_TYPES = [
  'A/FINE', // Imprisoned in Default of Fine
  'BOTUS', // ORA Breach Top Up Supervision
  'CIVIL', // Civil Imprisonment
  'DTO', // Detention and Training Order
  'DTO_ORA', // ORA Detention and Training Order
  'VOO', // Violent Offender Order
  'YRO', // Youth Rehabilitation Order
]

/**
 * Determines if a sentence is non-recallable based on NOMIS sentence calc type
 */
export function isNonRecallableSentence(sentence: RecallableSentence): boolean {
  // Use the new nomisSentenceCalcType field if available, otherwise fall back to legacy data
  const sentenceCalcType = sentence.nomisSentenceCalcType || sentence.sentenceLegacyData?.sentenceCalcType
  return sentenceCalcType && NON_RECALLABLE_SENTENCE_CALC_TYPES.includes(sentenceCalcType)
}
