import FormWizard from 'hmpo-form-wizard'
import RecallDateController from '../../../controllers/recall/recallDateController'
import ReturnToCustodyDateController from '../../../controllers/recall/returnToCustodyDateController'
import RecallTypeController from '../../../controllers/recall/recallTypeController'
import CheckSentencesController from '../../../controllers/recall/checkSentencesController'
import CheckPossibleController from '../../../controllers/recall/checkPossibleController'
import RecallBaseController from '../../../controllers/recall/recallBaseController'
import ConfirmCancelController from '../../../controllers/recall/confirmCancelController'
import EditSummaryController from '../../../controllers/recall/edit/editSummaryController'
import PopulateStoredRecallController from '../../../controllers/recall/edit/populateStoredRecallController'
import {
  getEligibleSentenceCount,
  isManualCaseSelection,
  isRecallTypeMismatch,
} from '../../../helpers/formWizardHelper'
import SelectCourtCaseController from '../../../controllers/recall/selectCourtCaseController'

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
        next: 'populate-stored-recall',
      },
      'not-possible',
    ],
  },
  '/populate-stored-recall': {
    skip: true,
    controller: PopulateStoredRecallController,
    next: 'edit-summary',
  },
  '/edit-summary': {
    controller: EditSummaryController,
    editable: true,
    next: 'recall-updated',
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
        fn: (req: FormWizard.Request) => isManualCaseSelection(req) || getEligibleSentenceCount(req) === 0,
        next: 'select-cases',
      },
      'check-sentences',
    ],
    template: 'base-question',
    controller: ReturnToCustodyDateController,
    editable: true,
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
      'edit-summary',
    ],
    fields: ['recallType'],
    controller: RecallTypeController,
    template: 'base-question',
    editable: true,
  },
  '/recall-type-interrupt': {
    next: 'edit-summary',
    controller: RecallBaseController,
  },
  '/recall-updated': {
    controller: RecallBaseController,
    template: 'recall-recorded',
    noPost: true,
    resetJourney: true,
    checkJourney: false,
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
    checkJourney: false,
  },
  '/confirm-cancel': {
    controller: ConfirmCancelController,
    template: 'base-question',
    checkJourney: false,
    fields: ['confirmCancel'],
  },
}

export default steps
