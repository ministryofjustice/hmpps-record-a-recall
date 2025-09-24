import express, { Router } from 'express'
import asyncMiddleware from '../../../middleware/asyncMiddleware'
import underConstructionController from './underConstructionController'

export default function routes(): Router {
  const router = express.Router()

  // V2 recall flow route - /person/:nomisId/record-recall-v2
  router.get('/', asyncMiddleware(underConstructionController))

  return router
}
