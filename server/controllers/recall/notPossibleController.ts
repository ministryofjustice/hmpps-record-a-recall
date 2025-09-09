import { Response } from 'express'
import RecallBaseController from './recallBaseController'
import { entrypointUrl } from '../../utils/utils'
import { getEntrypoint } from '../../helpers/recallSessionHelper'
import { ExtendedRequest } from '../base/ExpressBaseController'

export default class NotPossibleController extends RecallBaseController {
  locals(req: ExtendedRequest, res: Response): Record<string, unknown> {
    const locals = super.locals(req, res)
    const { nomisId, recallId } = res.locals
    const entrypoint = getEntrypoint(req as ExtendedRequest & { sessionModel?: unknown })
    const backLink = entrypointUrl(entrypoint, nomisId)
    // We can't use the journey fields as we check recalls are possible before loading the recall being edited.
    const isEditRecall = !!recallId
    let reloadLink = ''
    if (isEditRecall) {
      reloadLink = `/person/${nomisId}/edit-recall/${recallId}${entrypoint ? `?entrypoint=${entrypoint}` : ''}`
    } else {
      reloadLink = `/person/${nomisId}/record-recall${entrypoint ? `?entrypoint=${entrypoint}` : ''}`
    }

    return {
      ...locals,
      backLink,
      reloadLink,
      isEditRecall,
    }
  }
}
