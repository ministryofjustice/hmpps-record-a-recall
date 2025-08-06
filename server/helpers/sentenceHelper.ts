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
    const prisoner = req.sessionModel.get('prisoner') as { dateOfBirth: string } | undefined
    if (!prisoner?.dateOfBirth) {
      throw new Error('Prisoner date of birth not found in session')
    }

    const dateOfBirth = dayjs(prisoner.dateOfBirth)
    if (!dateOfBirth.isValid()) {
      throw new Error(`Invalid prisoner dateOfBirth: ${prisoner.dateOfBirth}`)
    }

    let convictionDate
    let ageAtConviction
    if (sentence.convictionDate) {
      const dateOfConviction = dayjs(sentence.convictionDate)
      ageAtConviction = dateOfConviction.diff(dateOfBirth, 'year')
      convictionDate = dayjs(sentence.convictionDate).format('YYYY-MM-DD')
    } else {
      // fallback to use today's date if there is no convictionDate
      // Format to make JS Date to string
      // [convictionDate] = new Date(prisoner.dateOfBirth).toISOString().split('T') // here
      convictionDate = dayjs().format('YYYY-MM-DD')
      ageAtConviction = dayjs().diff(dayjs(dateOfBirth), 'year')
    }

    const offenceDate = sentence.offenceStartDate
      ? dayjs(sentence.offenceStartDate).format('YYYY-MM-DD')
      : dayjs(courtCase.date).format('YYYY-MM-DD')

    return await req.services.courtCaseService.searchSentenceTypes(
      {
        age: ageAtConviction,
        convictionDate,
        offenceDate,
        statuses: ['ACTIVE'] as ('ACTIVE' | 'INACTIVE')[],
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
