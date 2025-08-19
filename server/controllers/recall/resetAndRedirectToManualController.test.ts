/* eslint-disable @typescript-eslint/no-explicit-any */

import { jest } from '@jest/globals'
import ResetAndRedirectToManualController from './resetAndRedirectToManualController'
import { sessionModelFields } from '../../helpers/formWizardHelper'

jest.mock('../../helpers/formWizardHelper', () => ({
  __esModule: true,
  sessionModelFields: {
    CURRENT_CASE_INDEX: 'currentCaseIndex',
    MANUAL_RECALL_DECISIONS: 'manualRecallDecisions',
    MANUAL_CASE_SELECTION: 'manualCaseSelection',
  },
}))

describe('ResetAndRedirectToManualController - get', () => {
  let req: any
  let res: any
  let next: jest.Mock
  let controller: ResetAndRedirectToManualController

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

    controller = new ResetAndRedirectToManualController({ route: '/reset-and-redirect-manual' })
  })

  it('should reset session state and redirect to manual recall intercept page', async () => {
    await controller.get(req, res, next)

    // Check session resets
    expect(req.sessionModel.set).toHaveBeenCalledWith(sessionModelFields.CURRENT_CASE_INDEX, 0)
    expect(req.sessionModel.set).toHaveBeenCalledWith(sessionModelFields.MANUAL_RECALL_DECISIONS, [])
    expect(req.sessionModel.set).toHaveBeenCalledWith(sessionModelFields.MANUAL_CASE_SELECTION, true)
    expect(req.sessionModel.unset).toHaveBeenCalledWith('activeSentenceChoice')
    expect(req.sessionModel.unset).toHaveBeenCalledWith('sentenceGroups')
    expect(req.sessionModel.unset).toHaveBeenCalledWith('unknownSentencesToUpdate')

    // Check redirect
    expect(res.redirect).toHaveBeenCalledWith('/base-url/manual-recall-intercept')

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
