import FormWizard from 'hmpo-form-wizard'
import { Response } from 'express'

import RecallBaseController from './recallBaseController'
import { entrypointUrl } from '../../utils/utils'
import { getEntrypoint } from '../../helpers/formWizardHelper'

export default class NotPossibleController extends RecallBaseController {
  locals(req: FormWizard.Request, res: Response): Record<string, unknown> {
    const locals = super.locals(req, res)
    const { recallId, isEditRecall, nomisId } = res.locals
    const entrypoint = getEntrypoint(req)
    const backLink = entrypointUrl(entrypoint, nomisId)
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
    }
  }
}
