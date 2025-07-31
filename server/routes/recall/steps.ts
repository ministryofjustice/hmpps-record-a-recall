import FormWizard from 'hmpo-form-wizard'
import RevocationDateController from '../../controllers/recall/revocationDateController'
import ReturnToCustodyDateController from '../../controllers/recall/returnToCustodyDateController'
import CheckYourAnswersController from '../../controllers/recall/checkYourAnswersController'
import RecallTypeController from '../../controllers/recall/recallTypeController'
import CheckSentencesController from '../../controllers/recall/checkSentencesController'
import CheckPossibleController from '../../controllers/recall/checkPossibleController'
import RecallBaseController from '../../controllers/recall/recallBaseController'
import ConfirmCancelController from '../../controllers/recall/confirmCancelController'
import SelectCourtCaseController from '../../controllers/recall/selectCourtCaseController'
import ManualRecallInterceptController from '../../controllers/recall/ManualRecallInterceptController'
import UpdateSentenceTypesSummaryController from '../../controllers/recall/updateSentenceTypesSummaryController'
import SelectSentenceTypeController from '../../controllers/recall/selectSentenceTypeController'
import MultipleSentenceDecisionController from '../../controllers/recall/multipleSentenceDecisionController'
import BulkSentenceTypeController from '../../controllers/recall/bulkSentenceTypeController'
import {
  getEligibleSentenceCount,
  isManualCaseSelection,
  isRecallTypeMismatch,
  hasMultipleConflicting,
  hasMultipleUALTypeRecallConflicting,
} from '../../helpers/formWizardHelper'

const steps = {
  '/': {
    entryPoint: true,
    reset: true,
    resetJourney: true,
    skip: true,
    controller: CheckPossibleController,
    next: [
      {
        fn: 'recallPossible',
        next: 'revocation-date',
      },
      'not-possible',
    ],
  },
  '/revocation-date': {
    fields: ['revocationDate'],
    next: 'rtc-date',
    template: 'base-question',
    controller: RevocationDateController,
    editable: false,
  },
  '/rtc-date': {
    fields: ['inPrisonAtRecall', 'returnToCustodyDate'],
    next: [
      {
        fn: (req: FormWizard.Request) => hasMultipleUALTypeRecallConflicting(req) || hasMultipleConflicting(req),
        next: 'conflicting-adjustments-interrupt',
      },
      {
        fn: (req: FormWizard.Request) => isManualCaseSelection(req),
        next: 'manual-recall-intercept',
      },
      {
        fn: (req: FormWizard.Request) => getEligibleSentenceCount(req) === 0,
        next: 'no-sentences-interrupt',
      },
      'check-sentences',
    ],
    template: 'base-question',
    controller: ReturnToCustodyDateController,
    editable: false,
  },
  '/check-sentences': {
    next: 'recall-type',
    controller: CheckSentencesController,
    editable: true,
    checkJourney: false,
  },
  '/recall-type': {
    next: [
      {
        fn: (req: FormWizard.Request) => isRecallTypeMismatch(req),
        next: 'recall-type-interrupt',
      },
      'check-your-answers',
    ],
    fields: ['recallType'],
    controller: RecallTypeController,
    template: 'base-question',
    editable: true,
    checkJourney: false,
  },
  '/recall-type-interrupt': {
    next: 'check-your-answers',
    controller: RecallBaseController,
  },
  '/no-sentences-interrupt': {
    controller: RecallBaseController,
  },
  '/conflicting-adjustments-interrupt': {
    controller: RecallBaseController,
  },
  '/check-your-answers': {
    controller: CheckYourAnswersController,
    next: 'recall-recorded',
  },
  '/manual-recall-intercept': {
    controller: ManualRecallInterceptController,
    fields: ['manualRecallInterceptConfirmation'],
    noPost: false,
    checkJourney: true,
    next: 'select-cases',
  },
  '/recall-recorded': {
    controller: RecallBaseController,
    noPost: true,
    resetJourney: true,
    checkJourney: false,
  },
  '/manual-recall': {
    controller: RecallBaseController,
    noPost: true,
  },
  '/select-cases': {
    controller: SelectCourtCaseController,
    fields: ['activeSentenceChoice'],
    activeSentenceChoice: {
      validate: [
        {
          type: 'required',
          message: 'Select whether this case had an active sentence at the point of recall',
        },
      ],
    },
    template: 'select-court-case-details.njk',
    next: [
      {
        fn: (req: FormWizard.Request) => {
          // Check if there are unknown sentences that need updating
          const unknownSentenceIds = req.sessionModel.get('unknownSentencesToUpdate') as string[]
          return unknownSentenceIds && unknownSentenceIds.length > 0
        },
        next: 'update-sentence-types-summary',
      },
      'check-sentences',
    ],
  },
  '/update-sentence-types-summary': {
    controller: UpdateSentenceTypesSummaryController,
    template: 'update-sentence-types-summary.njk',
    next: 'check-sentences',
    checkJourney: false,
  },
  '/select-sentence-type/:sentenceUuid': {
    controller: SelectSentenceTypeController,
    template: 'select-sentence-type',
    fields: ['sentenceType'],
    next: 'update-sentence-types-summary',
    checkJourney: false,
  },
  // TODO: RCLL-453 - Multiple sentence type selection routes
  '/multiple-sentence-decision/:courtCaseId': {
    controller: MultipleSentenceDecisionController,
    template: 'multiple-sentence-decision',
    fields: ['sameSentenceType'],
    next: [
      {
        fn: (req: FormWizard.Request) => req.body.sameSentenceType === 'yes',
        next: 'bulk-sentence-type/:courtCaseId',
      },
      'select-sentence-type/:sentenceUuid', // TODO - Will need to handle sequential selection
    ],
    checkJourney: false,
  },
  '/bulk-sentence-type/:courtCaseId': {
    controller: BulkSentenceTypeController,
    template: 'bulk-sentence-type',
    fields: ['sentenceType'],
    next: 'update-sentence-types-summary',
    checkJourney: false,
  },
  '/not-possible': {
    controller: RecallBaseController,
    noPost: true,
  },
  '/confirm-cancel': {
    controller: ConfirmCancelController,
    template: 'base-question',
    checkJourney: false,
    fields: ['confirmCancel'],
  },
}

export default steps
