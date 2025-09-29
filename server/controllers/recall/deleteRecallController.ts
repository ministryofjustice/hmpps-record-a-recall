import { Request, Response } from 'express'
// eslint-disable-next-line import/no-unresolved
import { Recall } from 'models'
import logger from '../../../logger'
import PrisonService from '../../services/PrisonService'

async function enrichRecallWithLocationName(recall: Recall, prisonService: PrisonService, username: string) {
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

/**
 * GET /person/:nomisId/recall/:recallId/delete
 * Renders the delete confirmation page for a recall
 */
export async function getDeleteRecallConfirmation(req: Request, res: Response) {
  const { nomisId, recallId } = req.params
  const { from } = req.query
  const { recallService, prisonerService, prisonService } = req.services
  const username = req.user?.username

  const recall = await recallService.getRecall(recallId, username)
  const enrichedRecall = await enrichRecallWithLocationName(recall, prisonService, username)

  const prisoner = await prisonerService.getPrisonerDetails(nomisId, username)

  // Determine the back link dynamically based on the 'from' query
  let backLink = `/person/${nomisId}#recalls`
  if (from === 'overview') {
    backLink = `/person/${nomisId}`
  }

  res.render('pages/recall/delete-confirmation.njk', {
    nomisId,
    recall: enrichedRecall,
    prisoner,
    fromPage: from,
    backLink,
  })
}

/**
 * POST /person/:nomisId/recall/:recallId/delete
 * Handles form submission to delete a recall
 */
export async function postDeleteRecallConfirmation(req: Request, res: Response) {
  const { nomisId, recallId } = req.params
  const { confirmDelete, fromPage } = req.body
  const { recallService, prisonerService, prisonService } = req.services
  const username = req.user?.username

  let redirectUrl = `/person/${nomisId}#recalls`
  if (fromPage === 'overview') {
    redirectUrl = `/person/${nomisId}`
  }

  if (!confirmDelete) {
    const recall = await recallService.getRecall(recallId, username)
    const enrichedRecall = await enrichRecallWithLocationName(recall, prisonService, username)
    const prisoner = await prisonerService.getPrisonerDetails(nomisId, username)

    let backLink = `/person/${nomisId}#recalls`
    if (fromPage === 'overview') {
      backLink = `/person/${nomisId}`
    }

    return res.render('pages/recall/delete-confirmation.njk', {
      nomisId,
      recall: enrichedRecall,
      prisoner,
      errors: [
        { text: 'Select if you are sure you want to delete the recall', href: '#delete-yes', name: 'confirmDelete' },
      ],
      fromPage,
      backLink,
    })
  }

  if (confirmDelete === 'yes') {
    await recallService.deleteRecall(nomisId, recallId, username)
    return res.redirect(redirectUrl)
  }

  return res.redirect(redirectUrl)
}
