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

    this.header = page.locator('h1', { hasText: 'Was' }) // partial match for page heading

    this.yesRadio = page.locator('input#inCustodyAtRecall-true')
    this.noRadio = page.locator('input#inCustodyAtRecall-false')

    // Return to custody date inputs (conditional on No)
    this.dayInput = page.locator('[name=returnToCustodyDate-day]')
    this.monthInput = page.locator('[name=returnToCustodyDate-month]')
    this.yearInput = page.locator('[name=returnToCustodyDate-year]')

    this.continueButton = page.locator('#submit')
  }

  static async verifyOnPage(page: Page): Promise<ReturnToCustodyDatePage> {
    const p = new ReturnToCustodyDatePage(page)
    await expect(p.header).toBeVisible()
    return p
  }

  selectYes(): this {
    this.yesRadio.check()
    return this
  }

  selectNo(): this {
    this.noRadio.check()
    return this
  }

  async enterReturnToCustodyDate(date: string): Promise<this> {
    const [year, month, day] = date.split('-')
    await this.dayInput.fill(day)
    await this.monthInput.fill(month)
    await this.yearInput.fill(year)
    return this
  }

  async clickContinue(): Promise<this> {
    await this.continueButton.click()
    return this
  }
}
