import { expect, type Locator, type Page } from '@playwright/test'
import AbstractPage from './abstractPage'

export default class ManualSelectCourtCasesPage extends AbstractPage {
  readonly header: Locator

  readonly yesRadio: Locator

  readonly continueButton: Locator

  private constructor(page: Page) {
    super(page)

    this.header = page.getByRole('heading', { name: 'Select all cases that have an outstanding SLED or LED' })
    this.yesRadio = page.locator('[data-qa="yes-radio"]')
    this.continueButton = page.locator('[data-qa="continue-btn"]')
  }

  static async verifyOnPage(page: Page): Promise<ManualSelectCourtCasesPage> {
    const selectCourtCasesPage = new ManualSelectCourtCasesPage(page)
    await expect(selectCourtCasesPage.header).toBeVisible()
    return selectCourtCasesPage
  }

  async selectYes() {
    await this.yesRadio.check()
  }

  async clickContinue() {
    await this.continueButton.click()
  }
}
