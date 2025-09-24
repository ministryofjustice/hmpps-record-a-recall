import express, { Router } from 'express'
import asyncMiddleware from '../../../middleware/asyncMiddleware'
import CheckPossibleControllerV2 from './checkPossibleControllerV2'
import underConstructionController from './underConstructionController'
import { sessionModelAdapter } from '../../../middleware/sessionModelAdapter'

export default function routes(): Router {
  const router = express.Router()

  // Apply session model adapter for compatibility with SessionManager
  // TODO: Remove once SessionManager is refactored to use Express sessions directly
  router.use(sessionModelAdapter)

  // V2 recall flow route - /person/:nomisId/record-recall-v2
  // Entry point - check if recall is possible (matches original '/' route in steps.ts)
  router.get('/', asyncMiddleware(CheckPossibleControllerV2.get))

  // Placeholder routes for pages not yet migrated to V2
  router.get('/not-possible', asyncMiddleware(underConstructionController))
  router.get('/revocation-date', asyncMiddleware(underConstructionController))
  router.get('/rtc-date', asyncMiddleware(underConstructionController))

  // TODO: As controllers are migrated to V2, replace underConstructionController with the actual V2 controller

  return router
}
