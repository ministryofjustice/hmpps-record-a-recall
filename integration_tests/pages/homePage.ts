import { expect, type Locator, type Page } from '@playwright/test'
import AbstractPage from './abstractPage'

export default class HomePage extends AbstractPage {
  readonly header: Locator

  readonly headerUserName: Locator

  readonly headerPhaseBanner: Locator

  readonly createNewRecallButton: Locator

  private constructor(page: Page) {
    super(page)

    // Header element: precise selector for <h1 class="govuk-heading-xl">Recalls</h1>
    this.header = page.locator('h1.govuk-heading-xl', { hasText: 'Recalls' })

    // Header elements in the banner
    this.headerUserName = page.getByTestId('header-user-name')
    this.headerPhaseBanner = page.getByTestId('header-phase-banner')

    // "Record a recall" button
    this.createNewRecallButton = page.getByTestId('Record a recall')
  }

  /** Verify the page has loaded by checking the header */
  static async verifyOnPage(page: Page): Promise<HomePage> {
    const homePage = new HomePage(page)
    await expect(homePage.header).toBeVisible({ timeout: 10000 })
    return homePage
  }
}
