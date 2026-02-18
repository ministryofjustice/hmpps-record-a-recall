import { expect, type Locator, type Page } from '@playwright/test'
import AbstractPage from './abstractPage'

export default class SelectRecallTypePage extends AbstractPage {
  readonly header: Locator

  readonly standardRecallOption: Locator

  readonly continueButton: Locator

  private constructor(page: Page) {
    super(page)

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
    const selectRecallTypePage = new SelectRecallTypePage(page)

    await page.waitForLoadState('networkidle')

    await expect(selectRecallTypePage.header).toBeVisible()

    return selectRecallTypePage
  }

  async selectStandardRecall() {
    await this.standardRecallOption.check()
  }

  async clickContinue() {
    await this.continueButton.click()
  }
}
