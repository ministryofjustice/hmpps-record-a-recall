import { Router, Request, Response } from 'express'
import { entrypointUrl } from '../../utils/utils'

const router = Router()

// Helper to get entrypoint from session (replacing HMPO's getEntrypoint)
function getEntrypointFromSession(req: Request): string {
  const entrypointFromData = req.session?.formData?.entrypoint as string | undefined
  const entrypointFromQuery = req.query.entrypoint as string | undefined
  return entrypointFromData || entrypointFromQuery || ''
}

router.get('/not-possible', (req: Request, res: Response) => {
  const { nomisId, recallId, prisoner } = res.locals
  const entrypoint = getEntrypointFromSession(req)
  const backLink = entrypointUrl(entrypoint, nomisId)

  // We can't use the journey fields as we check recalls are possible before loading the recall being edited.
  const isEditRecall = !!recallId
  let reloadLink = ''

  if (isEditRecall) {
    reloadLink = `/person/${nomisId}/edit-recall/${recallId}${entrypoint ? `?entrypoint=${entrypoint}` : ''}`
  } else {
    reloadLink = `/person/${nomisId}/record-recall${entrypoint ? `?entrypoint=${entrypoint}` : ''}`
  }

  // Get base locals that would normally come from the parent controller
  const journeyBaseLink = `/person/${nomisId}/${isEditRecall ? `edit-recall/${recallId}` : 'record-recall'}`
  const cancelLink = `${journeyBaseLink}/confirm-cancel`

  // Get CRDS validation errors from session
  const crdsValidationErrors = req.session.formData?.crdsValidationErrors || []

  res.render('pages/recall/not-possible', {
    nomisId,
    recallId,
    backLink,
    reloadLink,
    isEditRecall,
    cancelLink,
    hideCancel: false,
    prisoner,
    crdsValidationErrors,
    // Add any other locals that the template needs
  })
})

export default router
