import { expect, type Locator, type Page } from '@playwright/test'
import AbstractPage from './abstractPage'

export default class CriticalValidationSoftBlockPage extends AbstractPage {
  readonly header: Locator

  readonly validationMessage: Locator

  readonly continueButton: Locator

  readonly cancelButton: Locator

  private constructor(page: Page) {
    super(page)

    this.header = page.locator('[data-qa="critical-validation-soft-block-heading"]')
    this.validationMessage = page.locator('[data-qa="validation-message"]')
    this.continueButton = page.locator('[data-qa="continue-btn"]')
    this.cancelButton = page.locator('[data-qa="cancel-btn"]')
  }

  static async verifyOnPage(page: Page): Promise<CriticalValidationSoftBlockPage> {
    const criticalValidationSoftBlockPage = new CriticalValidationSoftBlockPage(page)
    await expect(criticalValidationSoftBlockPage.header).toBeVisible()
    return criticalValidationSoftBlockPage
  }

  async verifyMessages(message: string) {
    await expect(this.validationMessage).toContainText(message)
  }
}
