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

const steps = {
  '/': {
    entryPoint: true,
    reset: true,
    resetJourney: true,
    skip: true,
    controller: PopulateStoredRecallController,
    next: 'check-edit-possible',
  },
  '/check-edit-possible': {
    skip: true,
    controller: CheckPossibleController,
    next: [
      {
        fn: 'recallPossible',
        next: [
          {
            fn: 'manualEntryRequired',
            next: 'manual-recall',
          },
          'check-sentences-before-edit',
        ],
      },
      'not-possible',
    ],
  },
  '/check-sentences-before-edit': {
    skip: 'true',
    controller: CheckSentencesController,
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
    next: 'check-sentences',
    template: 'base-question',
    controller: ReturnToCustodyDateController,
    editable: true,
  },
  '/check-sentences': {
    next: [
      {
        fn: (req: FormWizard.Request) =>
          req.sessionModel.get('eligibleSentenceCount') === 0 ||
          req.sessionModel.get('manualSentenceSelection') === true,
        next: 'manual-recall',
      },
      {
        fn: (req: FormWizard.Request) => req.sessionModel.get('standardOnlyRecall') === true,
        next: 'confirm-recall-type',
      },
      'recall-type',
    ],
    controller: CheckSentencesController,
    editable: true,
  },
  '/recall-type': {
    next: 'edit-summary',
    fields: ['recallType'],
    controller: RecallTypeController,
    template: 'base-question',
    editable: true,
  },
  '/confirm-recall-type': {
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
  '/manual-recall': {
    controller: RecallBaseController,
    noPost: true,
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
