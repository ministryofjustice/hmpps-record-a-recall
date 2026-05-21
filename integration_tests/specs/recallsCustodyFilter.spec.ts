import { expect, test } from '@playwright/test'
import { login, resetStubs } from '../testUtils'

import frontendComponentsApi from '../mockApis/frontEndComponentsApi'
import prisonerSearchApi from '../mockApis/prisonerSearchApi'
import remandAndSentencingApi, { custodyFilterRecallIds } from '../mockApis/remandAndSentencingApi'
import prisonRegisterApi from '../mockApis/prisonRegisterApi'
import ccardApi from '../mockApis/ccardApi'
import courtRegisterApi from '../mockApis/courtRegisterApi'
import manageOffencesApi from '../mockApis/manageOffencesApi'
import prisonApi from '../mockApis/prisonApi'

import HomePage from '../pages/homePage'

const PRISONER_ID = 'A0164ED'

test.describe('Recalls custody period filter', () => {
  test.afterEach(async () => {
    await resetStubs()
  })

  test.beforeEach(async () => {
    await Promise.all([
      prisonerSearchApi.stubPrisonerSearch(),
      frontendComponentsApi.stubComponents(),
      ccardApi.getServiceDefinitions(),
      prisonRegisterApi.getPrisonsByPrisonIds(),
      courtRegisterApi.stubGetCourtsByIds(),
      manageOffencesApi.getOffencesByCodes(),
      prisonApi.stubGetPrisonerImage(),
      remandAndSentencingApi.stubFixManyCharges(),
    ])
  })

  test('shows filter with current period recalls by default', async ({ page }) => {
    await remandAndSentencingApi.stubRecallsForCustodyPeriodFilter()
    await login(page)
    await page.goto(`/person/${PRISONER_ID}`)

    const homePage = await HomePage.verifyOnPage(page)

    await expect(homePage.filterPreviousPeriodsOfCustody).toBeVisible()
    await expect(homePage.showingCount).toHaveText(/Showing\s+2\s+of\s+3\s+recalls/)
    await homePage.expandFilterPanel()
    await expect(homePage.includePreviousPeriodsCheckbox).not.toBeChecked()

    await expect(homePage.recallCard(custodyFilterRecallIds.currentPeriod)).toBeVisible()
    await expect(homePage.nomisRecallBadge(custodyFilterRecallIds.nullBooking)).toBeVisible()
    await expect(homePage.recallCard(custodyFilterRecallIds.previousPeriod)).toHaveCount(0)
    await expect(homePage.recallCards).toHaveCount(2)
  })

  test('shows all recalls when including previous periods of custody', async ({ page }) => {
    await remandAndSentencingApi.stubRecallsForCustodyPeriodFilter()
    await login(page)
    await page.goto(`/person/${PRISONER_ID}`)

    const homePage = await HomePage.verifyOnPage(page)
    await homePage.applyFilter({ includePreviousPeriods: true })

    await expect(homePage.showingCount).toHaveText(/Showing\s+3\s+of\s+3\s+recalls/)
    await expect(homePage.includePreviousPeriodsCheckbox).toBeChecked()
    await expect(homePage.recallCards).toHaveCount(3)
    await expect(homePage.recallCard(custodyFilterRecallIds.currentPeriod)).toBeVisible()
    await expect(homePage.recallCard(custodyFilterRecallIds.previousPeriod)).toBeVisible()
    await expect(homePage.nomisRecallBadge(custodyFilterRecallIds.nullBooking)).toBeVisible()
  })

  test('shows empty current period message when recalls exist only on other bookings', async ({ page }) => {
    await remandAndSentencingApi.stubRecallsOnlyOnPreviousBooking()
    await login(page)
    await page.goto(`/person/${PRISONER_ID}`)

    const homePage = await HomePage.verifyOnPage(page)

    await expect(homePage.showingCount).toHaveText(/Showing\s+0\s+of\s+1\s+recalls/)
    await expect(homePage.noRecallsInCurrentPeriodHint).toHaveText(
      'There are no recalls recorded for this period of custody for Vanilla Recalls.',
    )
    await expect(homePage.noRecallsInCurrentPeriodFilterHint).toHaveText(
      'You can use the filters to show recalls from previous periods of custody.',
    )
    await expect(homePage.recallCards).toHaveCount(0)
  })

  test('does not show filter when there are no recalls', async ({ page }) => {
    await remandAndSentencingApi.stubNoRecallsForPrisoner()
    await login(page)
    await page.goto(`/person/${PRISONER_ID}`)

    const homePage = await HomePage.verifyOnPage(page)

    await expect(homePage.filterPreviousPeriodsOfCustody).toHaveCount(0)
    await expect(homePage.noRecallsHint).toHaveText('There are no recalls recorded.')
  })

  test('returns to current period view when filter is unchecked and applied', async ({ page }) => {
    await remandAndSentencingApi.stubRecallsForCustodyPeriodFilter()
    await login(page)
    await page.goto(`/person/${PRISONER_ID}?includeRecallsFromPreviousPeriodsOfCustody=true`)

    const homePage = await HomePage.verifyOnPage(page)
    await expect(homePage.showingCount).toHaveText(/Showing\s+3\s+of\s+3\s+recalls/)

    await homePage.applyFilter({ includePreviousPeriods: false })

    await expect(homePage.showingCount).toHaveText(/Showing\s+2\s+of\s+3\s+recalls/)
    await expect(homePage.recallCards).toHaveCount(2)
    await expect(homePage.recallCard(custodyFilterRecallIds.previousPeriod)).toHaveCount(0)
  })
})
