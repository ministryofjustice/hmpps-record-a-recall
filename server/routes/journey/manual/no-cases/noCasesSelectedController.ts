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

    // Use empty string if recallId is undefined to match the route
    const safeRecallId = recallId ?? ''

    // Convert DateParts to ISO string
    const formattedRevocationDate = journey.revocationDate
      ? datePartsToDate(journey.revocationDate).toISOString()
      : null

    // base manual journey path
    const manualBase = RecallJourneyUrls.manualJourneyStart(nomsId, journeyId, createOrEdit, safeRecallId)

    return res.render('pages/recall/no-cases-selected', {
      prisoner: res.locals.prisoner,
      pageHeading: 'Manual recall',
      revocationDate: journey.revocationDate
        ? dateToIsoString(datePartsToDate(journey.revocationDate as DateParts))
        : null,
      backLink: manualBase,
      cancelLink: RecallJourneyUrls.confirmCancel(
        nomsId,
        journeyId,
        createOrEdit,
        safeRecallId,
        RecallJourneyUrls.manualSelectCases.name
      ),
      resetToRevocationDateUrl: RecallJourneyUrls.revocationDate(nomsId, journeyId, createOrEdit, safeRecallId),
      resetToManualInterceptUrl: manualBase,
      errorlist: [],
      validationErrors: [],
    })
  }
}
