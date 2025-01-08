import RecallDateController from '../../controllers/recall/recallDateController'
import ReturnToCustodyDateController from '../../controllers/recall/returnToCustodyDateController'
import CheckYourAnswersController from '../../controllers/recall/checkYourAnswersController'
import RecallTypeController from '../../controllers/recall/recallTypeController'
import CheckSentencesController from '../../controllers/recall/checkSentencesController'
import CheckPossibleController from '../../controllers/recall/checkPossibleController'
import RecallBaseController from '../../controllers/recall/recallBaseController'

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
        next: [
          {
            fn: 'manualEntryRequired',
            next: 'manual-recall',
          },
          'recall-date',
        ],
      },
      'not-possible',
    ],
  },
  '/recall-date': {
    fields: ['recallDate'],
    next: 'rtc-date',
    template: 'base-question',
    controller: RecallDateController,
  },
  '/rtc-date': {
    fields: ['inPrisonAtRecall', 'returnToCustodyDate'],
    next: 'check-sentences',
    template: 'base-question',
    controller: ReturnToCustodyDateController,
  },
  '/check-sentences': {
    next: 'recall-type',
    controller: CheckSentencesController,
  },
  '/recall-type': {
    next: 'check-your-answers',
    fields: ['recallType'],
    controller: RecallTypeController,
    template: 'base-question',
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
  '/not-possible': {
    controller: RecallBaseController,
    noPost: true,
  },
}

export default steps
