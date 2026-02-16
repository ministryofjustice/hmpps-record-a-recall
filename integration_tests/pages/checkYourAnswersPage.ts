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
    const checkYourAnswersPage = new CheckYourAnswersPage(page)
    await expect(checkYourAnswersPage.header).toBeVisible()
    return checkYourAnswersPage
  }

  async confirmRecall() {
    await this.continueButton.click()
  }
}
