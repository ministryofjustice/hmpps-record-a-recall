import { Request, Response } from 'express'

export async function getDeleteRecallConfirmation(req: Request, res: Response) {
  const { nomisId, recallId } = req.params
  const { from } = req.query
  const recall = await req.services.recallService.getRecall(recallId, req.user?.username)
  const prisoner = await req.services.prisonerService.getPrisonerDetails(nomisId, req.user?.username)

  let backLink = `/person/${nomisId}#recalls`
  if (from === 'overview') {
    backLink = `/person/${nomisId}`
  }

  res.render('pages/recall/delete-confirmation.njk', {
    nomisId,
    recall,
    prisoner,
    fromPage: from,
    backLink,
  })
}

export async function postDeleteRecallConfirmation(req: Request, res: Response) {
  const { nomisId, recallId } = req.params
  const { confirmDelete, fromPage } = req.body

  let redirectUrl = `/person/${nomisId}#recalls`
  if (fromPage === 'overview') {
    redirectUrl = `/person/${nomisId}`
  }

  if (!confirmDelete) {
    const recall = await req.services.recallService.getRecall(recallId, req.user?.username)
    const prisoner = await req.services.prisonerService.getPrisonerDetails(nomisId, req.user?.username)

    let backLink = `/person/${nomisId}#recalls`
    if (fromPage === 'overview') {
      backLink = `/person/${nomisId}`
    }

    return res.render('pages/recall/delete-confirmation.njk', {
      nomisId,
      recall,
      prisoner,
      errors: [
        { text: 'Select if you are sure you want to delete the recall', href: '#delete-yes', name: 'confirmDelete' },
      ],
      fromPage,
      backLink,
    })
  }

  if (confirmDelete === 'yes') {
    await req.services.recallService.deleteRecall(nomisId, recallId, req.user?.username)
    return res.redirect(redirectUrl)
  }

  return res.redirect(redirectUrl)
}
