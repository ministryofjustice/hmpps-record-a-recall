import { expect, type Locator, type Page } from '@playwright/test'
import AbstractPage from './abstractPage'

// export default class SelectRecallTypePage extends AbstractPage {
//   readonly header: Locator
//   readonly firstRecallTypeOption: Locator
//   readonly continueButton: Locator

//   private constructor(page: Page) {
//     super(page)

//     // this.header = page.locator('h1', { hasText: 'Select the type of recall' })
//      this.header = page.locator('[data-qa="select-recall-type"]')

//     this.firstRecallTypeOption = page.locator('[name=recallType]').first()

//     this.continueButton = page.locator('[id=submit]')
//   }

//   static async verifyOnPage(page: Page): Promise<SelectRecallTypePage> {
//     const p = new SelectRecallTypePage(page)
//     await expect(p.header).toBeVisible()
//     return p
//   }

//   async selectRecallType(): Promise<this> {
//     await this.firstRecallTypeOption.check()
//     return this
//   }

//   async clickContinue(): Promise<this> {
//     await this.continueButton.click()
//     return this
//   }
// }

export default class SelectRecallTypePage extends AbstractPage {
  readonly header: Locator
  readonly standardRecallOption: Locator
  readonly continueButton: Locator

  private constructor(page: Page) {
    super(page)

    // Use the unique data-qa attribute for the header
    this.header = page.locator('[data-qa="select-recall-type"]')

    // Select the "Standard Recall" radio explicitly
    this.standardRecallOption = page.getByRole('radio', { name: 'Standard Recall' })

    // Continue button
    this.continueButton = page.locator('#submit')
  }

  static async verifyOnPage(page: Page): Promise<SelectRecallTypePage> {
    const p = new SelectRecallTypePage(page)
    await p.header.waitFor({ state: 'visible', timeout: 5000 })
    await expect(p.header).toBeVisible()
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
