import { Request, Response } from 'express'
import { Controller } from '../../../controller'
import RecallJourneyUrls from '../../recallJourneyUrls'
import { Page } from '../../../../services/auditService'
import { PersonJourneyParams, DateParts } from '../../../../@types/journeys'
import { datePartsToDate, dateToIsoString } from '../../../../utils/utils'

export default class NoCasesSelectedController implements Controller {
  PAGE_NAME = Page.NO_CASES_SELECTED

  GET = async (req: Request<PersonJourneyParams>, res: Response): Promise<void> => {
    const { nomsId, journeyId, createOrEdit: createOrEditParam, recallId } = req.params
    const journey = req.session.recallJourneys[journeyId]

    const createOrEdit = createOrEditParam as 'edit' | 'create'

    return res.render('pages/recall/no-cases-selected', {
      prisoner: res.locals.prisoner,
      pageHeading: 'Manual recall',
      revocationDate: journey.revocationDate
        ? dateToIsoString(datePartsToDate(journey.revocationDate as DateParts))
        : null,
      backLink: RecallJourneyUrls.manualJourneyStart(nomsId, journeyId, createOrEdit, recallId),
      cancelLink: RecallJourneyUrls.confirmCancel(
        nomsId,
        journeyId,
        createOrEdit,
        recallId,
        RecallJourneyUrls.manualSelectCases.name
      ),

      errorlist: [],
      validationErrors: [],
    })
  }
}
