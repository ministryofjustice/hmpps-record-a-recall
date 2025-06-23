import { Request, Response, NextFunction } from 'express'
import DataFlowService from '../services/DataFlowService'
import { Services } from '../services'

/**
 * Middleware to set up the DataFlowService on the request object
 * This makes the service available to controllers and other middleware
 */
export default function setUpDataFlow() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Create DataFlowService instance with required services
    const { prisonerService, recallService, prisonService, courtCasesReleaseDatesService } = req.services as Services

    const dataFlowService = new DataFlowService(
      prisonerService,
      recallService,
      prisonService,
      courtCasesReleaseDatesService,
    )

    // Attach to request for use in controllers
    req.dataFlowService = dataFlowService

    next()
  }
}

// Extend the Request interface to include dataFlowService
declare module 'express-serve-static-core' {
  interface Request {
    dataFlowService: DataFlowService
  }
}
