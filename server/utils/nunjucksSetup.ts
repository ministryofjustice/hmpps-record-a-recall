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
  formatCountNumber,
} from '@ministryofjustice/hmpps-court-cases-release-dates-design/hmpps/utils/utils'
import dayjs from 'dayjs'
import { initialiseName, lowercaseFirstLetter, periodLengthsToSentenceLengths } from './utils'
import { format8DigitDate } from '../formatters/formatDate'
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
  app.locals.config = config

  // Cachebusting version string
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
  njkEnv.addFilter('fullMonthdate', (date, format = 'DD MMMM YYYY') => dayjs(date).format(format))
  njkEnv.addFilter('datetime', (date, format = 'YYYY-MM-DD HH:mm:ss') => dayjs(date).format(format))
  njkEnv.addFilter('sentenceDate', (date, format = 'dddd, DD MMMM YYYY') => dayjs(date).format(format))
  njkEnv.addFilter('formatLengths', formatLengths)
  njkEnv.addFilter('consecutiveToDetailsToDescription', consecutiveToDetailsToDescription)
  njkEnv.addFilter('formatDate', format8DigitDate)
  njkEnv.addFilter('periodLengthsToSentenceLengths', periodLengthsToSentenceLengths)
  njkEnv.addFilter('lowercaseFirstLetter', lowercaseFirstLetter)
  njkEnv.addFilter('formatCountNumber', formatCountNumber)

  njkEnv.addFilter('sortPeriodLengths', (periods: Array<{ length: number }>) => {
    if (!Array.isArray(periods)) return []
    return periods.slice().sort((a, b) => a.length - b.length)
  })

  // Filter to pluralize a word based on a count. Adds 's' if count is not 1.
  function pluralize(count: number): string {
    return count === 1 ? '' : 's'
  }
  njkEnv.addFilter('pluralize', pluralize)

  // Filter to find error for a specific field from a field errors object
  function findError(errors: Record<string, string[]> | undefined, fieldName: string): { text: string } | null {
    if (!errors?.[fieldName]) return null
    return { text: errors[fieldName][0] }
  }
  njkEnv.addFilter('findError', findError)

  // Build error summary list for GOV.UK error summary from field errors object
  function buildErrorSummaryList(errors: Record<string, string[]> | undefined): Array<{ text: string; href: string }> {
    if (!errors) return []
    return Object.entries(errors).flatMap(([field, messages]) => messages.map(text => ({ text, href: `#${field}` })))
  }
  njkEnv.addFilter('buildErrorSummaryList', buildErrorSummaryList)
}
