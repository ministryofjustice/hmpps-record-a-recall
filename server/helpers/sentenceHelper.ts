import FormWizard from 'hmpo-form-wizard'
import type { CourtCase } from 'models'
import dayjs from 'dayjs'
import { RecallableCourtCaseSentence, SentenceType } from '../@types/remandAndSentencingApi/remandAndSentencingTypes'
import logger from '../../logger'

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

export async function getApplicableSentenceTypes(
  req: FormWizard.Request,
  sentence: RecallableCourtCaseSentence,
  courtCase: CourtCase,
  username: string,
): Promise<SentenceType[]> {
  try {
    // Calculate age at conviction from prisoner details
    const prisoner = req.sessionModel.get('prisoner') as { dateOfBirth: string } | undefined
    if (!prisoner?.dateOfBirth) {
      throw new Error('Prisoner date of birth not found in session')
    }
    const convictionDate = dayjs(sentence.convictionDate)
    const dateOfBirth = dayjs(prisoner.dateOfBirth)
    const ageAtConviction = convictionDate.diff(dateOfBirth, 'year')

    return await req.services.courtCaseService.searchSentenceTypes(
      {
        age: ageAtConviction,
        convictionDate: sentence.convictionDate,
        offenceDate: sentence.offenceStartDate || courtCase.date,
        statuses: ['ACTIVE'],
      },
      username,
    )
  } catch (error) {
    logger.error('Failed to fetch applicable sentence types', { error: error.message })
    throw error
  }
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
