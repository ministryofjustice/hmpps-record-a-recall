import { expect, type Locator, type Page } from '@playwright/test'
import AbstractPage from './abstractPage'

export default class ConfirmCancelPage extends AbstractPage {
  readonly header: Locator

  private constructor(page: Page) {
    super(page)

    this.header = page.locator('[data-qa="main-heading"]')
  }

  static async verifyOnPage(page: Page): Promise<ConfirmCancelPage> {
    const confirmCancelPage = new ConfirmCancelPage(page)
    await expect(confirmCancelPage.header).toBeVisible()
    return confirmCancelPage
  }
}
