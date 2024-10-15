import { RequestHandler } from 'express'
import type { DateForm } from 'forms'
import PrisonerService from '../services/prisonerService'
import RecallService from '../services/recallService'
import { RecallTypes } from '../@types/refData'
import ValidationService from '../services/validationService'
import { parseBooleanString } from '../utils/utils'

export default class RecallEntryRoutes {
  constructor(
    private readonly prisonerService: PrisonerService,
    private readonly recallService: RecallService,
    private readonly validationService: ValidationService,
  ) {}

  public getPersonHomePage: RequestHandler = async (req, res): Promise<void> => {
    const { nomsId } = req.params
    this.recallService.removeAllRecallsFromSession(req.session)
    const recalls = await this.recallService.getAllRecalls(nomsId, res.locals.user.username)
    return res.render('pages/person/home.njk', { nomsId, recalls })
  }

  public getEnterRecallDate: RequestHandler = async (req, res): Promise<void> => {
    const { nomsId } = req.params
    await this.recallService.calculateReleaseDatesAndSetInSession(req.session, res.locals.user.username, nomsId)
    // TODO Some validation will be added later as a separate ticket on the CRD calc to ensure it matches the latest confirmed calc
    // This is the reason the calc is being performed on first route
    const recall = this.recallService.getRecall(req.session, nomsId)
    return res.render('pages/recallEntry/enter-recall-date', {
      nomsId,
      recall,
      errors: req.flash('errors') || [],
    })
  }

  public submitEnterRecallDate: RequestHandler = async (req, res): Promise<void> => {
    const { nomsId } = req.params
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

    return res.redirect(`/person/${nomsId}/recall-entry/enter-return-to-custody-date`)
  }

  public getEnterReturnToCustodyDate: RequestHandler = async (req, res): Promise<void> => {
    const { nomsId } = req.params
    const recall = this.recallService.getRecall(req.session, nomsId)
    return res.render('pages/recallEntry/enter-return-to-custody-date', {
      nomsId,
      recall,
      errors: req.flash('errors') || [],
    })
  }

  public submitReturnToCustodyDate: RequestHandler = async (req, res): Promise<void> => {
    const { nomsId } = req.params
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

    return res.redirect(`/person/${nomsId}/recall-entry/check-sentences`)
  }

  public getCheckSentences: RequestHandler = async (req, res): Promise<void> => {
    const { nomsId } = req.params
    const recall = this.recallService.getRecall(req.session, nomsId)
    const latestCalculation = await this.prisonerService.getLatestCalculation(nomsId, res.locals.user.username)
    const groupedSentences = await this.recallService.groupSentencesByRecallDate(res.locals.user.username, recall)
    const errors = this.validationService.validateSentences(groupedSentences.onLicenceSentences, recall)
    const nextHref = await this.recallService.getNextHrefForSentencePage(
      nomsId,
      recall,
      groupedSentences.onLicenceSentences,
      errors.length > 0,
      res.locals.user.username,
    )
    return res.render('pages/recallEntry/check-sentences', {
      nomsId,
      latestCalculation,
      groupedSentences,
      recallDate: recall.recallDate,
      nextHref,
      errors,
    })
  }

  // This is just a temporary screen that displays all sentence data - created to aid analysis
  public getViewAllSentences: RequestHandler = async (req, res): Promise<void> => {
    const { nomsId } = req.params
    const { username } = res.locals.user
    const latestCalculation = !req.query.recalculate
      ? await this.prisonerService.getLatestCalculation(nomsId, username)
      : await this.recallService.calculateReleaseDatesAndSetInSession(req.session, username, nomsId)

    const sentencesAndReleaseDates = latestCalculation.calculationRequestId
      ? await this.prisonerService.getSentencesAndReleaseDates(
          latestCalculation.calculationRequestId,
          res.locals.user.username,
        )
      : undefined

    const calculationBreakdown = latestCalculation.calculationRequestId
      ? await this.recallService.getCalculationBreakdown(
          res.locals.user.username,
          latestCalculation.calculationRequestId,
        )
      : undefined
    return res.render('pages/recallEntry/view-all-sentences', {
      nomsId,
      latestCalculation,
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

  public getFixedTermRecallQuestion: RequestHandler = async (req, res): Promise<void> => {
    const { nomsId } = req.params

    return res.render('pages/recallEntry/ask-ftr-question', { nomsId, errors: req.flash('errors') || [] })
  }

  public submitFixedTermRecallQuestion: RequestHandler = async (req, res): Promise<void> => {
    const { nomsId } = req.params
    const isFixedTermRecall = parseBooleanString(req.body.isFixedTermRecall)
    const errors = this.validationService.validateFtrQuestion(isFixedTermRecall)

    if (errors.length) {
      req.flash('errors', errors)
      return res.redirect(`/person/${nomsId}/recall-entry/ask-ftr-question`)
    }
    this.recallService.setIsFixedTermRecall(req.session, nomsId, isFixedTermRecall)
    const recall = this.recallService.getRecall(req.session, nomsId)

    const nextUrl = await this.recallService.getNextUrlForFTRQuestionPage(nomsId, recall, res.locals.user.username)
    return res.redirect(nextUrl)
  }
}
