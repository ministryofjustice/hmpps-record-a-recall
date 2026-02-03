import { expect, type Locator, type Page } from '@playwright/test'
import AbstractPage from './abstractPage'

export default class RevocationDatePage extends AbstractPage {
  readonly dayInput: Locator

  readonly monthInput: Locator

  readonly yearInput: Locator

  readonly continueButton: Locator

  readonly header: Locator

  private constructor(page: Page) {
    super(page)

    // Header check
    this.header = page.locator('h1', { hasText: 'Enter the date of revocation' })

    // Inputs
    this.dayInput = page.locator('[name=revocationDate-day]')
    this.monthInput = page.locator('[name=revocationDate-month]')
    this.yearInput = page.locator('[name=revocationDate-year]')

    // Continue button
    this.continueButton = page.getByTestId('continue-btn')
  }

  // verify page is loaded
  static async verifyOnPage(page: Page): Promise<RevocationDatePage> {
    const revocationPage = new RevocationDatePage(page)
    await expect(revocationPage.header).toBeVisible()
    return revocationPage
  }

  // Fill in revocation date fields (yyyy-mm-dd)
  async enterRevocationDate(date: string): Promise<this> {
    const [year, month, day] = date.split('-')

    await this.dayInput.fill(day)
    await this.monthInput.fill(month)
    await this.yearInput.fill(year)

    return this
  }

  // Click the continue button
  async clickContinue(): Promise<this> {
    await this.continueButton.click()
    return this
  }
}
