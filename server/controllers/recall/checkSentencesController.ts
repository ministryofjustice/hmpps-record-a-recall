import FormWizard from 'hmpo-form-wizard'
import { Response } from 'express'

import { compact } from 'lodash'
import RecallBaseController from './recallBaseController'
import {
  CalculatedReleaseDates,
  CalculationBreakdown,
  ConcurrentSentenceBreakdown,
  ConsecutiveSentenceBreakdown,
  ConsecutiveSentencePart,
  Offence,
  SentenceAndOffenceWithReleaseArrangements,
  Term,
} from '../../@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'
import {
  findConcurrentSentenceBreakdown,
  findConsecutiveSentenceBreakdown,
  groupSentencesByCaseRefAndCourt,
  hasManualOnlySentences,
  isNonSDS,
  summarisedSentenceGroup,
  summarisedSentence,
} from '../../utils/sentenceUtils'
import toSummaryListRow from '../../helpers/componentHelper'
import { format8DigitDate } from '../../formatters/formatDate'
import logger from '../../../logger'
import { eligibilityReasons, RecallEligibility } from '../../@types/recallEligibility'

export default class CheckSentencesController extends RecallBaseController {
  middlewareSetup() {
    super.middlewareSetup()
  }

  locals(req: FormWizard.Request, res: Response): Record<string, unknown> {
    const sentences = req.sessionModel.get<SentenceAndOffenceWithReleaseArrangements[]>('sentences')
    const calculation = req.sessionModel.get<CalculatedReleaseDates>('temporaryCalculation')
    const breakdown = req.sessionModel.get<CalculationBreakdown>('breakdown')
    const recallDate = new Date(req.sessionModel.get<string>('recallDate'))

    res.locals.latestSled = calculation.dates.SLED

    const groupedSentences = groupSentencesByCaseRefAndCourt(sentences)
    const summarisedSentenceGroups: summarisedSentenceGroup[] = []

    Object.keys(groupedSentences).forEach(caseRef => {
      const groupsSentences = groupedSentences[caseRef]
      const summarisedGroup: summarisedSentenceGroup = {
        caseRefAndCourt: caseRef,
        ineligibleSentences: [],
        hasIneligibleSentences: false,
        eligibleSentences: [],
        hasEligibleSentences: false,
      }

      summarisedGroup.caseRefAndCourt = caseRef
      groupsSentences.forEach((sentence: SentenceAndOffenceWithReleaseArrangements) => {
        const concurrentSentenceBreakdown = findConcurrentSentenceBreakdown(sentence, breakdown)
        const consecutiveSentenceBreakdown = breakdown.consecutiveSentence
        const consecutiveSentencePartBreakdown = findConsecutiveSentenceBreakdown(sentence, breakdown)

        const { offence } = sentence

        const recallEligibility = this.getEligibility(
          sentence,
          concurrentSentenceBreakdown,
          consecutiveSentencePartBreakdown ? consecutiveSentenceBreakdown : null,
          recallDate,
        )

        const forthConsConc = this.forthwithConsecutiveConcurrent(
          concurrentSentenceBreakdown,
          consecutiveSentencePartBreakdown,
        )

        const sentenceLengthDays =
          concurrentSentenceBreakdown?.sentenceLengthDays || consecutiveSentencePartBreakdown?.sentenceLengthDays
        const aggregateSentenceLengthDays = consecutiveSentenceBreakdown?.sentenceLengthDays

        const unadjustedSled = this.getDate(
          concurrentSentenceBreakdown,
          consecutiveSentenceBreakdown,
          consecutiveSentencePartBreakdown,
          'SLED',
        )?.unadjusted

        const unadjustedLed = this.getDate(
          concurrentSentenceBreakdown,
          consecutiveSentenceBreakdown,
          consecutiveSentencePartBreakdown,
          'LED',
        )?.unadjusted

        const summary = compact([
          toSummaryListRow('Committed on', this.stringifyOffenceDate(offence)),
          toSummaryListRow('Sentence date', format8DigitDate(sentence.sentenceDate)),
          toSummaryListRow('Sentence type', sentence.sentenceTypeDescription),
          toSummaryListRow('Custodial term', this.getCustodialTerm(sentence.terms)),
          toSummaryListRow('Licence period', this.getLicenceTerm(sentence.terms)),
          toSummaryListRow('Case Sequence', `${sentence.caseSequence}`),
          toSummaryListRow('Line Sequence', `${sentence.lineSequence}`),
          toSummaryListRow('Consecutive or concurrent', forthConsConc),
          toSummaryListRow('Unadjusted SLED', unadjustedSled),
          toSummaryListRow('Unadjusted LED', unadjustedLed),
          toSummaryListRow(
            consecutiveSentencePartBreakdown ? 'Aggregate sentence length' : 'Sentence length',
            consecutiveSentencePartBreakdown ? `${aggregateSentenceLengthDays}` : `${sentenceLengthDays}`,
          ),
        ])

        const thisSummarisedSentence: summarisedSentence = {
          recallEligibility,
          summary,
          offenceCode: sentence.offence.offenceCode,
          offenceDescription: sentence.offence.offenceDescription,
          unadjustedSled: unadjustedSled || unadjustedLed,
          sentenceLengthDays: consecutiveSentencePartBreakdown ? aggregateSentenceLengthDays : sentenceLengthDays,
        }

        if (recallEligibility.recallOptions !== 'NOT_POSSIBLE') {
          summarisedGroup.hasEligibleSentences = true
          summarisedGroup.eligibleSentences.push(thisSummarisedSentence)
        } else {
          summarisedGroup.hasIneligibleSentences = true
          summarisedGroup.ineligibleSentences.push(thisSummarisedSentence)
        }
      })
      summarisedSentenceGroups.push(summarisedGroup)
    })

    req.sessionModel.set('summarisedSentencesGroups', summarisedSentenceGroups)
    res.locals.groupedSentences = summarisedSentenceGroups
    res.locals.casesWithEligibleSentences = summarisedSentenceGroups.filter(group => group.hasEligibleSentences).length
    const eligibleSentenceCount = summarisedSentenceGroups
      .filter(group => group.hasEligibleSentences)
      .map(g => g.eligibleSentences.length)
      .reduce((sum, current) => sum + current, 0)

    const manualSentenceSelection = summarisedSentenceGroups
      .filter(group => group.hasEligibleSentences)
      .map(g => hasManualOnlySentences(g.eligibleSentences))

    req.sessionModel.set('eligibleSentenceCount', eligibleSentenceCount)
    req.sessionModel.set('casesWithEligibleSentences', res.locals.casesWithEligibleSentences)
    req.sessionModel.set('manualSentenceSelection', manualSentenceSelection)

    return super.locals(req, res)
  }

  private forthwithConsecutiveConcurrent(
    concBreakdown: ConcurrentSentenceBreakdown,
    consPartBreakdown: ConsecutiveSentencePart,
  ): string {
    if (concBreakdown) {
      return 'Concurrent'
    }
    if (consPartBreakdown) {
      if (consPartBreakdown.consecutiveToLineSequence && consPartBreakdown.consecutiveToCaseSequence) {
        return `Consecutive to case ${consPartBreakdown.consecutiveToCaseSequence}, line ${consPartBreakdown.consecutiveToLineSequence}`
      }
      return 'Forthwith'
    }

    return 'Unknown'
  }

  private getEligibility(
    sentence: SentenceAndOffenceWithReleaseArrangements,
    concBreakdown: ConcurrentSentenceBreakdown,
    consBreakdown: ConsecutiveSentenceBreakdown,
    recallDate: Date,
  ): RecallEligibility {
    const breakdown = concBreakdown || consBreakdown

    if (!breakdown) {
      logger.warn(
        `No breakdown found for sentence with line seq ${sentence.lineSequence} and case seq ${sentence.caseSequence}`,
      )
      return eligibilityReasons.NO_BREAKDOWN
    }

    const dateTypes = Object.keys(breakdown.dates)

    if (!(dateTypes.includes('SLED') || dateTypes.includes('SED')) && !dateTypes.includes('CRD')) {
      return eligibilityReasons.NO_SLED_OR_SED_AND_CRD
    }

    const adjustedSled = breakdown.dates.SLED
      ? new Date(breakdown.dates.SLED.adjusted)
      : new Date(breakdown.dates.SED?.adjusted)

    if (isNonSDS(sentence)) {
      return eligibilityReasons.NON_SDS
    }

    if (recallDate < new Date(sentence.sentenceDate)) {
      return eligibilityReasons.RECALL_DATE_BEFORE_SENTENCE_START
    }

    if (recallDate < adjustedSled) {
      return eligibilityReasons.RECALL_DATE_AFTER_EXPIRATION_DATE
    }

    return eligibilityReasons.HAPPY_PATH_POSSIBLE
  }

  private getCustodialTerm(terms: Term[]): string {
    return this.getTerm(terms, 'IMP')
  }

  private getLicenceTerm(terms: Term[]): string {
    return this.getTerm(terms, 'LIC')
  }

  private getTerm(terms: Term[], type: string): string {
    const term = terms?.find(t => t.code === type)

    return term ? `${term.years} years ${term.months} months ${term.weeks} weeks ${term.days} days` : undefined
  }

  private stringifyOffenceDate(offence: Offence) {
    return offence.offenceEndDate
      ? `${format8DigitDate(offence.offenceStartDate)} to ${format8DigitDate(offence.offenceEndDate)}`
      : format8DigitDate(offence.offenceStartDate)
  }

  private getDate(
    concBreakdown: ConcurrentSentenceBreakdown,
    consBreakdown: ConsecutiveSentenceBreakdown,
    consPartBreakdown: ConsecutiveSentencePart,
    dateType: string,
  ) {
    if (concBreakdown) {
      return concBreakdown.dates[dateType]
    }
    if (consPartBreakdown) {
      return consBreakdown.dates[dateType]
    }
    return null
  }
}
