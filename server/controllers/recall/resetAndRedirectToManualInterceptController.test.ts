/* eslint-disable @typescript-eslint/no-explicit-any */
import { jest } from '@jest/globals'
import { sessionModelFields } from '../../helpers/formWizardHelper'
import ResetAndRedirectToManualController from './resetAndRedirectToManualInterceptController'
import * as sessionHelper from '../../helpers/sessionHelper'

// Mock sessionHelper instead of resetSessionHelper
jest.mock('../../helpers/sessionHelper', () => ({
  setSessionValue: jest.fn(),
  unsetSessionValue: jest.fn(),
  getSessionValue: jest.fn(),
}))

jest.mock('../../helpers/resetSessionHelper', () => ({
  __esModule: true,
  default: jest.fn((req: any) => {
    const helpers = sessionHelper as typeof import('../../helpers/sessionHelper')
    helpers.setSessionValue(req, sessionModelFields.CURRENT_CASE_INDEX, 0)
    helpers.setSessionValue(req, sessionModelFields.MANUAL_RECALL_DECISIONS, [])
    helpers.setSessionValue(req, sessionModelFields.MANUAL_CASE_SELECTION, true)
    helpers.unsetSessionValue(req, sessionModelFields.ACTIVE_SENTENCE_CHOICE)
    helpers.unsetSessionValue(req, sessionModelFields.SENTENCE_GROUPS)
    helpers.unsetSessionValue(req, sessionModelFields.UNKNOWN_SENTENCES_TO_UPDATE)
  }),
}))

describe('ResetAndRedirectToManualController', () => {
  let req: any
  let res: any
  let next: jest.Mock
  let controller: ResetAndRedirectToManualController

  beforeEach(() => {
    req = {
      session: {
        formData: {},
      },
      baseUrl: '/base-url',
    }

    res = {
      redirect: jest.fn(),
    }

    next = jest.fn()

    controller = new ResetAndRedirectToManualController({ route: '/reset-manual' })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('resets session state and redirects to manual recall intercept', async () => {
    await controller.get(req, res, next)

    expect(sessionHelper.setSessionValue).toHaveBeenCalledWith(req, sessionModelFields.CURRENT_CASE_INDEX, 0)
    expect(sessionHelper.setSessionValue).toHaveBeenCalledWith(req, sessionModelFields.MANUAL_RECALL_DECISIONS, [])
    expect(sessionHelper.setSessionValue).toHaveBeenCalledWith(req, sessionModelFields.MANUAL_CASE_SELECTION, true)
    expect(sessionHelper.unsetSessionValue).toHaveBeenCalledWith(req, sessionModelFields.ACTIVE_SENTENCE_CHOICE)
    expect(sessionHelper.unsetSessionValue).toHaveBeenCalledWith(req, sessionModelFields.SENTENCE_GROUPS)
    expect(sessionHelper.unsetSessionValue).toHaveBeenCalledWith(req, sessionModelFields.UNKNOWN_SENTENCES_TO_UPDATE)

    expect(res.redirect).toHaveBeenCalledWith('/base-url/manual-recall-intercept')
    expect(next).not.toHaveBeenCalled()
  })

  it('calls next with error if setSessionValue throws', async () => {
    const error = new Error('Test error')
    ;(sessionHelper.setSessionValue as jest.Mock).mockImplementation(() => {
      throw error
    })

    await controller.get(req, res, next)

    expect(next).toHaveBeenCalledWith(error)
  })
})
