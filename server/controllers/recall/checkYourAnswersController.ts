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
  middlewareSetup() {
    super.middlewareSetup()
  }

  /* eslint-disable-next-line  @typescript-eslint/no-explicit-any */
  locals(req: FormWizard.Request, res: Response): any {
    const { nomisId } = res.locals
    const { recallDate, returnToCustodyDate, recallType } = res.locals.values
    const editLink = (step: string) => `/person/${nomisId}/recall/${step}`
    const typeDescription = this.getRecallType(recallType).description
    const summaryListRows: SummaryListRow[] = compact([
      toSummaryListRow('Recall date', formatLongDate(recallDate), editLink('recall-date')),
      toSummaryListRow('Return to custody date', formatLongDate(returnToCustodyDate) || 'None', editLink('rtc-date')),
      toSummaryListRow('Recall type', typeDescription, editLink('fixed-term-recall')),
    ])

    return {
      ...super.locals(req, res),
      summaryListRows,
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
