import { NextFunction } from 'express'
import ManualRecallInterceptController from './ManualRecallInterceptController'
import RecallBaseController from './recallBaseController'

const render = jest.fn()
const redirect = jest.fn()
const set = jest.fn()

type MockReq = {
  body: Record<string, unknown>
  sessionModel: { set: jest.Mock }
  baseUrl: string
}
type MockRes = {
  render: jest.Mock
  redirect: jest.Mock
}

describe('ManualRecallInterceptController', () => {
  let req: MockReq
  let res: MockRes
  let next: NextFunction
  let controller: ManualRecallInterceptController

  beforeEach(() => {
    jest.clearAllMocks()
    req = {
      body: {},
      sessionModel: { set },
      baseUrl: '/recall',
    }
    res = { render, redirect }
    next = jest.fn()
    controller = new ManualRecallInterceptController({ route: '/manual-recall-intercept' })
    jest.restoreAllMocks()
  })

  describe('get', () => {
    it('renders the intercept page with locals', async () => {
      const locals = { foo: 'bar' }
      jest.spyOn(controller as unknown as { locals: (...args: unknown[]) => unknown }, 'locals').mockReturnValue(locals)
      // @ts-expect-error: partial mock is sufficient for controller unit test
      await controller.get(req, res, next)
      expect(res.render).toHaveBeenCalledWith('pages/recall/manual-recall-intercept.njk', locals)
    })
  })

  describe('post', () => {
    it('sets session and calls super.post when continue is in body', async () => {
      req.body.continue = '1'
      const superSpy = jest.spyOn(RecallBaseController.prototype, 'post').mockResolvedValue(undefined)
      // @ts-expect-error: partial mock is sufficient for controller unit test
      await controller.post(req as unknown as import('express').Request, res, next)
      expect(set).toHaveBeenCalledWith('manualRecallInterceptConfirmation', 'confirmed')
      expect(superSpy).toHaveBeenCalledWith(req, res, next)
    })

    it('redirects to confirm-cancel if cancel is in body', async () => {
      req.body.cancel = '1'
      const superSpy = jest.spyOn(RecallBaseController.prototype, 'post').mockResolvedValue(undefined)
      // @ts-expect-error: partial mock is sufficient for controller unit test
      await controller.post(req as unknown as import('express').Request, res, next)
      expect(res.redirect).toHaveBeenCalledWith(303, '/recall/confirm-cancel')
      expect(superSpy).not.toHaveBeenCalled()
    })

    it('calls super.post if neither continue nor cancel', async () => {
      const superSpy = jest.spyOn(RecallBaseController.prototype, 'post').mockResolvedValue(undefined)
      // @ts-expect-error: partial mock is sufficient for controller unit test
      await controller.post(req as unknown as import('express').Request, res, next)
      expect(superSpy).toHaveBeenCalledWith(req, res, next)
    })
  })
})
