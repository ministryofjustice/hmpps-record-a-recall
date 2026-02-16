import { expect, type Locator, type Page } from '@playwright/test'
import AbstractPage from './abstractPage'

export default class CheckYourAnswersPage extends AbstractPage {
  readonly header: Locator

  readonly continueButton: Locator

  private constructor(page: Page) {
    super(page)

    this.header = page.locator('h1', { hasText: 'Check your answers' })

    this.continueButton = page.locator('[id=submit]')
  }

  static async verifyOnPage(page: Page): Promise<CheckYourAnswersPage> {
    const p = new CheckYourAnswersPage(page)
    await expect(p.header).toBeVisible()
    return p
  }

  async confirmRecall(): Promise<this> {
    await this.continueButton.click()
    return this
  }
}
