import { expect, type Locator, type Page } from '@playwright/test'
import AbstractPage from './abstractPage'

export default class ManualStartInterceptPage extends AbstractPage {
  readonly header: Locator

  readonly continueButton: Locator

  private constructor(page: Page) {
    super(page)

    this.header = page.getByRole('heading', { name: 'Select all sentences that had an outstanding SLED or LED' })
    this.continueButton = page.locator('[data-qa="continue-manual-action"]')
  }

  static async verifyOnPage(page: Page): Promise<ManualStartInterceptPage> {
    const manualStartInterceptPage = new ManualStartInterceptPage(page)
    await expect(manualStartInterceptPage.header).toBeVisible()
    return manualStartInterceptPage
  }

  async clickContinue() {
    await this.continueButton.click()
  }
}
