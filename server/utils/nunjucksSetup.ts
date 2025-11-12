/* eslint-disable no-param-reassign */
import path from 'path'
import nunjucks from 'nunjucks'
import express from 'express'
import fs from 'fs'
import {
  personProfileName,
  personDateOfBirth,
  personStatus,
  firstNameSpaceLastName,
  formatLengths,
  consecutiveToDetailsToDescription,
  formatCountNumber,
  sortPeriodLengths,
  groupAndSortPeriodLengths,
} from '@ministryofjustice/hmpps-court-cases-release-dates-design/hmpps/utils/utils'
import {
  formatDate,
  initialiseName,
  lowercaseFirstLetter,
  periodLengthsToSentenceLengths,
  sentenceTypeValueOrLegacy,
} from './utils'
import config from '../config'
import logger from '../../logger'

export default function nunjucksSetup(app: express.Express): void {
  app.set('view engine', 'njk')

  app.locals.asset_path = '/assets/'
  app.locals.applicationName = 'Record A Recall'
  app.locals.environmentName = config.environmentName
  app.locals.environmentNameColour = config.environmentName === 'PRE-PRODUCTION' ? 'govuk-tag--green' : ''
  let assetManifest: Record<string, string> = {}

  try {
    const assetMetadataPath = path.resolve(__dirname, '../../assets/manifest.json')
    assetManifest = JSON.parse(fs.readFileSync(assetMetadataPath, 'utf8'))
  } catch (e) {
    if (process.env.NODE_ENV !== 'test') {
      logger.error(e, 'Could not read asset manifest file')
    }
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

  njkEnv.addFilter('personProfileName', personProfileName)
  njkEnv.addFilter('personDateOfBirth', personDateOfBirth)
  njkEnv.addFilter('personStatus', personStatus)
  njkEnv.addFilter('firstNameSpaceLastName', firstNameSpaceLastName)
  njkEnv.addFilter('initialiseName', initialiseName)
  njkEnv.addFilter('formatLengths', formatLengths)
  njkEnv.addFilter('consecutiveToDetailsToDescription', consecutiveToDetailsToDescription)
  njkEnv.addFilter('formatCountNumber', formatCountNumber)
  njkEnv.addFilter('sortPeriodLengths', sortPeriodLengths)
  njkEnv.addFilter('lowercaseFirstLetter', lowercaseFirstLetter)
  njkEnv.addFilter('formatDate', formatDate)
  njkEnv.addFilter('jsonToString', someJson => JSON.stringify(someJson))
  njkEnv.addFilter('periodLengthsToSentenceLengths', periodLengthsToSentenceLengths)
  njkEnv.addFilter('groupAndSortPeriodLengths', groupAndSortPeriodLengths)
  njkEnv.addFilter('formatLengths', formatLengths)
  njkEnv.addFilter('sentenceTypeValueOrLegacy', sentenceTypeValueOrLegacy)

  njkEnv.addFilter('assetMap', (url: string) => assetManifest[url] || url)

  njkEnv.addFilter('pluralise', (word, number, appender) => (number === 1 ? word : `${word}${appender || 's'}`))

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
