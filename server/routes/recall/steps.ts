import FormWizard from 'hmpo-form-wizard'
import { Response } from 'express'
import RecallDateController from '../../controllers/recall/recallDateController'
import ReturnToCustodyDateController from '../../controllers/recall/returnToCustodyDateController'
import FixedTermRecallController from '../../controllers/recall/fixedTermRecallController'
import RecallBaseController from '../../controllers/recall/recallBaseController'
import CheckYourAnswersController from '../../controllers/recall/checkYourAnswersController'
import RecallTypeController from '../../controllers/recall/recallTypeController'

async function calculationSuccess(req: FormWizard.Request, res: Response) {
  return false
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
    next: 'fixed-term-recall',
    controller: RecallBaseController,
  },
  '/fixed-term-recall': {
    fields: ['isFixedTermRecall'],
    // next: [{ field: 'isFixedTermRecall', value: 'no', next: 'recall-type' }, 'check-your-answers'],
    next: 'recall-type',
    controller: FixedTermRecallController,
    template: 'base-question',
  },
  '/recall-type': {
    next: 'check-your-answers',
    fields: ['recallType'],
    controller: RecallTypeController,
    template: 'base-question',
  },
  '/check-your-answers': {
    controller: CheckYourAnswersController,
  },
  '/not-possible': {
    controller: RecallBaseController,
    noPost: true,
  },
}

export default steps
