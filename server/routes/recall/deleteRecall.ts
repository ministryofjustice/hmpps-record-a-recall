import { Router } from 'express'
import {
  getDeleteRecallConfirmation,
  postDeleteRecallConfirmation,
} from '../../controllers/recall/deleteRecallController'
import populateRecallId from '../../middleware/populateRecallId'
import populateNomisId from '../../middleware/populateNomisId'

const router = Router({ mergeParams: true })

router.get('/', populateNomisId(), populateRecallId(), getDeleteRecallConfirmation)
router.post('/', populateNomisId(), populateRecallId(), postDeleteRecallConfirmation)

export default router
