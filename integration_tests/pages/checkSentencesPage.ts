import { expect, type Locator, type Page } from '@playwright/test'
import AbstractPage from './abstractPage'

export default class CheckSentencesPage extends AbstractPage {
  readonly header: Locator
  readonly confirmAndContinueButton: Locator

  private constructor(page: Page) {
    super(page)

    this.header = page.locator('h1.govuk-heading-xl >> :text-is("Check that the sentences and offences are correct")')

    this.confirmAndContinueButton = page.locator('[data-qa=confirm-and-continue-btn]')
  }

  static async verifyOnPage(page: Page): Promise<CheckSentencesPage> {
    const p = new CheckSentencesPage(page)
    await expect(p.header).toBeVisible({ timeout: 10000 }) // wait up to 10s
    return p
  }

  async confirmAndContinue(): Promise<this> {
    await this.confirmAndContinueButton.click()
    return this
  }
}
