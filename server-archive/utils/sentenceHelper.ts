import type { CourtCase } from 'models'
import { RecallableCourtCaseSentence } from '../@types/remandAndSentencingApi/remandAndSentencingTypes'

export function findSentenceAndCourtCase(
  sentenceUuid: string,
  courtCases: CourtCase[],
): { targetSentence: RecallableCourtCaseSentence | null; targetCourtCase: CourtCase | null } {
  for (const courtCase of courtCases) {
    const sentence = courtCase.sentences?.find((s: RecallableCourtCaseSentence) => s.sentenceUuid === sentenceUuid)
    if (sentence) {
      return { targetSentence: sentence, targetCourtCase: courtCase }
    }
  }
  return { targetSentence: null, targetCourtCase: null }
}

export function createSentenceToCourtCaseMap(courtCases: CourtCase[]): Map<string, string> {
  const sentenceToCaseMap = new Map<string, string>()
  courtCases.forEach(courtCase => {
    courtCase.sentences?.forEach(sentence => {
      sentenceToCaseMap.set(sentence.sentenceUuid, courtCase.caseId)
    })
  })
  return sentenceToCaseMap
}
