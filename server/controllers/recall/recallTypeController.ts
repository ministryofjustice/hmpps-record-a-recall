import FormWizard from 'hmpo-form-wizard'
import { NextFunction, Response } from 'express'
import { addDays, isBefore, isEqual, max } from 'date-fns'

import RecallBaseController from './recallBaseController'
import { RecallType, RecallTypes } from '../../@types/recallTypes'
import logger from '../../../logger'
import { SummarisedSentence, SummarisedSentenceGroup } from '../../utils/sentenceUtils'

export default class RecallTypeController extends RecallBaseController {
  configure(req: FormWizard.Request, res: Response, next: NextFunction) {
    const recallTypes = Object.values(RecallTypes)
    req.form.options.fields.recallType.items = Object.values(recallTypes).map(({ code, description }) => ({
      text: description,
      value: code,
    }))

    next()
  }

  locals(req: FormWizard.Request, res: Response): Record<string, unknown> {
    const summarisedSentenceGroups = req.sessionModel.get<SummarisedSentenceGroup[]>('summarisedSentencesGroups')
    const recallDate = req.sessionModel.get<string>('recallDate')

    const eligibleSentences: SummarisedSentence[] =
      summarisedSentenceGroups?.flatMap(group => group.eligibleSentences) || []

    const recallTypes: RecallType[] = Object.values(RecallTypes)
    const fourteenDayRecallRequired = this.fourteenDayRecallRequired(eligibleSentences, recallDate)

    req.form.options.fields.recallType.items = Object.values(recallTypes)
      .filter(type => {
        return !type.fixedTerm || fourteenDayRecallRequired === type.subTwelveMonthApplicable
      })
      .map(({ code, description }) => ({
        text: description,
        value: code,
      }))

    return super.locals(req, res)
  }

  private fourteenDayRecallRequired(sentences: SummarisedSentence[], recallDate: string): boolean {
    if (this.hasSentencesEqualToOrOverTwelveMonths(sentences) && !this.hasSentencesUnderTwelveMonths(sentences)) {
      logger.debug('All sentences are over twelve months')
      return false
    }
    if (this.hasSentencesUnderTwelveMonths(sentences) && !this.hasSentencesEqualToOrOverTwelveMonths(sentences)) {
      logger.debug('All sentences are under twelve months')
      return true
    }
    const latestExpiryDateOfTwelveMonthPlusSentences = max(
      sentences
        .filter(s => this.hasSled(s))
        .filter(s => this.over12MonthSentence(s))
        .map(s => s.unadjustedSled),
    )
    logger.debug('Mixture of sentence lengths')

    const fourteenDaysFromRecall = addDays(recallDate, 14)
    logger.debug(
      `Checking if latest SLED [${latestExpiryDateOfTwelveMonthPlusSentences}] is over 14 days from date of recall [${fourteenDaysFromRecall}]`,
    )

    return (
      isEqual(latestExpiryDateOfTwelveMonthPlusSentences, fourteenDaysFromRecall) ||
      isBefore(latestExpiryDateOfTwelveMonthPlusSentences, fourteenDaysFromRecall)
    )
  }

  private hasSentencesEqualToOrOverTwelveMonths(sentences: SummarisedSentence[]): boolean {
    return sentences.some(this.over12MonthSentence)
  }

  private hasSentencesUnderTwelveMonths(sentences: SummarisedSentence[]): boolean {
    return sentences.some(sentence => sentence.sentenceLengthDays < 365)
  }

  private over12MonthSentence(sentence: SummarisedSentence) {
    return sentence.sentenceLengthDays >= 365
  }

  private hasSled(sentence: SummarisedSentence) {
    return sentence.unadjustedSled !== null
  }
}
