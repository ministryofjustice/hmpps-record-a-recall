import path from 'path'
import compression from 'compression'
import express, { Router } from 'express'
import noCache from 'nocache'

import config from '../config'

export default function setUpStaticResources(): Router {
  const router = express.Router()

  router.use(compression())

  //  Static Resources Configuration
  const cacheControl = { maxAge: config.staticResourceCacheDuration }

  Array.of(
    '/assets',
    '/assets/stylesheets',
    '/assets/js',
    '/node_modules/govuk-frontend/dist/govuk/assets',
    '/node_modules/govuk-frontend/dist',
    '/node_modules/@ministryofjustice/frontend/moj/assets',
    '/node_modules/@ministryofjustice/frontend',
    '/node_modules/@ministryofjustice/hmpps-court-cases-release-dates-design/hmpps/assets',
    '/node_modules/@ministryofjustice/hmpps-court-cases-release-dates-design',
  ).forEach(dir => {
    router.use('/assets', express.static(path.join(process.cwd(), dir), cacheControl))
  })

  // Don't cache dynamic resources
  router.use(noCache())

  return router
}
