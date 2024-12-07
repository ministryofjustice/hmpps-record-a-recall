import FormWizard from 'hmpo-form-wizard'
import { NextFunction, Response } from 'express'

import { compact } from 'lodash'
import RecallBaseController from './recallBaseController'
import { SummaryListRow } from '../../@types/govuk'
import { RecallType, RecallTypes } from '../../@types/recallTypes'
import { CreateRecall } from '../../@types/remandAndSentencingApi/remandAndSentencingTypes'
import { formatLongDate } from '../../formatters/formatDate'
import toSummaryListRow from '../../helpers/componentHelper'

export default class CheckYourAnswersController extends RecallBaseController {
  locals(req: FormWizard.Request, res: Response): Record<string, unknown> {
    const { nomisId } = res.locals
    const ual = req.sessionModel.get<string>('ual')
    const casesWithEligibleSentences = req.sessionModel.get<number>('casesWithEligibleSentences')
    const eligibleSentenceCount = req.sessionModel.get<number>('eligibleSentenceCount')
    const { recallDate, returnToCustodyDate, recallType } = res.locals.values
    const editLink = (step: string) => `/person/${nomisId}/recall/${step}`
    const typeDescription = this.getRecallType(recallType).description
    const datesSummaryList: SummaryListRow[] = compact([
      toSummaryListRow('Date of revocation', formatLongDate(recallDate), editLink('recall-date')),
      toSummaryListRow('Arrest date', formatLongDate(returnToCustodyDate) || 'None', editLink('rtc-date')),
      toSummaryListRow('UAL (Unlawfully at large)', ual),
    ])
    const sentences = eligibleSentenceCount === 1 ? 'sentence' : 'sentences'
    const cases = casesWithEligibleSentences === 1 ? 'case' : 'cases'
    const sentenceRow: SummaryListRow = toSummaryListRow(
      'Sentences',
      `${eligibleSentenceCount} ${sentences} (from ${casesWithEligibleSentences} court ${cases})`,
      editLink('check-sentences'),
      'Review',
    )
    const sentencesRecallSummaryList: SummaryListRow[] = compact([
      sentenceRow,
      toSummaryListRow('Recall type', typeDescription, editLink('recall-type')),
    ])

    return {
      ...super.locals(req, res),
      datesSummaryList,
      sentencesRecallSummaryList,
    }
  }

  async saveValues(req: FormWizard.Request, res: Response, next: NextFunction) {
    const { sessionModel } = req
    try {
      const recallType = sessionModel.get<string>('recallType')
      const recallDate = sessionModel.get<string>('recallDate')
      const returnToCustodyDate = sessionModel.get<string>('returnToCustodyDate')
      const { nomisId } = res.locals
      const { username } = res.locals.user

      const recallToSave: CreateRecall = {
        prisonerId: nomisId,
        recallDate,
        returnToCustodyDate: returnToCustodyDate || recallDate,
        // @ts-expect-error recallType will be correct
        recallType,
        createdByUsername: username,
      }

      await req.services.recallService.postRecall(recallToSave, username)

      return next()
    } catch (error) {
      return next(error)
    }
  }

  successHandler(req: FormWizard.Request, res: Response, next: NextFunction) {
    const { nomisId } = res.locals

    req.journeyModel.reset()
    req.sessionModel.reset()

    req.flash('success', {
      title: 'Recall recorded',
      content: `You have successfully recorded a recall for ${nomisId}`,
    })

    res.redirect(`/person/${nomisId}`)
  }

  getRecallType(code: string): RecallType {
    return Object.values(RecallTypes).find(it => it.code === code)
  }
}
