import FormWizard from 'hmpo-form-wizard'
import RecallDateController from '../../controllers/recall/recallDateController'
import ReturnToCustodyDateController from '../../controllers/recall/returnToCustodyDateController'
import CheckYourAnswersController from '../../controllers/recall/checkYourAnswersController'
import RecallTypeController from '../../controllers/recall/recallTypeController'
import CheckSentencesController from '../../controllers/recall/checkSentencesController'
import CheckPossibleController from '../../controllers/recall/checkPossibleController'
import RecallBaseController from '../../controllers/recall/recallBaseController'
import ConfirmCancelController from '../../controllers/recall/confirmCancelController'
import SelectCourtCaseController from '../../controllers/recall/selectCourtCaseController'
import { getEligibleSentenceCount, isManualCaseSelection, isStandardOnly } from '../../helpers/formWizardHelper'

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
        next: 'recall-date',
      },
      'not-possible',
    ],
  },
  '/recall-date': {
    fields: ['recallDate'],
    next: 'rtc-date',
    template: 'base-question',
    controller: RecallDateController,
    editable: false,
  },
  '/rtc-date': {
    fields: ['inPrisonAtRecall', 'returnToCustodyDate'],
    next: [
      {
        next: [
          {
            fn: (req: FormWizard.Request) => isManualCaseSelection(req) || getEligibleSentenceCount(req) === 0,
            next: 'select-cases',
          },
        ],
      },
      'check-sentences',
    ],
    template: 'base-question',
    controller: ReturnToCustodyDateController,
    editable: true,
  },
  '/check-sentences': {
    next: [
      {
        fn: (req: FormWizard.Request) => isStandardOnly(req),
        next: 'confirm-recall-type',
      },
      'recall-type',
    ],
    controller: CheckSentencesController,
    editable: true,
  },
  '/recall-type': {
    next: 'check-your-answers',
    fields: ['recallType'],
    controller: RecallTypeController,
    template: 'base-question',
    editable: true,
  },
  '/confirm-recall-type': {
    next: 'check-your-answers',
    controller: RecallBaseController,
  },
  '/check-your-answers': {
    controller: CheckYourAnswersController,
    next: 'recall-recorded',
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
