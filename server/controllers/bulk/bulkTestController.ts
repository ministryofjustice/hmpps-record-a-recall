import { RequestHandler } from 'express'
import { stringify } from 'csv-stringify'
import BulkCalculationService from '../../services/bulkCalculationService'
import PrisonerService from '../../services/prisonerService'
import { PrisonerSearchApiPrisoner } from '../../@types/prisonerSearchApi/prisonerSearchTypes'

export default class BulkTestController {
  constructor(
    private readonly bulkCalculationService: BulkCalculationService,
    private readonly prisonerService: PrisonerService,
  ) {}

  public bulkTest: RequestHandler = async (req, res): Promise<void> => {
    return res.render('pages/bulk/index')
  }

  public submitBulkCalc: RequestHandler = async (req, res) => {
    const { username } = res.locals.user
    const { prisonerIds, logToConsole, prisonId } = req.body
    const prisoners = await this.getPrisonersDetails(prisonerIds, prisonId, username)
    // if (nomisIds.length > 500) return res.redirect(`/bulk/`)
    await this.bulkCalculationService.runCalculations(prisoners, username, logToConsole).then(results => {
      const fileName = prisonId ? `temporary-calculations-${prisonId}.csv` : `temporary-calculations${prisonId}.csv`
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
