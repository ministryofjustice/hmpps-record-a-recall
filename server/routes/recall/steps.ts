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
    noPost: false,
    checkJourney: true,
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
    fields: ['courtCases'],
    template: 'base-question',
    next: 'check-sentences',
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
