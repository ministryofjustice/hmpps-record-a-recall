import { expect, type Locator, type Page } from '@playwright/test'
import AbstractPage from './abstractPage'

export default class LandingPage extends AbstractPage {
  readonly header: Locator

  private constructor(page: Page) {
    super(page)
    this.header = page.locator('h1', { hasText: 'This site is under construction...' })
  }

  static async verifyOnPage(page: Page): Promise<LandingPage> {
    const homePage = new LandingPage(page)
    await expect(homePage.header).toBeVisible()
    return homePage
  }
}
