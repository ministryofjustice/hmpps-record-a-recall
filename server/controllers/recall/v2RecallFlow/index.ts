import express, { Router } from 'express'
import asyncMiddleware from '../../../middleware/asyncMiddleware'
import { validate, populateValidationData } from '../../../middleware/validationMiddleware'
import loadPrisoner from '../../../middleware/loadPrisoner'
import loadCourtCases from '../../../middleware/loadCourtCases'
import CheckPossibleControllerV2 from './checkPossibleControllerV2'
import RevocationDateControllerV2 from './revocationDateControllerV2'
import NotPossibleControllerV2 from './notPossibleControllerV2'
import ReturnToCustodyDateControllerV2 from './returnToCustodyDateControllerV2'
import ConfirmCancelControllerV2 from './confirmCancelControllerV2'
import ConflictingAdjustmentsInterruptControllerV2 from './conflictingAdjustmentsInterruptControllerV2'
import NoSentencesInterruptControllerV2 from './noSentencesInterruptControllerV2'
import ManualRecallInterceptControllerV2 from './manualRecallInterceptControllerV2'
import CheckSentencesControllerV2 from './checkSentencesControllerV2'
import SelectCourtCaseControllerV2 from './selectCourtCaseControllerV2'
import UpdateSentenceTypesSummaryControllerV2 from './updateSentenceTypesSummaryControllerV2'
import SelectSentenceTypeControllerV2 from './selectSentenceTypeControllerV2'
import RecallTypeControllerV2 from './recallTypeControllerV2'
import CheckYourAnswersControllerV2 from './checkYourAnswersControllerV2'
import RecallRecordedControllerV2 from './recallRecordedControllerV2'
import MultipleSentenceDecisionControllerV2 from './multipleSentenceDecisionControllerV2'
import BulkSentenceTypeControllerV2 from './bulkSentenceTypeControllerV2'
import underConstructionController from './underConstructionController'
import { sessionModelAdapter } from '../../../middleware/sessionModelAdapter'
import { Services } from '../../../services'

export default function routes(services?: Services): Router {
  const router = express.Router()

  // Apply session model adapter for compatibility with SessionManager
  // TODO: Remove once SessionManager is refactored to use Express sessions directly
  router.use(sessionModelAdapter)

  // V2 recall flow route - /person/:nomisId/record-recall-v2
  // Entry point - check if recall is possible (matches original '/' route in steps.ts)
  router.get('/', asyncMiddleware(CheckPossibleControllerV2.get))

  // Not possible page (no form submission)
  router.get(
    '/not-possible',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    asyncMiddleware(NotPossibleControllerV2.get),
  )

  // Revocation date page with validation
  router.get(
    '/revocation-date',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    populateValidationData,
    asyncMiddleware(RevocationDateControllerV2.get),
  )
  router.post(
    '/revocation-date',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    loadCourtCases(
      services?.courtCaseService,
      services?.manageOffencesService,
      services?.courtService,
      services?.calculationService,
      services?.nomisMappingService,
    ),
    validate('revocationDate'),
    asyncMiddleware(RevocationDateControllerV2.post),
  )

  // Return to custody date page with validation
  router.get(
    '/rtc-date',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    populateValidationData,
    asyncMiddleware(ReturnToCustodyDateControllerV2.get),
  )
  router.post(
    '/rtc-date',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    validate('returnToCustody'),
    asyncMiddleware(ReturnToCustodyDateControllerV2.post),
  )

  // Confirm cancel page with validation
  router.get(
    '/confirm-cancel',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    populateValidationData,
    asyncMiddleware(ConfirmCancelControllerV2.get),
  )
  router.post(
    '/confirm-cancel',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    validate('confirmCancel'),
    asyncMiddleware(ConfirmCancelControllerV2.post),
  )

  // Interrupt pages (GET only, no POST needed)
  router.get(
    '/conflicting-adjustments-interrupt',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    asyncMiddleware(ConflictingAdjustmentsInterruptControllerV2.get),
  )

  router.get(
    '/no-sentences-interrupt',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    asyncMiddleware(NoSentencesInterruptControllerV2.get),
  )

  // Manual recall intercept page (no validation needed as it's just a continue button)
  router.get(
    '/manual-recall-intercept',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    populateValidationData,
    asyncMiddleware(ManualRecallInterceptControllerV2.get),
  )
  router.post(
    '/manual-recall-intercept',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    asyncMiddleware(ManualRecallInterceptControllerV2.post),
  )

  // Select court case page (manual recall flow)
  router.get(
    '/select-court-cases',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    populateValidationData,
    asyncMiddleware(SelectCourtCaseControllerV2.get),
  )
  router.post(
    '/select-court-cases',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    validate('selectCourtCase'),
    asyncMiddleware(SelectCourtCaseControllerV2.post),
  )

  // Update sentence types summary page
  router.get(
    '/update-sentence-types-summary',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    populateValidationData,
    asyncMiddleware(UpdateSentenceTypesSummaryControllerV2.get),
  )
  router.post(
    '/update-sentence-types-summary',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    validate('updateSentenceTypesSummary'),
    asyncMiddleware(UpdateSentenceTypesSummaryControllerV2.post),
  )

  // Select sentence type page (individual sentence update)
  router.get(
    '/select-sentence-type/:sentenceUuid',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    populateValidationData,
    asyncMiddleware(SelectSentenceTypeControllerV2.get),
  )
  router.post(
    '/select-sentence-type/:sentenceUuid',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    validate('selectSentenceType'),
    asyncMiddleware(SelectSentenceTypeControllerV2.post),
  )

  // Multiple sentence decision page
  router.get(
    '/multiple-sentence-decision/:courtCaseId',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    populateValidationData,
    asyncMiddleware(MultipleSentenceDecisionControllerV2.get),
  )
  router.post(
    '/multiple-sentence-decision/:courtCaseId',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    validate('multipleSentenceDecision'),
    asyncMiddleware(MultipleSentenceDecisionControllerV2.post),
  )

  // Bulk sentence type page
  router.get(
    '/bulk-sentence-type/:courtCaseId',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    populateValidationData,
    asyncMiddleware(BulkSentenceTypeControllerV2.get),
  )
  router.post(
    '/bulk-sentence-type/:courtCaseId',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    validate('bulkSentenceType'),
    asyncMiddleware(BulkSentenceTypeControllerV2.post),
  )

  // Check sentences page (no validation needed as it's just a confirmation page)
  router.get(
    '/check-sentences',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    loadCourtCases(
      services?.courtCaseService,
      services?.manageOffencesService,
      services?.courtService,
      services?.calculationService,
      services?.nomisMappingService,
    ),
    populateValidationData,
    asyncMiddleware(CheckSentencesControllerV2.get),
  )
  router.post(
    '/check-sentences',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    loadCourtCases(
      services?.courtCaseService,
      services?.manageOffencesService,
      services?.courtService,
      services?.calculationService,
      services?.nomisMappingService,
    ),
    asyncMiddleware(CheckSentencesControllerV2.post),
  )

  // Recall type selection page
  router.get(
    '/recall-type',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    populateValidationData,
    asyncMiddleware(RecallTypeControllerV2.get),
  )
  router.post(
    '/recall-type',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    validate('recallType'),
    asyncMiddleware(RecallTypeControllerV2.post),
  )

  // Check your answers page
  router.get(
    '/check-your-answers',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    populateValidationData,
    asyncMiddleware(CheckYourAnswersControllerV2.get),
  )
  router.post(
    '/check-your-answers',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    validate('checkYourAnswers'),
    asyncMiddleware(CheckYourAnswersControllerV2.post),
  )

  // Recall recorded success page (GET only, no POST)
  router.get(
    '/recall-recorded',
    loadPrisoner(null, { checkSession: true, updateSession: false }),
    asyncMiddleware(RecallRecordedControllerV2.get),
  )

  // Edit routes for main flow (allow editing before recall is saved)
  // These routes allow going back from check-your-answers to edit individual steps
  router.get(
    '/revocation-date/edit',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    populateValidationData,
    asyncMiddleware(RevocationDateControllerV2.get),
  )
  router.post(
    '/revocation-date/edit',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    validate('revocationDate'),
    asyncMiddleware(RevocationDateControllerV2.post),
  )

  router.get(
    '/rtc-date/edit',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    populateValidationData,
    asyncMiddleware(ReturnToCustodyDateControllerV2.get),
  )
  router.post(
    '/rtc-date/edit',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    validate('returnToCustody'),
    asyncMiddleware(ReturnToCustodyDateControllerV2.post),
  )

  router.get(
    '/check-sentences/edit',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    loadCourtCases(
      services?.courtCaseService,
      services?.manageOffencesService,
      services?.courtService,
      services?.calculationService,
      services?.nomisMappingService,
    ),
    populateValidationData,
    asyncMiddleware(CheckSentencesControllerV2.get),
  )
  router.post(
    '/check-sentences/edit',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    loadCourtCases(
      services?.courtCaseService,
      services?.manageOffencesService,
      services?.courtService,
      services?.calculationService,
      services?.nomisMappingService,
    ),
    asyncMiddleware(CheckSentencesControllerV2.post),
  )

  router.get(
    '/recall-type/edit',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    populateValidationData,
    asyncMiddleware(RecallTypeControllerV2.get),
  )
  router.post(
    '/recall-type/edit',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    validate('recallType'),
    asyncMiddleware(RecallTypeControllerV2.post),
  )

  // Placeholder routes for pages not yet migrated to V2
  router.get('/recall-type-interrupt', asyncMiddleware(underConstructionController))
  router.get('/no-cases-selected', asyncMiddleware(underConstructionController))

  // TODO: As more controllers are migrated to V2, replace underConstructionController with the actual V2 controller

  return router
}
