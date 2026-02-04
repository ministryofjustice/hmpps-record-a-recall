import { expect, type Locator, type Page } from '@playwright/test'
import AbstractPage from './abstractPage'

export default class SelectRecallTypePage extends AbstractPage {
  readonly header: Locator
  readonly firstRecallTypeOption: Locator
  readonly continueButton: Locator

  private constructor(page: Page) {
    super(page)

    this.header = page.locator('h1', { hasText: 'Select the type of recall' })

    this.firstRecallTypeOption = page.locator('[name=recallType]').first()

    this.continueButton = page.locator('[id=submit]')
  }

  static async verifyOnPage(page: Page): Promise<SelectRecallTypePage> {
    const p = new SelectRecallTypePage(page)
    await expect(p.header).toBeVisible()
    return p
  }

  async selectRecallType(): Promise<this> {
    await this.firstRecallTypeOption.check()
    return this
  }

  async clickContinue(): Promise<this> {
    await this.continueButton.click()
    return this
  }
}
