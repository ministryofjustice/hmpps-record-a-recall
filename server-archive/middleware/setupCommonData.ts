import { Request, Response, NextFunction } from 'express'

/**
 * Middleware to set up common template data that's needed across multiple pages
 */
export default function setupCommonData() {
  return (req: Request, res: Response, next: NextFunction) => {
    const { nomisId, user } = res.locals

    // Set basic template data
    res.locals.nomisId = nomisId
    res.locals.user = user

    // Handle flash messages consistently
    const banner: {
      success?: {
        title: string
        content: string
      }
    } = {}

    const success = req.flash('success')
    if (success?.length) {
      // @ts-expect-error This works
      // eslint-disable-next-line prefer-destructuring
      banner.success = success[0]
    }

    const error = req.flash('errorMessage')

    res.locals.banner = banner
    res.locals.errorMessage = error?.length ? error[0] : null

    next()
  }
}
