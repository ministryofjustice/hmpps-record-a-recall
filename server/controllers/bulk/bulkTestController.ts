import { RequestHandler } from 'express'
import { stringify } from 'csv-stringify'
import BulkCalculationService from '../../services/bulkCalculationService'
import PrisonerService from '../../services/prisonerService'
import { PrisonerSearchApiPrisoner } from '../../@types/prisonerSearchApi/prisonerSearchTypes'
import CalculationService from '../../services/calculationService'
import config from '../../config'

export default class BulkTestController {
  constructor(
    private readonly bulkCalculationService: BulkCalculationService,
    private readonly calculationService: CalculationService,
    private readonly prisonerService: PrisonerService,
  ) {}

  public bulkTest: RequestHandler = async (req, res): Promise<void> => {
    const person = req.query.person as string
    if (person) {
      const { username } = res.locals.user
      let personDetails
      try {
        personDetails = await this.prisonerService.getPrisonerDetails(person, username)
      } catch (e) {
        personDetails = e.userMessage
      }
      let validation
      try {
        validation = await this.calculationService.performCrdsValidation(person, username)
      } catch (e) {
        validation = e.data.userMessage
      }
      return this.calculationService
        .getTemporaryCalculation(person, username)
        .then(async latestCalc => {
          const { calculationRequestId } = latestCalc
          let sentencesAndReleaseDates
          try {
            sentencesAndReleaseDates = calculationRequestId
              ? await this.calculationService.getSentencesAndReleaseDates(calculationRequestId, username)
              : undefined
          } catch (e) {
            sentencesAndReleaseDates = e.userMessage
          }
          let calculationBreakdown
          try {
            calculationBreakdown = calculationRequestId
              ? await this.calculationService.getCalculationBreakdown(calculationRequestId, username)
              : undefined
          } catch (e) {
            calculationBreakdown = e.userMessage
          }

          return res.render('pages/bulk/index', {
            personDetails,
            validation,
            latestCalc,
            sentencesAndReleaseDates,
            calculationBreakdown,
          })
        })
        .catch(error => {
          return res.render('pages/bulk/index', {
            personDetails,
            validation,
            latestCalc: error.data.userMessage,
          })
        })
    }
    return res.render('pages/bulk/index')
  }

  public submitBulkCalc: RequestHandler = async (req, res) => {
    const { username } = res.locals.user
    const { prisonerIds, logToConsole, prisonId } = req.body

    if (prisonerIds.split(/\r?\n/).length === 1 && logToConsole) {
      return res.redirect(`/bulk?person=${prisonerIds}`)
    }

    const prisoners = await this.getPrisonersDetails(prisonerIds, prisonId, username)
    const env = config.environmentName

    return this.bulkCalculationService.runCalculations(prisoners, username).then(results => {
      const fileName = prisonId ? `bulk-${prisonId}-${env}.csv` : `bulk-${env}.csv`
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)
      return stringify(results, {
        header: true,
      }).pipe(res)
    })
  }

  private async getPrisonersDetails(
    prisonerIds: string,
    prisonId: string,
    username: string,
  ): Promise<PrisonerSearchApiPrisoner[]> {
    const details: PrisonerSearchApiPrisoner[] = []
    if (!prisonId) {
      return Promise.all(
        prisonerIds.split(/\r?\n/).map(async id => {
          const d = await this.prisonerService.getPrisonerDetails(id, username)
          details.push(d)
        }),
      ).then(() => {
        return details
      })
    }
    return this.prisonerService.getPrisonersInEstablishment(prisonId, username).then(p => {
      return p
    })
  }
}
