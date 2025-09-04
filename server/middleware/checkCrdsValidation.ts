import { Request, Response, NextFunction } from 'express'
import logger from '../../logger'
import CalculationService from '../services/calculationService'

/**
 * Middleware to check CRDS validation errors
 */
export default function checkCrdsValidation(calculationService: CalculationService) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Check on base recall route or populate-stored-recall for edit
    const shouldCheck = (req.path === '/' || req.path === '/populate-stored-recall') && req.method === 'GET'
    if (!shouldCheck) {
      return next()
    }

    const { nomisId, user, recallId } = res.locals

    if (!nomisId || !user?.username) {
      logger.warn('Missing nomisId or username in res.locals for CRDS validation check')
      return next()
    }

    try {
      logger.info('Checking CRDS validation for recall', { nomisId, recallId, path: req.path })

      // Check if recall is possible by calling CRDS
      const result = await calculationService.getTemporaryCalculation(nomisId, user.username)

      logger.info('CRDS validation result', {
        nomisId,
        hasValidationMessages: !!result?.validationMessages,
        validationMessageCount: result?.validationMessages?.length || 0,
      })

      // If there are validation messages, store them and redirect to not-possible page
      if (result.validationMessages && result.validationMessages.length > 0) {
        // Store validation errors in session for not-possible page
        if (!req.session.formData) {
          req.session.formData = {}
        }
        req.session.formData.crdsValidationErrors = result.validationMessages.map(
          (msg: { message: string }) => msg.message,
        )

        // Store entrypoint if provided
        const entrypoint = req.query.entrypoint as string | undefined
        if (entrypoint) {
          req.session.formData.entrypoint = entrypoint
        }

        // Store recallId if we're in an edit flow
        if (recallId) {
          req.session.formData.recallId = recallId
        }

        logger.info('Recall not possible due to CRDS validation errors, redirecting to not-possible', {
          nomisId,
          errors: result.validationMessages,
          redirectUrl: `${req.baseUrl}/not-possible`,
        })

        // Save session and redirect to not-possible page
        return req.session.save((err: unknown) => {
          if (err) {
            logger.error('Error saving session:', err)
          }
          res.redirect(`${req.baseUrl}/not-possible`)
        })
      }

      // No validation errors, continue
      return next()
    } catch (error) {
      logger.error('Error checking CRDS validation:', error)
      // If there's an error, proceed anyway (fail open)
      return next()
    }
  }
}
