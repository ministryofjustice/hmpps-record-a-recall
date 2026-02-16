import { expect, type Locator, type Page } from '@playwright/test'
import AbstractPage from './abstractPage'

export default class SelectRecallTypePage extends AbstractPage {
  readonly header: Locator

  readonly standardRecallOption: Locator

  readonly continueButton: Locator

  private constructor(page: Page) {
    super(page)

    // Target only the main page heading (not the fieldset legend)
    this.header = page.locator('h1.govuk-heading-l', {
      hasText: 'Select the type of recall',
    })

    this.standardRecallOption = page.getByRole('radio', {
      name: /standard/i,
    })

    this.continueButton = page.getByRole('button', {
      name: /continue/i,
    })
  }

  static async verifyOnPage(page: Page): Promise<SelectRecallTypePage> {
    const p = new SelectRecallTypePage(page)

    await page.waitForLoadState('networkidle')

    await expect(p.header).toBeVisible({ timeout: 10000 })

    return p
  }

  async selectStandardRecall(): Promise<this> {
    await this.standardRecallOption.check()
    return this
  }

  async clickContinue(): Promise<this> {
    await this.continueButton.click()
    return this
  }
}
