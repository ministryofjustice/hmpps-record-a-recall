import FormWizard from 'hmpo-form-wizard'
import { NextFunction, Response } from 'express'

import RecallBaseController from './recallBaseController'
import { RecallType, RecallTypes } from '../../@types/recallTypes'
import { CalculatedReleaseDates } from '../../@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'

export default class RecallTypeController extends RecallBaseController {
  middlewareSetup() {
    super.middlewareSetup()
  }

  configure(req: FormWizard.Request, res: Response, next: NextFunction) {
    const recallTypes = Object.values(RecallTypes)
    req.form.options.fields.recallType.items = Object.values(recallTypes).map(({ code, description }) => ({
      text: description,
      value: code,
    }))

    next()
  }

  locals(req: FormWizard.Request, res: Response): Record<string, unknown> {
    const calculation = req.sessionModel.get<CalculatedReleaseDates>('temporaryCalculation')

    const effectivePeriodSubTwelveMonths = this.isSentenceUnder12Months(calculation)

    const recallTypes: RecallType[] = Object.values(RecallTypes)

    req.form.options.fields.recallType.items = Object.values(recallTypes)
      .filter(type => {
        return !type.fixedTerm || effectivePeriodSubTwelveMonths === type.subTwelveMonthApplicable
      })
      .map(({ code, description }) => ({
        text: description,
        value: code,
      }))
    return super.locals(req, res)
  }

  // This is currently using the effectiveSentenceLength from the temporary calc which is known to have issues
  // and is not in the format we expect it to be. There will be a different endpoint developed which we should
  // make use of ASAP rather than parsing the Period notation
  private isSentenceUnder12Months(calculation: CalculatedReleaseDates): boolean {
    const effectivePeriod: string = calculation.effectiveSentenceLength as unknown as string
    const years = /(\d)(?=Y)/i.exec(effectivePeriod) || []
    const year: number = years.length > 0 ? +years[0] : 0
    const months = /(\d)(?=M)/i.exec(effectivePeriod) || []
    const month: number = months.length > 0 ? +months[0] : 0

    return month < 12 && year === 0
  }
}
