import { expect, type Locator, type Page } from '@playwright/test'
import AbstractPage from './abstractPage'

export default class CriticalErrorInterceptPage extends AbstractPage {
  readonly header: Locator

  readonly validationMessage: Locator

  private constructor(page: Page) {
    super(page)

    this.header = page.locator('[data-qa="critical-intercept-heading"]')
    this.validationMessage = page.locator('[data-qa="validation-message"]')
  }

  static async verifyOnPage(page: Page): Promise<CriticalErrorInterceptPage> {
    const criticalErrorInterceptPage = new CriticalErrorInterceptPage(page)
    await expect(criticalErrorInterceptPage.header).toBeVisible()
    return criticalErrorInterceptPage
  }

  async verifyMessages(message: string) {
    await expect(this.validationMessage).toContainText(message)
  }
}
