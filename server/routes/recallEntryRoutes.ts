import { RequestHandler } from 'express'
import type { DateForm } from 'forms'
import PrisonerService from '../services/prisonerService'
import RecallService from '../services/recallService'
import { RecallTypes } from '../@types/refData'
import ValidationService from '../services/validationService'

export default class RecallEntryRoutes {
  constructor(
    private readonly prisonerService: PrisonerService,
    private readonly recallService: RecallService,
    private readonly validationService: ValidationService,
  ) {}

  public getPersonHomePage: RequestHandler = async (req, res): Promise<void> => {
    const { nomsId } = req.params
    const recalls = await this.recallService.getAllRecalls(nomsId, res.locals.user.username)
    return res.render('pages/person/home.njk', { nomsId, recalls })
  }

  public getEnterRecallDate: RequestHandler = async (req, res): Promise<void> => {
    const { nomsId } = req.params
    const { submitToCheckAnswers } = req.query
    const recall = this.recallService.getRecall(req.session, nomsId)
    return res.render('pages/recallEntry/enter-recall-date', {
      nomsId,
      submitToCheckAnswers,
      recall,
      errors: req.flash('errors') || [],
    })
  }

  public submitEnterRecallDate: RequestHandler = async (req, res): Promise<void> => {
    const { nomsId } = req.params
    const { submitToCheckAnswers } = req.query
    const recallDateForm = req.body.recallDate as DateForm
    this.recallService.setRecallDate(req.session, nomsId, recallDateForm)

    const errors = this.validationService.validateRecallDateForm(
      recallDateForm,
      this.recallService.getRecall(req.session, nomsId),
    )
    if (errors.length) {
      req.flash('errors', errors)
      return res.redirect(`/person/${nomsId}/recall-entry/enter-recall-date`)
    }

    if (submitToCheckAnswers) {
      return res.redirect(`/person/${nomsId}/recall-entry/check-your-answers`)
    }
    return res.redirect(`/person/${nomsId}/recall-entry/enter-return-to-custody-date`)
  }

  public getEnterReturnToCustodyDate: RequestHandler = async (req, res): Promise<void> => {
    const { nomsId } = req.params
    const { submitToCheckAnswers } = req.query
    const recall = this.recallService.getRecall(req.session, nomsId)
    return res.render('pages/recallEntry/enter-return-to-custody-date', {
      nomsId,
      submitToCheckAnswers,
      recall,
      errors: req.flash('errors') || [],
    })
  }

  public submitReturnToCustodyDate: RequestHandler = async (req, res): Promise<void> => {
    const { nomsId } = req.params
    const { submitToCheckAnswers } = req.query
    const returnToCustodyDateForm = req.body.returnToCustodyDate as DateForm
    this.recallService.setReturnToCustodyDate(req.session, nomsId, returnToCustodyDateForm)

    const errors = this.validationService.validateReturnToCustodyDateForm(
      returnToCustodyDateForm,
      this.recallService.getRecall(req.session, nomsId),
    )
    if (errors.length) {
      req.flash('errors', errors)
      return res.redirect(`/person/${nomsId}/recall-entry/enter-return-to-custody-date`)
    }

    if (submitToCheckAnswers) {
      return res.redirect(`/person/${nomsId}/recall-entry/check-your-answers`)
    }
    return res.redirect(`/person/${nomsId}/recall-entry/check-sentences`)
  }

  public getCheckSentences: RequestHandler = async (req, res): Promise<void> => {
    const { nomsId } = req.params
    const { recallDate } = this.recallService.getRecall(req.session, nomsId)
    const groupedSentences = await this.prisonerService.groupSentencesByRecallDate(
      nomsId,
      res.locals.user.username,
      recallDate,
    )
    return res.render('pages/recallEntry/check-sentences', {
      nomsId,
      groupedSentences,
      recallDate,
    })
  }

  // This is just a temporary screen that displays all sentence data - created to aid analysis
  public getViewAllSentences: RequestHandler = async (req, res): Promise<void> => {
    const { nomsId } = req.params
    const calculationBreakdown = await this.prisonerService.getCalculationBreakdown(nomsId, res.locals.user.username)
    if (!calculationBreakdown) {
      return res.render('pages/recallEntry/view-all-sentences', {
        nomsId,
        calculationBreakdown: undefined,
        sentencesAndReleaseDates: undefined,
      })
    }
    const sentencesAndReleaseDates = await this.prisonerService.getSentencesAndReleaseDates(
      nomsId,
      res.locals.user.username,
    )
    return res.render('pages/recallEntry/view-all-sentences', {
      nomsId,
      calculationBreakdown,
      sentencesAndReleaseDates,
    })
  }

  public getEnterRecallType: RequestHandler = async (req, res): Promise<void> => {
    const { nomsId } = req.params
    const recallTypes = Object.values(RecallTypes)
    const recall = this.recallService.getRecall(req.session, nomsId)

    return res.render('pages/recallEntry/enter-recall-type', { nomsId, recallTypes, recall })
  }

  public submitRecallType: RequestHandler = async (req, res): Promise<void> => {
    const { nomsId } = req.params
    const { recallType } = req.body
    this.recallService.setRecallType(req.session, nomsId, recallType)

    return res.redirect(`/person/${nomsId}/recall-entry/check-your-answers`)
  }

  public getCheckYourAnswers: RequestHandler = async (req, res): Promise<void> => {
    const { nomsId } = req.params
    const recall = this.recallService.getRecall(req.session, nomsId)

    return res.render('pages/recallEntry/check-your-answers', { nomsId, recall })
  }

  public submitCheckYourAnswers: RequestHandler = async (req, res): Promise<void> => {
    const { nomsId } = req.params
    const createRecallResponse = await this.recallService.createRecall(req.session, nomsId, res.locals.user.username)
    this.recallService.removeRecall(req.session, nomsId)

    return res.redirect(`/person/${nomsId}/recall-entry/success-confirmation?uuid=${createRecallResponse.recallUuid}`)
  }

  public getSuccessConfirmation: RequestHandler = async (req, res): Promise<void> => {
    const { nomsId } = req.params
    const { uuid } = req.query

    return res.render('pages/recallEntry/success-confirmation', { nomsId, uuid })
  }
}
