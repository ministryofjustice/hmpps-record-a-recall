/* eslint-disable @typescript-eslint/no-explicit-any */

import { jest } from '@jest/globals'
import ResetAndRedirectToRevDateController from './resetAndRedirectToRevDateController'
import { sessionModelFields } from '../../helpers/formWizardHelper'

jest.mock('../../helpers/formWizardHelper', () => ({
  __esModule: true,
  sessionModelFields: {
    CURRENT_CASE_INDEX: 'currentCaseIndex',
    MANUAL_RECALL_DECISIONS: 'manualRecallDecisions',
    MANUAL_CASE_SELECTION: 'manualCaseSelection',
  },
}))

describe('ResetAndRedirectToRevDateController - get', () => {
  let req: any
  let res: any
  let next: jest.Mock
  let controller: ResetAndRedirectToRevDateController

  beforeEach(() => {
    req = {
      sessionModel: {
        set: jest.fn(),
        unset: jest.fn(),
      },
      baseUrl: '/base-url',
    }

    res = {
      redirect: jest.fn(),
    }

    next = jest.fn()

    controller = new ResetAndRedirectToRevDateController({ route: '/reset-and-redirect' })
  })

  it('should reset session state and redirect to revocation date page', async () => {
    await controller.get(req, res, next)

    // Check session resets
    expect(req.sessionModel.set).toHaveBeenCalledWith(sessionModelFields.CURRENT_CASE_INDEX, 0)
    expect(req.sessionModel.set).toHaveBeenCalledWith(sessionModelFields.MANUAL_RECALL_DECISIONS, [])
    expect(req.sessionModel.set).toHaveBeenCalledWith(sessionModelFields.MANUAL_CASE_SELECTION, true)
    expect(req.sessionModel.unset).toHaveBeenCalledWith('activeSentenceChoice')
    expect(req.sessionModel.unset).toHaveBeenCalledWith('sentenceGroups')
    expect(req.sessionModel.unset).toHaveBeenCalledWith('unknownSentencesToUpdate')

    // Check redirect
    expect(res.redirect).toHaveBeenCalledWith('/base-url/revocation-date')

    // Ensure next was not called with an error
    expect(next).not.toHaveBeenCalled()
  })

  it('should call next with error if something throws', async () => {
    const error = new Error('Test error')
    req.sessionModel.set.mockImplementation(() => {
      throw error
    })

    await controller.get(req, res, next)

    expect(next).toHaveBeenCalledWith(error)
  })
})
