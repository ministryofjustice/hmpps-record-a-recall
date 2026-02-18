import { expect, type Locator, type Page } from '@playwright/test'
import AbstractPage from './abstractPage'

export default class ReturnToCustodyDatePage extends AbstractPage {
  readonly yesRadio: Locator

  readonly noRadio: Locator

  readonly dayInput: Locator

  readonly monthInput: Locator

  readonly yearInput: Locator

  readonly continueButton: Locator

  readonly header: Locator

  private constructor(page: Page) {
    super(page)

    this.header = page.locator('h1', { hasText: 'Was' })

    this.yesRadio = page.locator('input#inCustodyAtRecall-true')
    this.noRadio = page.locator('input#inCustodyAtRecall-false')

    this.dayInput = page.locator('[name=returnToCustodyDate-day]')
    this.monthInput = page.locator('[name=returnToCustodyDate-month]')
    this.yearInput = page.locator('[name=returnToCustodyDate-year]')

    this.continueButton = page.locator('#submit')
  }

  static async verifyOnPage(page: Page): Promise<ReturnToCustodyDatePage> {
    const returnToCustodyDatePage = new ReturnToCustodyDatePage(page)
    await expect(returnToCustodyDatePage.header).toBeVisible()
    return returnToCustodyDatePage
  }

  async selectYes() {
    await this.yesRadio.click()
  }

  async clickContinue() {
    await this.continueButton.click()
  }
}
