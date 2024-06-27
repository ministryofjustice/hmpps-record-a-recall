import { RequestHandler } from 'express'
import type { DateForm } from 'forms'
import { PrisonerSearchApiPrisoner } from '../@types/prisonerSearchApi/prisonerSearchTypes'
import PrisonerService from '../services/prisonerService'
import RecallService from '../services/recallService'

export default class RecallEntryRoutes {
  constructor(
    private readonly prisonerService: PrisonerService,
    private readonly recallService: RecallService,
  ) {}

  public getEnterRecallDate: RequestHandler = async (req, res): Promise<void> => {
    const { nomsId } = req.params
    const { submitToCheckAnswers } = req.query
    const recall = this.recallService.getRecall(req.session, nomsId)
    const recallDateForm = recall.recallDate && {
      day: recall.recallDate.getDate(),
      month: recall.recallDate.getMonth() + 1,
      year: recall.recallDate.getFullYear(),
    }
    return res.render('pages/recallEntry/enter-recall-date', { nomsId, submitToCheckAnswers, recall, recallDateForm })
  }

  public submitEnterRecallDate: RequestHandler = async (req, res): Promise<void> => {
    const { nomsId } = req.params
    const { submitToCheckAnswers } = req.query
    const recallDateForm = req.body.recallDate as DateForm
    this.recallService.setRecallDate(req.session, nomsId, recallDateForm)

    if (submitToCheckAnswers) {
      return res.redirect(`/person/${nomsId}/recall-entry/check-your-answers`)
    }
    return res.redirect(`/person/${nomsId}/recall-entry/enter-return-to-custody-date`)
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

  public getCheckYourAnswers: RequestHandler = async (req, res): Promise<void> => {
    const { nomsId } = req.params
    const recall = this.recallService.getRecall(req.session, nomsId)

    return res.render('pages/recallEntry/check-your-answers', { nomsId, recall })
  }
}
