import FormWizard from 'hmpo-form-wizard'
import { NextFunction, Response } from 'express'
import { addDays, isBefore, isEqual, max } from 'date-fns'

import RecallBaseController from './recallBaseController'
import { RecallTypes } from '../../@types/recallTypes'
import logger from '../../../logger'
import { SummarisedSentence } from '../../utils/sentenceUtils'
import {
  getRevocationDate,
  getRecallTypeCode,
  getSummarisedSentenceGroups,
  isManualCaseSelection,
  isStandardOnly,
  sessionModelFields,
} from '../../helpers/formWizardHelper'

export default class RecallTypeController extends RecallBaseController {
  configure(req: FormWizard.Request, res: Response, next: NextFunction) {
    const recallTypes = Object.values(RecallTypes)
    req.form.options.fields.recallType.items = Object.values(recallTypes).map(({ code, description }) => ({
      text: description,
      value: code,
    }))

    next()
  }

  successHandler(req: FormWizard.Request, res: Response, next: NextFunction) {
    const selectedType = getRecallTypeCode(req)

    const summarisedSentenceGroups = getSummarisedSentenceGroups(req)
    const revDate = getRevocationDate(req)

    const eligibleSentences: SummarisedSentence[] =
      summarisedSentenceGroups?.flatMap(group => group.eligibleSentences) || []

    const validTypes = Object.values(RecallTypes)
      .filter(type => {
        if (isStandardOnly(req)) {
          return type.code === RecallTypes.STANDARD_RECALL.code
        }
        return (
          isManualCaseSelection(req) ||
          !type.fixedTerm ||
          this.fourteenDayRecallRequired(eligibleSentences, revDate) === type.subTwelveMonthApplicable
        )
      })
      .map(t => t.code)

    // @ts-expect-error Type code will be correct
    req.sessionModel.set(sessionModelFields.RECALL_TYPE_MISMATCH, !validTypes.includes(selectedType))
    return super.successHandler(req, res, next)
  }

  private fourteenDayRecallRequired(sentences: SummarisedSentence[], revocationDate: Date): boolean {
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

    const fourteenDaysFromRecall = addDays(revocationDate, 14)
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
