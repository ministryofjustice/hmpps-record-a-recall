import { expect, type Locator, type Page } from '@playwright/test'
import AbstractPage from './abstractPage'

export default class HomePage extends AbstractPage {
  readonly header: Locator

  readonly headerUserName: Locator

  readonly headerPhaseBanner: Locator

  readonly createNewRecallButton: Locator

  private constructor(page: Page) {
    super(page)

    this.header = page.locator('h1.govuk-heading-xl', { hasText: 'Recalls' })

    this.headerUserName = page.getByTestId('header-user-name')
    this.headerPhaseBanner = page.getByTestId('header-phase-banner')

    this.createNewRecallButton = page.getByTestId('create-new-recall-btn')
  }

  static async verifyOnPage(page: Page): Promise<HomePage> {
    const homePage = new HomePage(page)
    await expect(homePage.header).toBeVisible()
    return homePage
  }
}
