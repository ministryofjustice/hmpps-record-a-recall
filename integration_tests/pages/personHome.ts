import Page, { PageElement } from './page'

export default class PersonHome extends Page {
  constructor() {
    super('Recalls')
  }

  public static goTo(prisonerId: string): PersonHome {
    cy.visit(`/person/${prisonerId}`)
    return new PersonHome()
  }

  headerUserName = (): PageElement => cy.get('[data-qa=header-user-name]')

  headerPhaseBanner = (): PageElement => cy.get('[data-qa=header-phase-banner]')

  public createNewRecallButton(): PageElement {
    return cy.get(`[data-qa=create-new-recall-btn]`)
  }

  public clickEditLink(recvocationDate: string): PageElement {
    return cy.findByRole('link', { name: `Edit recall recorded on ${recvocationDate}` })
  }
}
