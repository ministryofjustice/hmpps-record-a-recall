import { expect, type Locator, type Page } from '@playwright/test'
import AbstractPage from './abstractPage'

export default class ConfirmationPage extends AbstractPage {
  readonly successMessage: Locator

  private constructor(page: Page) {
    super(page)

    this.successMessage = page.locator('[data-qa=success-message]')
  }

  static async verifyOnPage(page: Page): Promise<ConfirmationPage> {
    const confirmationPage = new ConfirmationPage(page)
    await expect(confirmationPage.successMessage).toBeVisible()
    return confirmationPage
  }

  async verifySuccessMessage(message: string) {
    await expect(this.successMessage).toContainText(message)
  }
}
