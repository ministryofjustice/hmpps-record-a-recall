import { Router, Request, Response, NextFunction } from 'express'
import UpdateSentenceTypesSummaryController from '../../controllers/recall/updateSentenceTypesSummaryController'
import { ExtendedRequest } from '../../controllers/base/ExpressBaseController'
import loadCourtCaseOptions from '../../middleware/loadCourtCaseOptions'

const router = Router()

// Create an instance of the controller
const controller = new UpdateSentenceTypesSummaryController({ route: '/update-sentence-types-summary' })

// GET handler - delegates to controller
router.get(
  '/update-sentence-types-summary',
  loadCourtCaseOptions, // Apply middleware that controller expects
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Cast req to ExtendedRequest as expected by the controller
      const extendedReq = req as ExtendedRequest

      // Call the controller's get method
      await controller.get(extendedReq, res, next)
    } catch (error) {
      next(error)
    }
  },
)

// POST handler - delegates to controller
router.post(
  '/update-sentence-types-summary',
  loadCourtCaseOptions, // Apply middleware that controller expects
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Cast req to ExtendedRequest as expected by the controller
      const extendedReq = req as ExtendedRequest

      // Call the controller's post method which will handle validation and saveValues
      await controller.post(extendedReq, res, next)
    } catch (error) {
      next(error)
    }
  },
)

export default router
