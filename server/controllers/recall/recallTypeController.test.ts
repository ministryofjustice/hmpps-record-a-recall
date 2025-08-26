/* eslint-disable @typescript-eslint/no-explicit-any */
import { jest } from '@jest/globals'
import * as formWizardHelper from '../../helpers/formWizardHelper'
import { sessionModelFields } from '../../helpers/formWizardHelper'
import { RecallTypes } from '../../@types/recallTypes'
import RecallTypeController from './recallTypeController'
import config from '../../config'

describe('recallTypeController', () => {
  let req: any
  let res: any
  let next: jest.Mock
  let controller: RecallTypeController
  const get = jest.fn() as jest.MockedFunction<(key: string) => unknown>

  beforeEach(() => {
    req = {
      sessionModel: {
        get,
        set: jest.fn(),
        unset: jest.fn(),
      },
      baseUrl: '/base-url',
      form: {
        options: {},
      },
    }

    res = {
      redirect: jest.fn(),
    }

    next = jest.fn()

    controller = new RecallTypeController({ route: '/recall-type' })
  })

  afterEach(() => {
    config.featureToggles.unexpectedRecallTypeCheckEnabled = false
  })

  describe('is invalid', () => {
    beforeEach(() => {
      // set up as invalid recall type
      get.mockImplementation(key => {
        if (key === formWizardHelper.sessionModelFields.RECALL_TYPE) {
          return 'FTR_28'
        }
        if (key === formWizardHelper.sessionModelFields.INVALID_RECALL_TYPES) {
          return [RecallTypes.TWENTY_EIGHT_DAY_FIXED_TERM_RECALL]
        }
        return null
      })
    })

    it('sets invalid recall type flag to true if is invalid and feature toggle is on', async () => {
      config.featureToggles.unexpectedRecallTypeCheckEnabled = true
      await controller.successHandler(req, res, next)

      expect(req.sessionModel.set).toHaveBeenCalledWith(sessionModelFields.RECALL_TYPE_MISMATCH, true)
    })

    it('sets invalid recall type flag to false if is invalid but feature toggle is false', async () => {
      config.featureToggles.unexpectedRecallTypeCheckEnabled = false
      await controller.successHandler(req, res, next)

      expect(req.sessionModel.set).toHaveBeenCalledWith(sessionModelFields.RECALL_TYPE_MISMATCH, false)
    })
  })

  describe('is not invalid', () => {
    beforeEach(() => {
      // set up as valid recall type
      get.mockImplementation(key => {
        if (key === formWizardHelper.sessionModelFields.RECALL_TYPE) {
          return 'FTR_28'
        }
        if (key === formWizardHelper.sessionModelFields.INVALID_RECALL_TYPES) {
          return []
        }
        return null
      })
    })

    it('sets invalid recall type flag to false if is valid and feature toggle is on', async () => {
      config.featureToggles.unexpectedRecallTypeCheckEnabled = true
      await controller.successHandler(req, res, next)

      expect(req.sessionModel.set).toHaveBeenCalledWith(sessionModelFields.RECALL_TYPE_MISMATCH, false)
    })

    it('sets invalid recall type flag to false if is valid and feature toggle is false', async () => {
      config.featureToggles.unexpectedRecallTypeCheckEnabled = false
      await controller.successHandler(req, res, next)

      expect(req.sessionModel.set).toHaveBeenCalledWith(sessionModelFields.RECALL_TYPE_MISMATCH, false)
    })
  })
})
