import FormWizard from 'hmpo-form-wizard'
import { NextFunction, Response } from 'express'

import { compact } from 'lodash'
import RecallBaseController from './recallBaseController'
import { SummaryListRow } from '../../@types/govuk'
import { RecallType, RecallTypes } from '../../@types/recallTypes'
import { CreateRecall } from '../../@types/remandAndSentencingApi/remandAndSentencingTypes'
import formatLongDate from '../../formatters/formatDate'

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
      this.toSummaryListRow('Recall date', formatLongDate(recallDate), editLink('recall-date')),
      this.toSummaryListRow(
        'Return to custody date',
        formatLongDate(returnToCustodyDate) || 'None',
        editLink('rtc-date'),
      ),
      this.toSummaryListRow('Recall type', typeDescription, editLink('fixed-term-recall')),
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

  toSummaryListRow(
    labelText: string,
    formValue: string | string[] | undefined,
    actionHref: string,
    actionText = 'edit',
  ) {
    const value = formValue && (typeof formValue === 'string' ? { text: formValue } : { html: formValue?.join('<br>') })

    return {
      key: {
        text: labelText,
      },
      value,
      actions: {
        items: [
          {
            href: actionHref,
            text: actionText,
            classes: 'govuk-link--no-visited-state',
          },
        ],
      },
    }
  }
}
