import FormWizard from 'hmpo-form-wizard'
import { NextFunction, Response } from 'express'

import {
  SentenceAndOffenceWithReleaseArrangements,
  ValidationMessage,
} from '../../@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'
import logger from '../../../logger'
import RecallBaseController from './recallBaseController'
import { hasABreakdown } from '../../utils/sentenceUtils'
import { sessionModelFields } from '../../helpers/formWizardHelper'

export default class CheckPossibleController extends RecallBaseController {
  async configure(req: FormWizard.Request, res: Response, next: NextFunction): Promise<void> {
    const { nomisId, username } = res.locals
    try {
      const errors: ValidationMessage[] = await req.services.calculationService.performCrdsValidation(nomisId, username)
      res.locals.validationResponse = errors
      if (errors && errors.length === 0) {
        await this.getTemporaryCalculation(req, res)
          .then(async newCalc => {
            res.locals.temporaryCalculation = newCalc
            res.locals.calcReqId = newCalc.calculationRequestId
            logger.debug(newCalc.dates)
            const [sentences, breakdown] = await Promise.all([
              this.getSentences(req, res),
              this.getCalculationBreakdown(req, res),
            ])
            res.locals.sentences = sentences
            res.locals.breakdown = breakdown
          })
          .catch(error => {
            logger.error(error.userMessage)
          })
      }
    } catch (error) {
      logger.error(error)
    }
    return super.configure(req, res, next)
  }

  locals(req: FormWizard.Request, res: Response): Record<string, unknown> {
    const locals = super.locals(req, res)
    req.sessionModel.set(sessionModelFields.ENTRYPOINT, res.locals.entrypoint)
    const errors: ValidationMessage[] = res.locals.validationResponse
    if (errors && errors.length > 0) {
      const crdsValidationErrors = errors.map(error => error.message)
      req.sessionModel.set(sessionModelFields.CRDS_ERRORS, crdsValidationErrors)
    }

    req.sessionModel.set(sessionModelFields.SENTENCES, res.locals.sentences)
    req.sessionModel.set(sessionModelFields.TEMP_CALC, res.locals.temporaryCalculation)
    req.sessionModel.set(sessionModelFields.BREAKDOWN, res.locals.breakdown)

    return { ...locals }
  }

  recallPossible(req: FormWizard.Request, res: Response) {
    return !req.sessionModel.get(sessionModelFields.CRDS_ERRORS)
  }

  manualEntryRequired(req: FormWizard.Request, res: Response) {
    // If any sentences don't have a breakdown, send them down manual entry
    const { sentences, breakdown } = res.locals

    if (!sentences || !breakdown) {
      return false
    }
    if (req.sessionModel.get<string[]>(sessionModelFields.HAPPY_PATH_FAIL_REASONS)) {
      // We've already checked, no need to go through again
      return true
    }

    const sentencesWithNoBreakdown: string[] = []

    sentences.forEach((sentence: SentenceAndOffenceWithReleaseArrangements) => {
      if (!hasABreakdown(sentence, breakdown)) {
        const error = `No calculation breakdown found for sentence with case sequence ${sentence.caseSequence} and line sequence ${sentence.lineSequence}`
        logger.warn(error)
        sentencesWithNoBreakdown.push(error)
        req.sessionModel.set(sessionModelFields.HAPPY_PATH_FAIL_REASONS, sentencesWithNoBreakdown)
      }
    })
    return sentencesWithNoBreakdown.length > 0
  }

  getTemporaryCalculation(req: FormWizard.Request, res: Response) {
    const { nomisId, username } = res.locals
    return req.services.calculationService.calculateTemporaryDates(nomisId, username)
  }

  getCalculationBreakdown(req: FormWizard.Request, res: Response) {
    const { calcReqId, username } = res.locals
    return req.services.calculationService.getCalculationBreakdown(calcReqId, username)
  }

  getSentences(req: FormWizard.Request, res: Response) {
    const { calcReqId, username } = res.locals
    return req.services.calculationService.getSentencesAndReleaseDates(calcReqId, username)
  }
}
