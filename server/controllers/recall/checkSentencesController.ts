import FormWizard from 'hmpo-form-wizard'
import { NextFunction, Response } from 'express'

import { compact } from 'lodash'
import RecallBaseController from './recallBaseController'
import {
  CalculatedReleaseDates,
  CalculationBreakdown,
  ConcurrentSentenceBreakdown,
  ConsecutiveSentenceBreakdown,
  Offence,
  SentenceAndOffenceWithReleaseArrangements,
  Term,
} from '../../@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'
import { groupSentencesByCaseRefAndCourt } from '../../utils/sentenceUtils'
import toSummaryListRow from '../../helpers/componentHelper'
import { format8DigitDate } from '../../formatters/formatDate'
import { SummaryListRow } from '../../@types/govuk'

export default class CheckSentencesController extends RecallBaseController {
  middlewareSetup() {
    super.middlewareSetup()
    this.use(this.getSentences)
    this.use(this.getCalculationBreakdown)
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
        const concurrentSentenceBreakdown = breakdown.concurrentSentences.find(b => {
          return b.caseSequence === sentence.caseSequence && b.lineSequence === sentence.lineSequence
        })
        const consecutiveSentenceBreakdown = breakdown.consecutiveSentence

        const { offence } = sentence

        const eligibleForRecall = this.isEligible(
          sentence,
          concurrentSentenceBreakdown,
          consecutiveSentenceBreakdown,
          recallDate,
        )

        const summary = compact([
          toSummaryListRow('Committed on', this.stringifyOffenceDate(offence)),
          toSummaryListRow('Conviction date', format8DigitDate(sentence.sentenceDate)),
          toSummaryListRow('Sentence type', sentence.sentenceTypeDescription),
          toSummaryListRow('Custodial term', this.getCustodialTerm(sentence.terms)),
          toSummaryListRow('Licence period', this.getLicenceTerm(sentence.terms)),
          toSummaryListRow(
            'Consecutive or concurrent',
            concurrentSentenceBreakdown && !consecutiveSentenceBreakdown ? 'Concurrent' : 'Consecutive',
          ),
          toSummaryListRow(
            'Unadjusted SLED',
            this.getDate(concurrentSentenceBreakdown, consecutiveSentenceBreakdown, 'SLED')?.unadjusted,
          ),
          toSummaryListRow(
            'Adjusted SLED',
            this.getDate(concurrentSentenceBreakdown, consecutiveSentenceBreakdown, 'SLED')?.adjusted,
          ),
          toSummaryListRow(
            'Unadjusted SED',
            this.getDate(concurrentSentenceBreakdown, consecutiveSentenceBreakdown, 'SED')?.unadjusted,
          ),
          toSummaryListRow(
            'Adjusted SED',
            this.getDate(concurrentSentenceBreakdown, consecutiveSentenceBreakdown, 'SED')?.adjusted,
          ),
        ])

        const summarisedSentence: summarisedSentence = {
          eligibleForRecall,
          summary,
          offenceCode: sentence.offence.offenceCode,
          offenceDescription: sentence.offence.offenceDescription,
        }

        if (eligibleForRecall) {
          summarisedGroup.hasEligibleSentences = true
          summarisedGroup.eligibleSentences.push(summarisedSentence)
        } else {
          summarisedGroup.hasIneligibleSentences = true
          summarisedGroup.ineligibleSentences.push(summarisedSentence)
        }
      })
      summarisedSentenceGroups.push(summarisedGroup)
    })
    res.locals.groupedSentences = summarisedSentenceGroups
    res.locals.casesWithEligibleSentences = summarisedSentenceGroups.filter(group => group.hasEligibleSentences).length

    return super.locals(req, res)
  }

  private isEligible(
    sentence: SentenceAndOffenceWithReleaseArrangements,
    concBreakdown: ConcurrentSentenceBreakdown,
    consBreakdown: ConsecutiveSentenceBreakdown,
    recallDate: Date,
  ): boolean {
    const breakdown = concBreakdown || consBreakdown
    const dateTypes = Object.keys(breakdown.dates)

    if (!(dateTypes.includes('SLED') || dateTypes.includes('SED'))) {
      return false
    }

    const sled = breakdown.dates.SLED
      ? new Date(breakdown.dates.SLED.adjusted)
      : new Date(breakdown.dates.SED?.adjusted)

    return recallDate > new Date(sentence.sentenceDate) && recallDate < sled
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
    dateType: string,
  ) {
    return consBreakdown ? consBreakdown.dates[dateType] : concBreakdown.dates[dateType]
  }

  async getSentences(req: FormWizard.Request, res: Response, next: NextFunction) {
    const { username } = req.user
    const temporaryCalculation = req.sessionModel.get<CalculatedReleaseDates>('temporaryCalculation')
    const sentences = req.sessionModel.get<SentenceAndOffenceWithReleaseArrangements[]>('sentences')
    if (temporaryCalculation && !sentences) {
      req.services.calculationService
        .getSentencesAndReleaseDates(temporaryCalculation.calculationRequestId, username)
        .then(newSentences => {
          req.sessionModel.set('sentences', newSentences)
          req.sessionModel.save()
          next()
          // TODO Don't crash the service if we fail here, redirect to not-possible
        })
        .catch(error => {
          req.sessionModel.unset('sentences')
          req.sessionModel.set('crdsError', error.userMessage)
          next()
        })
    } else {
      next()
    }
  }

  async getCalculationBreakdown(req: FormWizard.Request, res: Response, next: NextFunction) {
    const { username } = req.user
    const temporaryCalculation = req.sessionModel.get<CalculatedReleaseDates>('temporaryCalculation')
    const breakdown = req.sessionModel.get<CalculationBreakdown>('breakdown')
    if (temporaryCalculation && !breakdown) {
      req.services.calculationService
        .getCalculationBreakdown(temporaryCalculation.calculationRequestId, username)
        .then(newBreakdown => {
          req.sessionModel.set('breakdown', newBreakdown)
          req.sessionModel.save()
          next()
          // TODO Don't crash the service if we fail here, redirect to not-possible
        })
        .catch(error => {
          req.sessionModel.unset('breakdown')
          req.sessionModel.set('crdsError', error.userMessage)
          next()
        })
    } else {
      next()
    }
  }
}

type summarisedSentence = {
  eligibleForRecall: boolean
  summary: SummaryListRow[]
  offenceCode: string
  offenceDescription: string
}

type summarisedSentenceGroup = {
  caseRefAndCourt: string
  eligibleSentences: summarisedSentence[]
  ineligibleSentences: summarisedSentence[]
  hasEligibleSentences: boolean
  hasIneligibleSentences: boolean
}
