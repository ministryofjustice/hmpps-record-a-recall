import { Request, Response } from 'express'

export async function getDeleteRecallConfirmation(req: Request, res: Response) {
  const { nomisId, recallId } = req.params
  // Fetch recall details for summary display
  const recall = await req.services.recallService.getRecall(recallId, req.user?.username)
  res.render('pages/recall/delete-confirmation.njk', {
    nomisId,
    recall,
  })
}

export async function postDeleteRecallConfirmation(req: Request, res: Response) {
  const { nomisId, recallId } = req.params
  const { confirmDelete } = req.body
  if (confirmDelete === 'yes') {
    await req.services.recallService.deleteRecall(recallId, req.user?.username)
    req.flash('success', { title: 'Recall deleted', content: 'The recall has been deleted.' })
    return res.redirect(`/person/${nomisId}#recalls`)
  }
  // If not confirmed, redirect back to recalls tab
  return res.redirect(`/person/${nomisId}#recalls`)
}
