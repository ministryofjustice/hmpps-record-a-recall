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
  consecutiveToDetailsToDescription,
  formatCountNumber, // NEW: pulled from design system utils
} from '@ministryofjustice/hmpps-court-cases-release-dates-design/hmpps/utils/utils'
import dayjs from 'dayjs'
import { formatDate, initialiseName, lowercaseFirstLetter, periodLengthsToSentenceLengths } from './utils'
import { ApplicationInfo } from '../applicationInfo'
import config from '../config'

const production = process.env.NODE_ENV === 'production'

export default function nunjucksSetup(app: express.Express, applicationInfo: ApplicationInfo): void {
  app.set('view engine', 'njk')

  app.locals.asset_path = '/assets/'
  app.locals.applicationName = 'Record A Recall'
  app.locals.environmentName = config.environmentName
  app.locals.environmentNameColour = config.environmentName === 'PRE-PRODUCTION' ? 'govuk-tag--green' : ''
  app.locals.digitalPrisonServicesUrl = config.applications.digitalPrisonServices.url

  if (production) {
    app.locals.version = applicationInfo.gitShortHash
  } else {
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
      'node_modules/@ministryofjustice/hmpps-court-cases-release-dates-design/',
      'node_modules/@ministryofjustice/hmpps-court-cases-release-dates-design/hmpps/components/',
    ],
    {
      autoescape: true,
      express: app,
    },
  )

  function callAsMacro(name: string) {
    const macro = this.ctx[name]
    if (!isFunction(macro)) {
      console.log(`'${name}' macro does not exist`)
      return () => ''
    }
    return macro
  }

  njkEnv.addGlobal('callAsMacro', callAsMacro)

  // Filters from utils
  njkEnv.addFilter('initialiseName', initialiseName)
  njkEnv.addFilter('personProfileName', personProfileName)
  njkEnv.addFilter('personDateOfBirth', personDateOfBirth)
  njkEnv.addFilter('personStatus', personStatus)
  njkEnv.addFilter('firstNameSpaceLastName', firstNameSpaceLastName)
  njkEnv.addFilter('eightDigitDate', (date, format = 'DD/MM/YYYY') => dayjs(date).format(format))
  njkEnv.addFilter('date', (date, format = 'DD MMM YYYY') => dayjs(date).format(format))
  njkEnv.addFilter('fullMonthdate', (date, format = 'DD MMMM YYYY') => dayjs(date).format(format))
  njkEnv.addFilter('datetime', (date, format = 'YYYY-MM-DD HH:mm:ss') => dayjs(date).format(format))
  njkEnv.addFilter('sentenceDate', (date, format = 'dddd, DD MMMM YYYY') => dayjs(date).format(format))
  njkEnv.addFilter('formatLengths', formatLengths)
  njkEnv.addFilter('consecutiveToDetailsToDescription', consecutiveToDetailsToDescription)
  njkEnv.addFilter('formatDate', formatDate)
  njkEnv.addFilter('periodLengthsToSentenceLengths', periodLengthsToSentenceLengths)
  njkEnv.addFilter('lowercaseFirstLetter', lowercaseFirstLetter)
  njkEnv.addFilter('formatCountNumber', formatCountNumber)

  // Pluralize helper
  function pluralize(count: number): string {
    return count === 1 ? '' : 's'
  }
  njkEnv.addFilter('pluralize', pluralize)

  // Error finder
  interface ErrorObject {
    name?: string
    text: string
    href?: string
  }
  function findError(errorsArray: ErrorObject[] | undefined, fieldName: string): ErrorObject | undefined {
    if (!errorsArray) return undefined
    return errorsArray.find(error => error.name === fieldName)
  }
  njkEnv.addFilter('findError', findError)
}
