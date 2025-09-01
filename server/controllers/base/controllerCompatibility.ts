/**
 * Compatibility helper for controller migration
 * Provides type conversion between FormWizard.Request and ExtendedRequest
 *
 * NOTE: This file contains intentional 'any' types to handle the transition
 * between HMPO FormWizard and Express during migration. These will be removed
 * once the migration is complete.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { Response, NextFunction } from 'express'
import { ExtendedRequest } from './ExpressBaseController'
import { getSessionJSON } from '../../helpers/sessionHelper'

// Type guard to check if a request has sessionModel
// Using 'any' intentionally to check unknown request types during migration
export function hasSessionModel(_req: any): boolean {
  return false // Always return false since sessionModel is removed
}

// Helper to convert any request to ExtendedRequest
// Using 'any' intentionally to handle both FormWizard and Express requests
export function toExtendedRequest(req: any): ExtendedRequest {
  if (hasSessionModel(req)) {
    // Convert request with sessionModel to ExtendedRequest
    const extReq = req as any as ExtendedRequest

    // Map sessionModel methods to session.formData
    if (!extReq.session) {
      extReq.session = {} as any // Intentional: Dynamic session creation
    }
    if (!extReq.session.formData) {
      extReq.session.formData = {}
    }

    // Copy sessionModel data to session.formData
    if (req.sessionModel?.toJSON) {
      const sessionData = getSessionJSON(extReq)
      Object.assign(extReq.session.formData, sessionData)
    }

    return extReq
  }

  return req as ExtendedRequest
}

// Helper to add sessionModel compatibility to a request
// Returns 'any' intentionally to support both request types during migration
export function toFormWizardRequest(req: any): any {
  // No longer adds sessionModel since it's been removed
  return req
}

// Wrapper for locals method to handle both request types
// Using 'any' for req parameter to handle both FormWizard and Express requests
export function wrapLocals(
  originalLocals: (req: any, res: Response) => Record<string, unknown>,
): (req: any, res: Response) => Record<string, unknown> {
  return (req: any, res: Response) => {
    const fwReq = hasSessionModel(req) ? req : toFormWizardRequest(req)
    return originalLocals(fwReq, res)
  }
}

// Wrapper for checkJourneyProgress method
// Using 'any' in originalMethod to handle FormWizard request type
export function wrapCheckJourneyProgress(
  originalMethod: (req: any, res: Response, next: NextFunction) => void,
): (req: ExtendedRequest, res: Response, next: NextFunction) => void {
  return (req: ExtendedRequest, res: Response, next: NextFunction) => {
    const fwReq = toFormWizardRequest(req)
    originalMethod(fwReq, res, next)
  }
}

// Wrapper for validateFields method
// Using 'any' types intentionally for compatibility with both old and new patterns
export function wrapValidateFields(
  originalMethod: (req: any, res: Response, callback: (errors: any) => void) => void,
): (req: any, res: any, callback?: (errors: any) => void) => any {
  return (req: any, res: any, callback?: (errors: any) => void) => {
    if (callback) {
      const fwReq = toFormWizardRequest(req)
      originalMethod(fwReq, res, callback)
      return undefined // Explicit return for consistent-return rule
    }
    // Return empty object if no callback provided (for new style)
    return {}
  }
}
