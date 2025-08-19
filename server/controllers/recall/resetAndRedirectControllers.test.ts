/* eslint-disable @typescript-eslint/no-explicit-any */
import { jest } from '@jest/globals'
import { ResetAndRedirectToManualController, ResetAndRedirectToRevDateController } from './resetAndRedirectControllers'
import { sessionModelFields } from '../../helpers/formWizardHelper'

jest.mock('../../helpers/resetSessionHelper', () => ({
  __esModule: true,
  default: jest.fn((req: any) => {
    req.sessionModel.set(sessionModelFields.CURRENT_CASE_INDEX, 0)
    req.sessionModel.set(sessionModelFields.MANUAL_RECALL_DECISIONS, [])
    req.sessionModel.set(sessionModelFields.MANUAL_CASE_SELECTION, true)
    req.sessionModel.unset('activeSentenceChoice')
    req.sessionModel.unset('sentenceGroups')
    req.sessionModel.unset('unknownSentencesToUpdate')
  }),
}))

describe('ResetAndRedirectToManualController', () => {
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

    controller = new ResetAndRedirectToManualController({ route: '/reset-manual' })
  })

  it('resets session state and redirects to manual recall intercept', async () => {
    await controller.get(req, res, next)

    expect(req.sessionModel.set).toHaveBeenCalledWith(sessionModelFields.CURRENT_CASE_INDEX, 0)
    expect(req.sessionModel.set).toHaveBeenCalledWith(sessionModelFields.MANUAL_RECALL_DECISIONS, [])
    expect(req.sessionModel.set).toHaveBeenCalledWith(sessionModelFields.MANUAL_CASE_SELECTION, true)
    expect(req.sessionModel.unset).toHaveBeenCalledWith('activeSentenceChoice')
    expect(req.sessionModel.unset).toHaveBeenCalledWith('sentenceGroups')
    expect(req.sessionModel.unset).toHaveBeenCalledWith('unknownSentencesToUpdate')

    expect(res.redirect).toHaveBeenCalledWith('/base-url/manual-recall-intercept')
    expect(next).not.toHaveBeenCalled()
  })

  it('calls next with error if sessionModel.set throws', async () => {
    const error = new Error('Test error')
    req.sessionModel.set.mockImplementation(() => {
      throw error
    })

    await controller.get(req, res, next)

    expect(next).toHaveBeenCalledWith(error)
  })
})

describe('ResetAndRedirectToRevDateController', () => {
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

    controller = new ResetAndRedirectToRevDateController({ route: '/reset-rev-date' })
  })

  it('resets session state and redirects to revocation date', async () => {
    await controller.get(req, res, next)

    expect(req.sessionModel.set).toHaveBeenCalledWith(sessionModelFields.CURRENT_CASE_INDEX, 0)
    expect(req.sessionModel.set).toHaveBeenCalledWith(sessionModelFields.MANUAL_RECALL_DECISIONS, [])
    expect(req.sessionModel.set).toHaveBeenCalledWith(sessionModelFields.MANUAL_CASE_SELECTION, true)
    expect(req.sessionModel.unset).toHaveBeenCalledWith('activeSentenceChoice')
    expect(req.sessionModel.unset).toHaveBeenCalledWith('sentenceGroups')
    expect(req.sessionModel.unset).toHaveBeenCalledWith('unknownSentencesToUpdate')

    expect(res.redirect).toHaveBeenCalledWith('/base-url/revocation-date')
    expect(next).not.toHaveBeenCalled()
  })

  it('calls next with error if sessionModel.set throws', async () => {
    const error = new Error('Test error')
    req.sessionModel.set.mockImplementation(() => {
      throw error
    })

    await controller.get(req, res, next)

    expect(next).toHaveBeenCalledWith(error)
  })
})
