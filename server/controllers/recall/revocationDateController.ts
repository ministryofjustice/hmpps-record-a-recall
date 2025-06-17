import FormWizard from 'hmpo-form-wizard'
import { NextFunction, Response } from 'express'
import { isBefore, isEqual, isAfter, min } from 'date-fns'
// eslint-disable-next-line import/no-unresolved
import { CourtCase } from 'models'
import RecallBaseController from './recallBaseController'
import { PrisonerSearchApiPrisoner } from '../../@types/prisonerSearchApi/prisonerSearchTypes'
import getJourneyDataFromRequest, {
  getAdjustmentsToConsiderForValidation,
  getCourtCaseOptions,
  getCrdsSentences,
  getExistingAdjustments,
  getRecallRoute,
  getRevocationDate,
  RecallJourneyData,
  sessionModelFields,
} from '../../helpers/formWizardHelper'
import { AdjustmentDto } from '../../@types/adjustmentsApi/adjustmentsApiTypes'
import { summariseRasCases } from '../../utils/CaseSentenceSummariser'
import { determineInvalidRecallTypes } from '../../utils/RecallEligiblityCalculator'
import { SummarisedSentenceGroup } from '../../utils/sentenceUtils'

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
    console.log('-----------succaesshandler')
    const courtCaseOptions = getCourtCaseOptions(req)
    const caseDetails = courtCaseOptions
      .filter((c: CourtCase) => c.status !== 'DRAFT')
      .filter((c: CourtCase) => c.sentenced)
    const summarisedRasCases = summariseRasCases(caseDetails)
    const doesContainNonSDS = summarisedRasCases.some(group =>
      group.sentences.some(
        s =>
          /* eslint-disable-next-line  @typescript-eslint/no-explicit-any */
          (s as any).sentence &&
          /* eslint-disable-next-line  @typescript-eslint/no-explicit-any */
          (s as any).sentence.sentenceType &&
          /* eslint-disable-next-line  @typescript-eslint/no-explicit-any */
          typeof (s as any).sentence.sentenceType.classification === 'string' &&
          /* eslint-disable-next-line  @typescript-eslint/no-explicit-any */
          (s as any).sentence.sentenceType.classification == 'STANDARD',
      ),
    )

    //? notation to get rid of comments 
    // breackdown for adjusted SLEDs eg by any adjustments eg LAL
    // crds not supporting EDS cases so test case not achievable  

    // sentence type has classifcation in api not just the description. 
    //dto has a classification in saying standard instead of looking at the descirption --> look as RAS swagger. --> sentenceType.classification ==== 'standard'
    // TODO this is probably hacky, determineRecallEligibilityFromValidation should be giving us a validation error that takes us down the manual path??
    const summarisedSentencesGroups = summarisedRasCases
      .map(group => {
        // Filter the main sentences array based on sentence.sentenceType.description
        const filteredMainSentences = group.sentences.filter(
          s =>
            /* eslint-disable-next-line  @typescript-eslint/no-explicit-any */
            (s as any).sentence &&
            /* eslint-disable-next-line  @typescript-eslint/no-explicit-any */
            (s as any).sentence.sentenceType &&
            /* eslint-disable-next-line  @typescript-eslint/no-explicit-any */
            typeof (s as any).sentence.sentenceType.classification === 'string' &&
            /* eslint-disable-next-line  @typescript-eslint/no-explicit-any */
            (s as any).sentence.sentenceType.classification !== 'STANDARD',
        )

        console.log('----------------summarisedRasCases', summarisedRasCases)

        // Get the UUIDs of these filtered SDS sentences
        /* eslint-disable-next-line  @typescript-eslint/no-explicit-any */
        const sdsSentenceUuids = new Set(filteredMainSentences.map(s => (s as any).sentence.sentenceUuid))

        // Filter eligibleSentences: keep only those whose sentenceId is in sdsSentenceUuids
        const filteredEligibleSentences = group.eligibleSentences.filter(es => sdsSentenceUuids.has(es.sentenceId))

        // Filter ineligibleSentences: keep only those whose sentenceId is in sdsSentenceUuids
        const filteredIneligibleSentences = group.ineligibleSentences.filter(is => sdsSentenceUuids.has(is.sentenceId))

        return {
          ...group,
          sentences: filteredMainSentences,
          eligibleSentences: filteredEligibleSentences,
          ineligibleSentences: filteredIneligibleSentences,
          hasEligibleSentences: filteredEligibleSentences.length > 0,
          hasIneligibleSentences: filteredIneligibleSentences.length > 0,
        }
      })
      .filter(group => group.sentences.length > 0)
    const revocationDate = getRevocationDate(req)

    const invalidRecallTypes = determineInvalidRecallTypes(summarisedSentencesGroups, revocationDate)

    req.sessionModel.set(sessionModelFields.INVALID_RECALL_TYPES, invalidRecallTypes)
    res.locals.summarisedSentencesGroups = summarisedSentencesGroups
    req.sessionModel.set(sessionModelFields.SUMMARISED_SENTENCES, summarisedSentencesGroups)
    res.locals.casesWithEligibleSentences = summarisedSentencesGroups.filter(group => group.hasEligibleSentences).length
    const sentenceCount = summarisedSentencesGroups?.flatMap((g: SummarisedSentenceGroup) =>
      g.eligibleSentences.flatMap(s => s.sentenceId),
    ).length

    req.sessionModel.set(sessionModelFields.ELIGIBLE_SENTENCE_COUNT, sentenceCount)
    res.locals.casesWithEligibleSentences = sentenceCount
    if (doesContainNonSDS) {
      req.sessionModel.set(sessionModelFields.MANUAL_CASE_SELECTION, true)
    } else if (getRecallRoute(req) === 'NORMAL') {
      req.sessionModel.set(sessionModelFields.MANUAL_CASE_SELECTION, false)
    }
    return super.successHandler(req, res, next)
  }
}
