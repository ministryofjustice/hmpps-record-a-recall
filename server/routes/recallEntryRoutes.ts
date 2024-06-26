import { RequestHandler } from 'express'
import type { RecallDateForm } from 'forms'
import { PrisonerSearchApiPrisoner } from '../@types/prisonerSearchApi/prisonerSearchTypes'
import PrisonerService from '../services/prisonerService'
import trimForm from '../utils/trim'
import RecallService from '../services/recallService'

export default class RecallEntryRoutes {
  constructor(
    private readonly prisonerService: PrisonerService,
    private readonly recallService: RecallService,
  ) {}

  public getEnterRecallDate: RequestHandler = async (req, res): Promise<void> => {
    const { nomsId } = req.params
    const { submitToCheckAnswers } = req.query
    return res.render('pages/recallEntry/enter-recall-date', { nomsId, submitToCheckAnswers })
  }

  public submitEnterRecallDate: RequestHandler = async (req, res): Promise<void> => {
    const { nomsId } = req.params
    const { submitToCheckAnswers } = req.query
    const recallDateForm = trimForm<RecallDateForm>(req.body)
    this.recallService.setRecallDate(req.session, nomsId, recallDateForm)

    if (submitToCheckAnswers) {
      return res.redirect(`/person/${nomsId}/recall-entry/check-your-answers`)
    }
    return res.redirect(`/person/${nomsId}/recall-entry/enter-recall-date`)
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
