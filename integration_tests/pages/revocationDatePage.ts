import { expect, type Locator, type Page } from '@playwright/test'
import AbstractPage from './abstractPage'

export default class RevocationDatePage extends AbstractPage {
  readonly header: Locator

  readonly dayInput: Locator

  readonly monthInput: Locator

  readonly yearInput: Locator

  readonly continueButton: Locator

  private constructor(page: Page) {
    super(page)

    this.header = page.locator('h1.govuk-heading-l', {
      hasText: 'Enter the date of revocation',
    })

    this.dayInput = page.locator('input[name="day"]')
    this.monthInput = page.locator('input[name="month"]')
    this.yearInput = page.locator('input[name="year"]')

    this.continueButton = page.locator('#submit')
  }

  static async verifyOnPage(page: Page): Promise<RevocationDatePage> {
    const revocationPage = new RevocationDatePage(page)
    await expect(revocationPage.header).toBeVisible()
    return revocationPage
  }

  async enterRevocationDate(year: string, month: string, day: string) {
    await this.dayInput.fill(day)
    await this.monthInput.fill(month)
    await this.yearInput.fill(year)
  }

  async clickContinue() {
    await this.continueButton.click()
  }
}
