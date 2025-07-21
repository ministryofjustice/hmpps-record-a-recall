// export type PageElement = Cypress.Chainable<JQuery>

// export default abstract class Page {
//   static verifyOnPage<T>(constructor: new (...args: unknown[]) => T, ...args: unknown[]): T {
//     return new constructor(args)
//   }

//   constructor(private readonly title: string) {
//     // this.checkOnPage()
//   }

//   checkOnPage(): void {
//     cy.get('legend').contains(this.title)
//   }

//   signOut = (): PageElement => cy.get('[data-qa=signOut]')

//   manageDetails = (): PageElement => cy.get('[data-qa=manageDetails]')
// }
export type PageElement = Cypress.Chainable<JQuery>

export default abstract class Page {
  static verifyOnPage<T>(constructor: new () => T): T {
    return new constructor()
  }

  constructor(protected readonly title: string) {
    this.checkOnPage()
  }

  protected checkOnPage(): void {
    cy.get('h1, legend, [data-qa=page-title]', { timeout: 10000 }).contains(this.title)
  }

  signOut = (): PageElement => cy.get('[data-qa=signOut]')
  manageDetails = (): PageElement => cy.get('[data-qa=manageDetails]')
}
