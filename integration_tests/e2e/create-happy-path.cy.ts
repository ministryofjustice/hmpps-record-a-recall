import PersonHome from '../pages/personHome'

context('Create recall happy path', () => {
  beforeEach(() => {
    cy.task('reset')
    cy.task('stubSignIn')
    cy.task('stubManageUsersMeCaseloads')
    cy.task('stubPrisonerSearch')
    // cy.task('stubUserRecall')
  })

  it('Click Create Recall Button', () => {
    cy.signIn()
    const personPage = PersonHome.goTo('ABC1234')
    personPage.createNewRecallButton().click()
    cy.url().should('include', '/person/ABC1234/record-recall/revocation-date')
    // personPage.headerUserName().should('contain.text', 'J. Smith')
  })
})
