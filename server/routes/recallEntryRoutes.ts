import { RequestHandler } from 'express'
import { PrisonerSearchApiPrisoner } from '../@types/prisonerSearchApi/prisonerSearchTypes'
import PrisonerService from '../services/prisonerService'

export default class RecallEntryRoutes {
  constructor(private readonly prisonerService: PrisonerService) {}

  public getEnterRecallDate: RequestHandler = async (req, res): Promise<void> => {
    const { nomsId } = req.params
    return res.render('pages/recallEntry/enter-recall-date', { nomsId })
  }

  public getEnterReturnToCustodyDate: RequestHandler = async (req, res): Promise<void> => {
    const { nomsId } = req.params
    return res.render('pages/recallEntry/enter-return-to-custody-date', { nomsId })
  }

  public getCheckSentences: RequestHandler = async (req, res): Promise<void> => {
    const { nomsId } = req.params
    const prisoner = res.locals.prisoner as PrisonerSearchApiPrisoner
    const sentences = await this.prisonerService.getActiveAnalyzedSentencesAndOffences(
      prisoner.bookingId as unknown as number,
      res.locals.user.username,
    )
    return res.render('pages/recallEntry/check-sentences', { nomsId, sentences })
  }

  public getEnterRecallType: RequestHandler = async (req, res): Promise<void> => {
    const { nomsId } = req.params

    return res.render('pages/recallEntry/enter-recall-type', { nomsId })
  }
}
