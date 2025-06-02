import FormWizard from 'hmpo-form-wizard'
import { NextFunction, Response } from 'express'

import { isBefore, isEqual, isAfter, min } from 'date-fns'
import RecallBaseController from './recallBaseController'
import { PrisonerSearchApiPrisoner } from '../../@types/prisonerSearchApi/prisonerSearchTypes'
import revocationDateCrdsDataComparison from '../../utils/revocationDateCrdsDataComparison'
import getJourneyDataFromRequest, {
  getAdjustmentsToConsiderForValidation, getBreakdown, getCourtCaseOptions, getCourtCases,
  getCrdsSentences,
  getExistingAdjustments,
  getRecallRoute, getRevocationDate,
  RecallJourneyData, sessionModelFields,
} from '../../helpers/formWizardHelper'
import { AdjustmentDto } from '../../@types/adjustmentsApi/adjustmentsApiTypes'
import {CourtCase} from "models";
import {summariseRasCases} from "../../utils/CaseSentenceSummariser";
import {determineInvalidRecallTypes} from "../../utils/RecallEligiblityCalculator";
import {SummarisedSentenceGroup} from "../../utils/sentenceUtils";

export default class RevocationDateController extends RecallBaseController {
  locals(req: FormWizard.Request, res: Response): Record<string, unknown> {
    const locals = super.locals(req, res)
    const prisoner: PrisonerSearchApiPrisoner = locals.prisoner as PrisonerSearchApiPrisoner

    const backLink = `/person/${prisoner.prisonerNumber}${locals.isEditRecall ? `/recall/${locals.recallId}/edit/edit-summary` : ''}`
    return { ...locals, backLink }
  }

  validateFields(req: FormWizard.Request, res: Response, callback: (errors: unknown) => void) {
    super.validateFields(req, res, errorsParam => {
      const validationErrors = { ...(errorsParam || {}) } as Record<string, FormWizard.Controller.Error>
      const { values } = req.form
      const sentences = getCrdsSentences(req)

      const earliestSentenceDate = min(sentences.map(s => new Date(s.sentenceDate)))

      if (isBefore(values.revocationDate as string, earliestSentenceDate)) {
        validationErrors.revocationDate = this.formError('revocationDate', 'mustBeAfterEarliestSentenceDate')
      }

      const journeyData: RecallJourneyData = getJourneyDataFromRequest(req)
      const allExistingAdjustments: AdjustmentDto[] = getExistingAdjustments(req)
      const adjustmentsToConsider = getAdjustmentsToConsiderForValidation(journeyData, allExistingAdjustments)

      const revocationDate = new Date(values.revocationDate as string)

      const isWithinAdjustment = adjustmentsToConsider.some((adjustment: AdjustmentDto) => {
        if (!adjustment.fromDate || !adjustment.toDate) return false

        return (
          (isEqual(revocationDate, adjustment.fromDate) || isAfter(revocationDate, adjustment.fromDate)) &&
          isBefore(revocationDate, adjustment.toDate)
        )
      })

      if (isWithinAdjustment) {
        validationErrors.revocationDate = this.formError('revocationDate', 'cannotBeWithinAdjustmentPeriod')
      }

      callback(validationErrors)
    })
  }

  successHandler(req: FormWizard.Request, res: Response, next: NextFunction) {
    console.log('did we get here???????', getRecallRoute(req))
    if (getRecallRoute(req) === 'MANUAL') {
      revocationDateCrdsDataComparison(req, res)
    }

    // const caseDetails = getCourtCaseOptions(req).filter((c: CourtCase) => c.status !== 'DRAFT').filter((c: CourtCase) => c.sentenced)
    // const crdsSentences = getCrdsSentences(req)
    // const breakdown = getBreakdown(req)
    // const revocationDate = getRevocationDate(req)
    // console.log('------- Case Details: -------')
    // console.log(caseDetails)
    // console.log('------- CRDS Sentences: -------')
    // console.log(crdsSentences)
    // const summarisedSentencesGroups = summariseRasCases(caseDetails, crdsSentences, breakdown)
    // console.log('------- Summarised Sentences Groups: -------')
    // console.log(summarisedSentencesGroups)

    // const invalidRecallTypes = determineInvalidRecallTypes(summarisedSentencesGroups, revocationDate)

    // req.sessionModel.set(sessionModelFields.INVALID_RECALL_TYPES, invalidRecallTypes)
    // res.locals.summarisedSentencesGroups = summarisedSentencesGroups
    // req.sessionModel.set(sessionModelFields.SUMMARISED_SENTENCES, summarisedSentencesGroups)
    // res.locals.casesWithEligibleSentences = summarisedSentencesGroups.filter(group => group.hasEligibleSentences).length
    // const sentenceCount = summarisedSentencesGroups?.flatMap((g: SummarisedSentenceGroup) =>
    //   g.eligibleSentences.flatMap(s => s.sentenceId),
    // ).length
    // req.sessionModel.set(sessionModelFields.ELIGIBLE_SENTENCE_COUNT, sentenceCount)
    // res.locals.casesWithEligibleSentences = sentenceCount
    // req.sessionModel.set(sessionModelFields.MANUAL_CASE_SELECTION, true)
    return super.successHandler(req, res, next)
  }
}
