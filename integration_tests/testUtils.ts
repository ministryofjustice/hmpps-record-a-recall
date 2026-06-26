import { Page } from '@playwright/test'
import tokenVerification from './mockApis/tokenVerification'
import hmppsAuth, { type UserToken } from './mockApis/hmppsAuth'
import { resetStubs } from './mockApis/wiremock'
import prisonApi from './mockApis/prisonApi'
import prisonerSearchApi from './mockApis/prisonerSearchApi'
import frontEndComponentsApi from './mockApis/frontEndComponentsApi'
import ccardApi from './mockApis/ccardApi'
import prisonRegisterApi from './mockApis/prisonRegisterApi'
import courtRegisterApi from './mockApis/courtRegisterApi'
import manageOffencesApi from './mockApis/manageOffencesApi'
import remandAndSentencingApi from './mockApis/remandAndSentencingApi'
import HomePage from './pages/homePage'

export { resetStubs }

const DEFAULT_ROLES = ['ROLE_RECALL_MAINTAINER', 'ROLE_RELEASE_DATES_CALCULATOR']
const RECALLS_HOME_PRISONER_ID = 'A0164ED'

export const stubRecallsHomePage = async () => {
  await Promise.all([
    prisonerSearchApi.stubPrisonerSearch(),
    frontEndComponentsApi.stubComponents(),
    ccardApi.getServiceDefinitions(),
    prisonRegisterApi.getPrisonsByPrisonIds(),
    courtRegisterApi.stubGetCourtsByIds(),
    manageOffencesApi.getOffencesByCodes(),
    prisonApi.stubGetPrisonerImage(),
    remandAndSentencingApi.stubFixManyCharges(),
    remandAndSentencingApi.stubNoRecallsForPrisoner(),
  ])
}

export const visitRecallsHome = async (page: Page) => {
  await stubRecallsHomePage()
  await page.goto(`/person/${RECALLS_HOME_PRISONER_ID}`)
  return HomePage.verifyOnPage(page)
}

export const attemptHmppsAuthLogin = async (page: Page) => {
  await page.goto('/')
  page.locator('h1', { hasText: 'Sign in' })
  const url = await hmppsAuth.getSignInUrl()
  return page.goto(url)
}

export const login = async (
  page: Page,
  { name, roles = DEFAULT_ROLES, active = true, authSource = 'nomis' }: UserToken & { active?: boolean } = {},
) => {
  await Promise.all([
    hmppsAuth.favicon(),
    hmppsAuth.stubSignInPage(),
    hmppsAuth.stubSignOutPage(),
    hmppsAuth.token({ name, roles, authSource }),
    tokenVerification.stubVerifyToken(active),
    prisonApi.stubGetUserCaseloads(),
  ])
  return attemptHmppsAuthLogin(page)
}
