import express, { Request, Response } from 'express'
import notPossibleRouter from './not-possible'
import confirmCancelRouter from './confirm-cancel'
import revocationDateRouter from './revocation-date'
import rtcDateRouter from './rtc-date'
import checkSentencesRouter from './check-sentences'
import recallTypeRouter from './recall-type'
import selectCourtCaseRouter from './select-court-case'
import checkYourAnswersRouter from './check-your-answers'
import manualRecallInterceptRouter from './manual-recall-intercept'
import selectSentenceTypeRouter from './select-sentence-type'
import bulkSentenceTypeRouter from './bulk-sentence-type'
import multipleSentenceDecisionRouter from './multiple-sentence-decision'
import checkPossibleRouter from './check-possible'
import updateSentenceTypesSummaryRouter from './update-sentence-types-summary'
import noCasesSelectedRouter from './no-cases-selected'
import noSentencesInterruptRouter from './no-sentences-interrupt'
import conflictingAdjustmentsInterruptRouter from './conflicting-adjustments-interrupt'
import completeRouter from './complete'
import resetRecallSession from '../../helpers/resetSessionHelper'
// import logger from '../../../logger' // Unused import

const newRecallRouter = express.Router({ mergeParams: true })

// Handle base route - reset session and redirect to first step
newRecallRouter.get('/', (req: Request, res: Response) => {
  // Reset the recall session for a new recall
  resetRecallSession(req)

  // Store entrypoint if provided
  const entrypoint = req.query.entrypoint as string | undefined
  if (entrypoint && req.session.formData) {
    req.session.formData.entrypoint = entrypoint
  } else if (entrypoint) {
    req.session.formData = { entrypoint }
  }

  // The checkCrdsValidation middleware will handle validation check before getting here
  // If there were validation errors, it would have redirected to /not-possible already
  // So if we're here, it's safe to proceed to the first step
  res.redirect(`${req.baseUrl}/revocation-date`)
})

// Mount all routes
newRecallRouter.use(notPossibleRouter)
newRecallRouter.use(confirmCancelRouter)
newRecallRouter.use(revocationDateRouter)
newRecallRouter.use(rtcDateRouter)
newRecallRouter.use(checkSentencesRouter)
newRecallRouter.use(recallTypeRouter)
newRecallRouter.use(selectCourtCaseRouter)
newRecallRouter.use(checkYourAnswersRouter)
newRecallRouter.use(manualRecallInterceptRouter)
newRecallRouter.use(selectSentenceTypeRouter)
newRecallRouter.use(bulkSentenceTypeRouter)
newRecallRouter.use(multipleSentenceDecisionRouter)
newRecallRouter.use(checkPossibleRouter)
newRecallRouter.use(updateSentenceTypesSummaryRouter)
newRecallRouter.use(noCasesSelectedRouter)
newRecallRouter.use(noSentencesInterruptRouter)
newRecallRouter.use(conflictingAdjustmentsInterruptRouter)
newRecallRouter.use(completeRouter)

export default newRecallRouter
