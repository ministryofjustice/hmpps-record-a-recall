import { expect, type Locator, type Page } from '@playwright/test'
import AbstractPage from './abstractPage'

export default class HomePage extends AbstractPage {
  readonly header: Locator

  readonly headerUserName: Locator

  readonly headerPhaseBanner: Locator

  readonly createNewRecallButton: Locator

  readonly filterPreviousPeriodsOfCustody: Locator

  readonly showingCount: Locator

  readonly includePreviousPeriodsCheckbox: Locator

  readonly applyFilterButton: Locator

  readonly noRecallsHint: Locator

  readonly noRecallsInCurrentPeriodHint: Locator

  readonly noRecallsInCurrentPeriodFilterHint: Locator

  readonly recallCards: Locator

  private constructor(page: Page) {
    super(page)

    this.header = page.locator('h1.govuk-heading-xl', { hasText: 'Recalls' })

    this.headerUserName = page.getByTestId('header-user-name')
    this.headerPhaseBanner = page.getByTestId('header-phase-banner')

    this.createNewRecallButton = page.getByTestId('create-new-recall-btn')
    this.filterPreviousPeriodsOfCustody = page.getByTestId('filter-previous-periods-of-custody')
    this.showingCount = page.getByTestId('recalls-showing-count')
    this.includePreviousPeriodsCheckbox = page.locator('input[name="includeRecallsFromPreviousPeriodsOfCustody"]')
    this.applyFilterButton = page.getByTestId('applyButton')
    this.noRecallsHint = page.getByTestId('no-recalls-hint')
    this.noRecallsInCurrentPeriodHint = page.getByTestId('no-recalls-in-current-period-hint')
    this.noRecallsInCurrentPeriodFilterHint = page.getByTestId('no-recalls-in-current-period-filter-hint')
    this.recallCards = page.locator('.recall-card')
  }

  static async verifyOnPage(page: Page): Promise<HomePage> {
    const homePage = new HomePage(page)
    await expect(homePage.header).toBeVisible()
    return homePage
  }

  recallCard(recallUuid: string): Locator {
    return this.page.getByTestId(`recall-${recallUuid}-card-title`)
  }

  nomisRecallBadge(recallUuid: string): Locator {
    return this.page.getByTestId(`recall-${recallUuid}-nomis-badge`)
  }

  async expandFilterPanel() {
    const summary = this.filterPreviousPeriodsOfCustody.locator('summary')
    const isExpanded = await this.applyFilterButton.isVisible()
    if (!isExpanded) {
      await summary.click()
    }
  }

  async applyFilter({ includePreviousPeriods = false }: { includePreviousPeriods?: boolean } = {}) {
    await this.expandFilterPanel()
    if (includePreviousPeriods) {
      await this.includePreviousPeriodsCheckbox.check()
    } else {
      await this.includePreviousPeriodsCheckbox.uncheck()
    }
    await this.applyFilterButton.click()
    await this.page.waitForLoadState('networkidle')
  }
}
