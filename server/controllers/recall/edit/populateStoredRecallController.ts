import FormWizard from 'hmpo-form-wizard'
import { NextFunction, Response } from 'express'

import { format } from 'date-fns'
// eslint-disable-next-line import/no-unresolved
import { CourtCase } from 'models'
import RecallBaseController from '../recallBaseController'
import { AdjustmentDto } from '../../../@types/adjustmentsApi/adjustmentsApiTypes'

import logger from '../../../../logger'
import { calculateUal } from '../../../utils/utils'
import {
  getCourtCaseOptions,
  getEligibleSentenceCount,
  isManualCaseSelection,
  sessionModelFields,
} from '../../../helpers/formWizardHelper'
import revocationDateCrdsDataComparison from '../../../utils/revocationDateCrdsDataComparison'
import { summariseRasCases } from '../../../utils/CaseSentenceSummariser'
import getCourtCaseOptionsFromRas from '../../../utils/rasCourtCasesUtils'

export default class PopulateStoredRecallController extends RecallBaseController {
  middlewareSetup() {
    super.middlewareSetup()
    this.use(this.setCourtCaseItems)
  }

  async setCourtCaseItems(req: FormWizard.Request, res: Response, next: NextFunction) {
    const courtCaseOptions = await getCourtCaseOptionsFromRas(req, res)
    req.sessionModel.set(sessionModelFields.COURT_CASE_OPTIONS, courtCaseOptions)
    return next()
  }

  async configure(req: FormWizard.Request, res: Response, next: NextFunction): Promise<void> {
    const { username, recallId, nomisId } = res.locals
    try {
      // Load the stored recall
      await req.services.recallService
        .getRecall(recallId, username)
        .then(async storedRecall => {
          res.locals.storedRecall = storedRecall
        })
        .catch(error => {
          logger.error(error.userMessage)
        })

      // Load existing UAL adjustments for the person and specific recall for editing
      res.locals.existingAdjustments = await req.services.adjustmentsService
        .searchUal(nomisId, username, recallId)
        .catch((e: Error): AdjustmentDto[] => {
          logger.error('Error loading existing adjustments for edit:', e.message)
          return []
        })
    } catch (error) {
      logger.error(error)
    }
    return super.configure(req, res, next)
  }

  locals(req: FormWizard.Request, res: Response): Record<string, unknown> {
    req.sessionModel.set(sessionModelFields.ENTRYPOINT, res.locals.entrypoint)
    const { storedRecall, recallId } = res.locals
    const { recallType } = storedRecall
    const revocationDate = format(new Date(storedRecall.revocationDate), 'yyyy-MM-dd')
    const returnToCustodyDate = storedRecall.returnToCustodyDate
      ? format(new Date(storedRecall.returnToCustodyDate), 'yyyy-MM-dd')
      : null
    storedRecall.ual = calculateUal(revocationDate, returnToCustodyDate)
    req.sessionModel.set(sessionModelFields.STORED_RECALL, storedRecall)
    req.sessionModel.set(sessionModelFields.RECALL_ID, recallId)
    req.sessionModel.set(sessionModelFields.IS_EDIT, true)
    req.sessionModel.set(sessionModelFields.REVOCATION_DATE, revocationDate)
    req.sessionModel.set(sessionModelFields.RECALL_TYPE, recallType.code)
    req.sessionModel.set(sessionModelFields.RTC_DATE, returnToCustodyDate)
    req.sessionModel.set(
      sessionModelFields.IN_PRISON_AT_RECALL,
      this.getBooleanAsFormValue(!storedRecall.returnToCustodyDate),
    )
    req.sessionModel.set(sessionModelFields.COURT_CASES, storedRecall.courtCaseIds)

    // Store existing adjustments in session for the edit flow
    req.sessionModel.set(sessionModelFields.EXISTING_ADJUSTMENTS, res.locals.existingAdjustments)

    // We do a crds comparison here to figure out if it was a manual recall
    // If it was, we replace the sentence info with RaS data

    revocationDateCrdsDataComparison(req, res)

    const manualSelection = isManualCaseSelection(req)
    const eligibleCount = getEligibleSentenceCount(req)

    if (manualSelection || eligibleCount === 0) {
      req.sessionModel.set(sessionModelFields.ELIGIBLE_SENTENCE_COUNT, storedRecall.sentenceIds.length)
      const allCourtCaseOptions = getCourtCaseOptions(req)

      const caseDetails = allCourtCaseOptions.filter((detail: CourtCase) =>
        storedRecall.courtCaseIds.includes(detail.caseId),
      )

      const summarisedSentencesGroups = summariseRasCases(caseDetails)
      req.sessionModel.set(sessionModelFields.SUMMARISED_SENTENCES, summarisedSentencesGroups)
       console.log('3 populateStoredRecallController', summarisedSentencesGroups[0].sentences[0].sentenceDate)
    }

    return {
      ...super.locals(req, res),
      isEdit: true,
    }
  }

  getBooleanAsFormValue(storedValue: boolean): string {
    if (storedValue === true) {
      return 'true'
    }
    if (storedValue === false) {
      return 'false'
    }
    return null
  }
}
