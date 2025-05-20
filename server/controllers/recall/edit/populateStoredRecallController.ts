import FormWizard from 'hmpo-form-wizard'
import { NextFunction, Response } from 'express'

import { format } from 'date-fns'
// eslint-disable-next-line import/no-unresolved
import { CourtCase } from 'models'
import RecallBaseController from '../recallBaseController'

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
    req.sessionModel.set(sessionModelFields.COURT_CASE_OPTIONS, await getCourtCaseOptionsFromRas(req, res))
    return next()
  }

  async configure(req: FormWizard.Request, res: Response, next: NextFunction): Promise<void> {
    const { username, recallId } = res.locals
    try {
      await req.services.recallService
        .getRecall(recallId, username)
        .then(async storedRecall => {
          res.locals.storedRecall = storedRecall
        })
        .catch(error => {
          logger.error(error.userMessage)
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

    // We do a crds comparison here to figure out if it was a manual recall
    // If it was, we replace the sentence info with RaS data
    revocationDateCrdsDataComparison(req)
    if (isManualCaseSelection(req) || getEligibleSentenceCount(req) === 0) {
      req.sessionModel.set(sessionModelFields.ELIGIBLE_SENTENCE_COUNT, storedRecall.sentenceIds.length)
      const caseDetails = getCourtCaseOptions(req).filter((detail: CourtCase) =>
        storedRecall.courtCaseIds.includes(detail.caseId),
      )
      const summarisedSentencesGroups = summariseRasCases(caseDetails, [], null)
      req.sessionModel.set(sessionModelFields.SUMMARISED_SENTENCES, summarisedSentencesGroups)
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
