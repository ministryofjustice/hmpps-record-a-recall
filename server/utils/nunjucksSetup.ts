/* eslint-disable no-param-reassign */
import path from 'path'
import nunjucks from 'nunjucks'
import express from 'express'
import { isFunction } from 'lodash'
import {
  personProfileName,
  personDateOfBirth,
  personStatus,
  firstNameSpaceLastName,
  formatLengths,
} from 'hmpps-court-cases-release-dates-design/hmpps/utils/utils'
import dayjs from 'dayjs'
import { initialiseName } from './utils'
import { ApplicationInfo } from '../applicationInfo'
import config from '../config'

const production = process.env.NODE_ENV === 'production'

export default function nunjucksSetup(app: express.Express, applicationInfo: ApplicationInfo): void {
  app.set('view engine', 'njk')

  app.locals.asset_path = '/assets/'
  app.locals.applicationName = 'Record A Recall'
  app.locals.environmentName = config.environmentName
  app.locals.environmentNameColour = config.environmentName === 'PRE-PRODUCTION' ? 'govuk-tag--green' : ''
  app.locals.digitalPrisonServicesUrl = config.digitalPrisonServicesUrl

  // Cachebusting version string
  if (production) {
    // Version only changes with new commits
    app.locals.version = applicationInfo.gitShortHash
  } else {
    // Version changes every request
    app.use((req, res, next) => {
      res.locals.version = Date.now().toString()
      return next()
    })
  }

  const njkEnv = nunjucks.configure(
    [
      path.join(__dirname, '../../server/views'),
      'node_modules/govuk-frontend/dist/',
      'node_modules/@ministryofjustice/frontend/',
      'node_modules/hmpps-court-cases-release-dates-design/',
      'node_modules/hmpps-court-cases-release-dates-design/hmpps/components/',
    ],
    {
      autoescape: true,
      express: app,
    },
  )

  function callAsMacro(name: string) {
    const macro = this.ctx[name]

    if (!isFunction(macro)) {
      // eslint-disable-next-line no-console
      console.log(`'${name}' macro does not exist`)
      return () => ''
    }

    return macro
  }

  njkEnv.addGlobal('callAsMacro', callAsMacro)

  njkEnv.addFilter('initialiseName', initialiseName)
  njkEnv.addFilter('personProfileName', personProfileName)
  njkEnv.addFilter('personDateOfBirth', personDateOfBirth)
  njkEnv.addFilter('personStatus', personStatus)
  njkEnv.addFilter('firstNameSpaceLastName', firstNameSpaceLastName)
  njkEnv.addFilter('eightDigitDate', (date, format = 'DD/MM/YYYY') => dayjs(date).format(format))
  njkEnv.addFilter('date', (date, format = 'DD MMM YYYY') => dayjs(date).format(format))
  njkEnv.addFilter('datetime', (date, format = 'YYYY-MM-DD HH:mm:ss') => dayjs(date).format(format))
  njkEnv.addFilter('sentenceDate', (date, format = 'dddd, DD MMMM YYYY') => dayjs(date).format(format))
  njkEnv.addFilter('formatLengths', formatLengths)
}
