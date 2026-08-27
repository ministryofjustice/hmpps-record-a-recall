import { expect, type Locator, type Page } from '@playwright/test'
import AbstractPage from './abstractPage'

export default class CheckSentencesPage extends AbstractPage {
  readonly header: Locator

  readonly confirmAndContinueButton: Locator

  readonly manualSelectCasesLink: Locator

  private constructor(page: Page) {
    super(page)

    this.header = page.locator('[data-qa="check-sentences-heading"]')
    this.confirmAndContinueButton = page.locator('[data-qa=confirm-and-continue-btn]')
    this.manualSelectCasesLink = page.locator('[data-qa="manual-select-cases-link"]')
  }

  static async verifyOnPage(page: Page): Promise<CheckSentencesPage> {
    const checkSentencesPage = new CheckSentencesPage(page)
    await expect(checkSentencesPage.header).toBeVisible()
    return checkSentencesPage
  }

  async confirmAndContinue() {
    await this.confirmAndContinueButton.click()
  }

  async clickManualSelectCases() {
    await this.manualSelectCasesLink.click()
  }
}
