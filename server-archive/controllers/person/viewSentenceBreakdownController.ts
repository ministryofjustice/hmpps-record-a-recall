import { Request, Response } from 'express'
import logger from '../../../logger'
import {
  CalculatedReleaseDates,
  LatestCalculation,
} from '../../@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'
import CalculationService from '../../services/calculationService'

export default async (req: Request, res: Response) => {
  // Prisoner data is pre-loaded by createDataMiddleware in the router
  const { nomisId } = req.params
  const { prisoner } = res.locals
  const { username } = res.locals.user
  const { url } = req
  const tempCalc = url === '/temporary'

  return getCalculation(nomisId, !tempCalc, username, req.services.calculationService)
    .then(async latestCalculation => {
      const { calculationRequestId } = latestCalculation

      const sentencesAndReleaseDates = calculationRequestId
        ? await req.services.calculationService.getSentencesAndReleaseDates(calculationRequestId, username)
        : undefined

      const calculationBreakdown = calculationRequestId
        ? await req.services.calculationService.getCalculationBreakdown(calculationRequestId, username, nomisId)
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
      logger.error(`${errorMessage}${error.data?.developerMessage}`)
      return res.render('pages/person/view-all-sentences', {
        nomisId,
        crdError: `${errorMessage}${error.data.userMessage}`,
      })
    })
}

export async function getCalculation(
  nomisId: string,
  storedInNomis: boolean,
  username: string,
  calcService: CalculationService,
): Promise<CalculatedReleaseDates | LatestCalculation> {
  return storedInNomis
    ? calcService.getLatestCalculation(nomisId, username)
    : (await calcService.getTemporaryCalculation(nomisId, username))?.calculatedReleaseDates
}
