import { Request, Response } from 'express'
import logger from '../../../logger'
import {
  CalculatedReleaseDates,
  LatestCalculation,
} from '../../@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'
import { Services } from '../../services'
import { setPrisonerDetailsInLocals } from './viewPersonHome'

export default async (req: Request, res: Response) => {
  await setPrisonerDetailsInLocals(req.services.prisonerService, res)
  const { nomisId, prisoner } = req.params
  const { username } = res.locals.user
  const { url } = req
  const tempCalc = url === '/temporary'

  return getCalculation(req.session, nomisId, !tempCalc, username, req.services)
    .then(async latestCalculation => {
      const { calculationRequestId } = latestCalculation

      const sentencesAndReleaseDates = calculationRequestId
        ? await req.services.prisonerService.getSentencesAndReleaseDates(calculationRequestId, username)
        : undefined

      const calculationBreakdown = calculationRequestId
        ? await req.services.recallService.getCalculationBreakdown(calculationRequestId, username)
        : undefined
      return res.render('pages/person/view-all-sentences', {
        prisoner,
        nomisId,
        latestCalculation,
        calculationBreakdown,
        sentencesAndReleaseDates,
      })
    })
    .catch(error => {
      const errorMessage = `An error occurred when requesting a temporary calculation from CRDS: `
      logger.error(errorMessage + error.data.developerMessage)
      return res.render('pages/person/view-all-sentences', {
        nomisId,
        crdError: `${errorMessage}${error.data.userMessage}`,
      })
    })
}

export function getCalculation(
  session: CookieSessionInterfaces.CookieSessionObject,
  nomisId: string,
  storedInNomis: boolean,
  username: string,
  services: Services,
): Promise<CalculatedReleaseDates> | Promise<LatestCalculation> {
  return storedInNomis
    ? services.prisonerService.getLatestCalculation(nomisId, username)
    : services.recallService.retrieveOrCalculateTemporaryDates(session, nomisId, false, username)
}
