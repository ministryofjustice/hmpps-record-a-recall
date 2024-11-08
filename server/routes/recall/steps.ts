import FormWizard from 'hmpo-form-wizard'
import RecallDateController from '../../controllers/recall/recallDateController'
import ReturnToCustodyDateController from '../../controllers/recall/returnToCustodyDateController'
import FixedTermRecallController from '../../controllers/recall/fixedTermRecallController'
import RecallBaseController from '../../controllers/recall/recallBaseController'
import CheckYourAnswersController from '../../controllers/recall/checkYourAnswersController'
import RecallTypeController from '../../controllers/recall/recallTypeController'

function calculationSuccess(req: FormWizard.Request, res: Response) {
  return req.sessionModel.get('temporaryCalculation') !== null
}

const steps = {
  '/': {
    entryPoint: true,
    reset: true,
    resetJourney: true,
    skip: true,
    controller: RecallBaseController,
    next: [
      {
        fn: calculationSuccess,
        next: 'recall-date',
      },
      'not-possible',
    ],
  },
  '/recall-date': {
    fields: ['recallDate'],
    next: 'rtc-date',
    controller: RecallDateController,
  },
  '/rtc-date': {
    fields: ['returnToCustodyDate'],
    next: 'check-sentences',
    template: 'return-to-custody-date',
    controller: ReturnToCustodyDateController,
  },
  '/check-sentences': {
    next: 'fixed-term-recall',
    controller: RecallBaseController,
  },
  '/fixed-term-recall': {
    fields: ['isFixedTermRecall'],
    // next: [{ field: 'isFixedTermRecall', value: 'no', next: 'recall-type' }, 'check-your-answers'],
    next: 'recall-type',
    controller: FixedTermRecallController,
    template: 'ask-ftr-question',
  },
  '/recall-type': {
    next: 'check-your-answers',
    fields: ['recallType'],
    controller: RecallTypeController,
  },
  '/check-your-answers': {
    controller: CheckYourAnswersController,
  },
  '/not-possible': {
    controller: RecallBaseController,
  },
}

export default steps
