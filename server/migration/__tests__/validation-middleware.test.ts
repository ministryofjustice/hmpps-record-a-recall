import { z } from 'zod'
import { Request, Response, NextFunction } from 'express'
import { validateWithZod } from '../validation-middleware'

describe('validateWithZod', () => {
  let req: Request & { validatedData?: unknown }
  let res: Response
  let next: NextFunction

  beforeEach(() => {
    req = {
      body: {},
      originalUrl: '/test',
      session: {} as Record<string, unknown>,
    } as unknown as Request & { validatedData?: unknown }

    res = {
      redirect: jest.fn(),
    } as unknown as Response

    next = jest.fn()
  })

  describe('successful validation', () => {
    it('should call next with validated data on successful validation', async () => {
      const schema = z.object({
        name: z.string().min(1),
      })

      const middleware = validateWithZod(schema)
      req.body = { name: 'John' }

      await middleware(req, res, next)

      expect(req.validatedData).toEqual({ name: 'John' })
      expect(next).toHaveBeenCalled()
      expect(res.redirect).not.toHaveBeenCalled()
    })

    it('should apply transformations during validation', async () => {
      const schema = z.object({
        name: z.string().transform(val => val.toUpperCase()),
      })

      const middleware = validateWithZod(schema)
      req.body = { name: 'john' }

      await middleware(req, res, next)

      expect(req.validatedData).toEqual({ name: 'JOHN' })
      expect(next).toHaveBeenCalled()
    })
  })

  describe('failed validation', () => {
    it('should redirect with errors on validation failure', async () => {
      const schema = z.object({
        name: z.string().min(1, 'Name is required'),
      })

      const middleware = validateWithZod(schema)
      req.body = { name: '' }

      await middleware(req, res, next)

      expect(req.session.formErrors).toEqual({
        name: {
          type: 'validation',
          message: 'Name is required',
        },
      })
      expect(req.session.formValues).toEqual({ name: '' })
      expect(res.redirect).toHaveBeenCalledWith('/test')
      expect(next).not.toHaveBeenCalled()
    })

    it('should handle multiple validation errors', async () => {
      const schema = z.object({
        name: z.string().min(1, 'Name is required'),
        age: z.number().min(18, 'Must be 18 or older'),
      })

      const middleware = validateWithZod(schema)
      req.body = { name: '', age: 15 }

      await middleware(req, res, next)

      expect(req.session.formErrors).toEqual({
        name: {
          type: 'validation',
          message: 'Name is required',
        },
        age: {
          type: 'validation',
          message: 'Must be 18 or older',
        },
      })
      expect(res.redirect).toHaveBeenCalledWith('/test')
    })

    it('should preserve form values on validation failure', async () => {
      const schema = z.object({
        name: z.string().min(5),
      })

      const middleware = validateWithZod(schema)
      req.body = { name: 'Jo', other: 'value' }

      await middleware(req, res, next)

      expect(req.session.formValues).toEqual({ name: 'Jo', other: 'value' })
    })
  })

  describe('error handling', () => {
    it('should call next with error if validation throws', async () => {
      const schema = z.object({
        name: z.string().refine(() => {
          throw new Error('Test error')
        }),
      })

      const middleware = validateWithZod(schema)
      req.body = { name: 'test' }

      await middleware(req, res, next)

      expect(next).toHaveBeenCalledWith(expect.any(Error))
      expect(res.redirect).not.toHaveBeenCalled()
    })
  })

  describe('async validation', () => {
    it('should handle async refinements', async () => {
      const schema = z.object({
        username: z.string().refine(
          async val => {
            // Simulate async check
            await new Promise<void>(resolve => {
              setTimeout(resolve, 10)
            })
            return val !== 'taken'
          },
          { message: 'Username already taken' },
        ),
      })

      const middleware = validateWithZod(schema)
      req.body = { username: 'taken' }

      await middleware(req, res, next)

      expect(req.session.formErrors).toEqual({
        username: {
          type: 'validation',
          message: 'Username already taken',
        },
      })
      expect(res.redirect).toHaveBeenCalledWith('/test')
    })
  })
})
