import { Request, Response } from 'express'
// eslint-disable-next-line import/no-unresolved
import { Recall } from 'models'
import logger from '../../../logger'
import { Services } from '../../services'
import PrisonService from '../../services/PrisonService'
import { SessionManager } from '../../services/sessionManager'

async function addLocationNameToRecall(recall: Recall, prisonService: PrisonService, username: string) {
  if (!recall) return recall

  let locationName: string | null = null

  if (recall.location) {
    try {
      const prisonNames = await prisonService.getPrisonNames([recall.location], username)
      locationName = prisonNames.get(recall.location) || null
    } catch (err) {
      locationName = null
      logger.error(err)
    }
  }

  return {
    ...recall,
    locationName,
  }
}

export default class DeleteRecallController {
  constructor(private readonly services: Services) {}

  /**
   * GET /person/:nomisId/recall/:recallId/delete
   * Renders the delete confirmation page for a recall
   */
  async get(req: Request, res: Response): Promise<void> {
    const { nomisId, recallId } = req.params
    const { from } = req.query
    const { user } = res.locals
    const username = user?.username

    const recall = await this.services.recallService.getRecall(recallId, username)
    const enrichedRecall = await addLocationNameToRecall(recall, this.services.prisonService, username)

    const prisoner = await this.services.prisonerService.getPrisonerDetails(nomisId, username)

    // Determine the back link dynamically based on the 'from' query
    let backLink = `/person/${nomisId}#recalls`
    if (from === 'overview') {
      backLink = `/person/${nomisId}`
    }

    res.render('pages/recall/delete-confirmation', {
      nomisId,
      recall: enrichedRecall,
      prisoner,
      prisonerDetails: prisoner,
      fromPage: from,
      backLink,
    })
  }

  /**
   * POST /person/:nomisId/recall/:recallId/delete
   * Handles form submission to delete a recall
   */
  async post(req: Request, res: Response): Promise<void> {
    const { nomisId, recallId } = req.params
    const { confirmDelete, fromPage } = req.body
    const { user } = res.locals
    const username = user?.username

    let redirectUrl = `/person/${nomisId}#recalls`
    if (fromPage === 'overview') {
      redirectUrl = `/person/${nomisId}`
    }

    // Validation: ensure a selection was made
    if (!confirmDelete) {
      const recall = await this.services.recallService.getRecall(recallId, username)
      const enrichedRecall = await addLocationNameToRecall(recall, this.services.prisonService, username)
      const prisoner = await this.services.prisonerService.getPrisonerDetails(nomisId, username)

      let backLink = `/person/${nomisId}#recalls`
      if (fromPage === 'overview') {
        backLink = `/person/${nomisId}`
      }

      res.render('pages/recall/delete-confirmation', {
        nomisId,
        recall: enrichedRecall,
        prisoner,
        prisonerDetails: prisoner,
        errors: [
          { text: 'Select if you are sure you want to delete the recall', href: '#delete-yes', name: 'confirmDelete' },
        ],
        fromPage,
        backLink,
      })
      return
    }

    // Handle delete confirmation
    if (confirmDelete === 'yes') {
      try {
        await this.services.recallService.deleteRecall(nomisId, recallId, username)
        logger.info(`Recall ${recallId} deleted successfully for person ${nomisId}`)

        // Invalidate any cached data related to this prisoner
        SessionManager.invalidateCache(req, `cachedPrisonerData_${nomisId}`)
        SessionManager.invalidateCache(req, `cachedCourtCases_${nomisId}`)
        logger.info(`Cache invalidated after recall deletion for prisoner ${nomisId}`)
      } catch (error) {
        logger.error(`Error deleting recall ${recallId} for person ${nomisId}:`, error)
        throw error
      }
    }

    res.redirect(redirectUrl)
  }
}
