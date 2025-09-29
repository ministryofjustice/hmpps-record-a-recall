import { Request, Response } from 'express'

/**
 * Helper to get the location name for a recall from PrisonService
 */
async function enrichRecallWithLocationName(recall: any, prisonService: any, username: string) {
  if (!recall) return recall

  let locationName: string | null = null

  console.log('&&&&&&&&&&&&&&&&&&&&&', recall.location) // e.g., "KMI"

  if (recall.location) {
    try {
      // Get prison names for the recall's location code
      const prisonNames = await prisonService.getPrisonNames([recall.location], username)
      locationName = prisonNames.get(recall.location) || null
      console.log('*************', locationName) // should now show the prison name
    } catch (err) {
      // fallback silently if prisonService fails
      locationName = null
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

  // Fetch the recall and enrich it with locationName
  const recall = await recallService.getRecall(recallId, username)
  const enrichedRecall = await enrichRecallWithLocationName(recall, prisonService, username)

  // Fetch prisoner details
  const prisoner = await prisonerService.getPrisonerDetails(nomisId, username)

  // Determine the back link dynamically based on the 'from' query
  let backLink = `/person/${nomisId}#recalls`
  if (from === 'overview') {
    backLink = `/person/${nomisId}`
  }

  // Render the delete confirmation template
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

  // Determine redirect URL based on the originating page
  let redirectUrl = `/person/${nomisId}#recalls`
  if (fromPage === 'overview') {
    redirectUrl = `/person/${nomisId}`
  }

  // If the user didn't confirm deletion, re-render the page with errors
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

  // If confirmed, delete the recall and redirect
  if (confirmDelete === 'yes') {
    await recallService.deleteRecall(nomisId, recallId, username)
    return res.redirect(redirectUrl)
  }

  // Default redirect if confirmDelete has unexpected value
  return res.redirect(redirectUrl)
}
