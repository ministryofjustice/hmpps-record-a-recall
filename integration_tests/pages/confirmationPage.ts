import { expect, type Locator, type Page } from '@playwright/test'
import AbstractPage from './abstractPage'

export default class ConfirmationPage extends AbstractPage {
  readonly successMessage: Locator

  private constructor(page: Page) {
    super(page)

    this.successMessage = page.locator('[data-qa=success-message]')
  }

  static async verifyOnPage(page: Page): Promise<ConfirmationPage> {
    const p = new ConfirmationPage(page)
    await expect(p.successMessage).toBeVisible()
    return p
  }

  async verifySuccessMessage(message: string): Promise<this> {
    await expect(this.successMessage).toHaveText(message)
    return this
  }
}
