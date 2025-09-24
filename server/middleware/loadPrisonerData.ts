import { Request, Response, NextFunction } from 'express'
import logger from '../../logger'

/**
 * Middleware to ensure prisoner data is available for V2 controllers
 * Loads prisoner data from services if not already in res.locals
 */
// eslint-disable-next-line consistent-return
export default async function loadPrisonerData(req: Request, res: Response, next: NextFunction): Promise<void> {
  const { nomisId, username } = res.locals

  // Check if prisoner data is already loaded
  if (res.locals.prisoner) {
    return next()
  }

  // Try to get from session first (for compatibility with FormWizard flow)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sessionData = req.session as any

  // Check various FormWizard session structures
  const wizardKeys = ['hmpo-wizard-record-recall', 'hmpo-wizard-RecallJourney', 'hmpo-wizard-record-recall-v2']
  for (const key of wizardKeys) {
    if (sessionData?.[key]?.prisoner) {
      res.locals.prisoner = sessionData[key].prisoner
      return next()
    }
  }

  // Also check direct session storage (V2 uses sessionModelAdapter)
  if (sessionData?.prisoner) {
    res.locals.prisoner = sessionData.prisoner
    return next()
  }

  // Load fresh prisoner data if not in session
  if (nomisId && username) {
    try {
      const prisoner = await req.services.prisonerService.getPrisonerDetails(nomisId, username)
      res.locals.prisoner = prisoner

      // Store in session for consistency
      // V2 flow uses direct session storage via sessionModelAdapter
      sessionData.prisoner = prisoner

      // Also store in wizard namespaces if they exist
      if (sessionData['hmpo-wizard-record-recall']) {
        sessionData['hmpo-wizard-record-recall'].prisoner = prisoner
      }
      if (sessionData['hmpo-wizard-RecallJourney']) {
        sessionData['hmpo-wizard-RecallJourney'].prisoner = prisoner
      }

      logger.debug(`Prisoner details loaded for ${nomisId}`)
    } catch (error) {
      logger.error(`Failed to load prisoner details for ${nomisId}:`, error)
      // Continue without prisoner data - controller can handle it
    }
  }

  next()
}
