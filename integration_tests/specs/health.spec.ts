import { expect, test } from '@playwright/test'
import hmppsAuth from '../mockApis/hmppsAuth'
import tokenVerification from '../mockApis/tokenVerification'

import { resetStubs } from '../testUtils'
import remandAndSentencingApi from '../mockApis/remandAndSentencingApi'
import prisonerSearchApi from '../mockApis/prisonerSearchApi'
import prisonApi from '../mockApis/prisonApi'
import calculateReleaseDatesApi from '../mockApis/calculateReleaseDatesApi'
import courtRegisterApi from '../mockApis/courtRegisterApi'
import prisonRegisterApi from '../mockApis/prisonRegisterApi'
import manageOffencesApi from '../mockApis/manageOffencesApi'
import adjustmentsApi from '../mockApis/adjustmentsApi'
import ccardApi from '../mockApis/ccardApi'
import frontEndComponentsApi from '../mockApis/frontEndComponentsApi'

test.describe('Health', () => {
  test.afterEach(async () => {
    await resetStubs()
  })

  test.describe('All healthy', () => {
    test.beforeEach(async () => {
      await Promise.all([
        hmppsAuth.stubPing(),
        tokenVerification.stubPing(),
        remandAndSentencingApi.stubPing(),
        prisonApi.stubPing(),
        prisonerSearchApi.stubPing(),
        calculateReleaseDatesApi.stubPing(),
        courtRegisterApi.stubPing(),
        prisonRegisterApi.stubPing(),
        manageOffencesApi.stubPing(),
        adjustmentsApi.stubPing(),
        ccardApi.stubPing(),
        frontEndComponentsApi.stubPing(),
        frontEndComponentsApi.stubComponents(),
      ])
    })

    test('Health check is accessible and status is UP', async ({ page }) => {
      const response = await page.request.get('/health')
      const payload = await response.json()
      expect(payload.status).toBe('UP')
    })

    test('Ping is accessible and status is UP', async ({ page }) => {
      const response = await page.request.get('/ping')
      const payload = await response.json()
      expect(payload.status).toBe('UP')
    })

    test('Info is accessible', async ({ page }) => {
      const response = await page.request.get('/info')
      const payload = await response.json()
      expect(payload.build.name).toBe('hmpps-record-a-recall')
    })
  })

  test.describe('Some unhealthy', () => {
    test.beforeEach(async () => {
      await Promise.all([hmppsAuth.stubPing(), tokenVerification.stubPing(500)])
    })

    test('Health check status is down', async ({ page }) => {
      const response = await page.request.get('/health')
      const payload = await response.json()
      expect(payload.status).toBe('DOWN')
      expect(payload.components.hmppsAuth.status).toBe('UP')
      expect(payload.components.tokenVerification.status).toBe('DOWN')
      expect(payload.components.tokenVerification.details.status).toBe(500)
      expect(payload.components.tokenVerification.details.attempts).toBe(3)
    })
  })
})
