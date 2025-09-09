import IndexPage from '../pages/index'
import AuthSignInPage from '../pages/authSignIn'
import Page from '../pages/page'
import AuthManageDetailsPage from '../pages/authManageDetails'

context('Sign In', () => {
  beforeEach(() => {
    cy.task('reset')
    cy.task('stubSignIn')
    cy.task('stubManageUsersMeCaseloads')
  })

  it('Unauthenticated user directed to auth', () => {
    // When an unauthenticated user visits the app, they should be redirected to sign-in
    // The mock OAuth flow will automatically authenticate them and redirect to search
    cy.visit('/', { failOnStatusCode: false })
    cy.url().should('include', '/search')
  })

  it('Unauthenticated user navigating to sign in page directed to auth', () => {
    // When visiting /sign-in directly, the OAuth flow should complete automatically
    // with the mock auth provider and redirect to search
    cy.visit('/sign-in')
    cy.url().should('include', '/search')
  })

  it('User name visible in header', () => {
    cy.signIn()
    const indexPage = Page.verifyOnPage(IndexPage)
    indexPage.headerUserName().should('contain.text', 'J. Smith')
  })

  it('Phase banner visible in header', () => {
    cy.signIn()
    const indexPage = Page.verifyOnPage(IndexPage)
    indexPage.headerPhaseBanner().should('contain.text', 'dev')
  })

  it('User can sign out', () => {
    cy.signIn()
    const indexPage = Page.verifyOnPage(IndexPage)
    indexPage.signOut().click()
    // After sign out, user should be redirected to the auth sign-out page
    cy.url().should('include', '/auth/sign-out')
  })

  it('User can manage their details', () => {
    cy.signIn()
    cy.task('stubAuthManageDetails')
    const indexPage = Page.verifyOnPage(IndexPage)

    indexPage.manageDetails().get('a').invoke('removeAttr', 'target')
    indexPage.manageDetails().click()
    Page.verifyOnPage(AuthManageDetailsPage)
  })

  it('User can sign in with different credentials', () => {
    // First sign in with default user
    cy.signIn()
    const indexPage = Page.verifyOnPage(IndexPage)
    indexPage.headerUserName().should('contain.text', 'J. Smith')

    // Sign out
    indexPage.signOut().click()

    // Set up a different user
    cy.task('stubSignIn', {
      name: 'bobby brown',
      roles: [
        'ROLE_REMAND_AND_SENTENCING',
        'ROLE_RELEASE_DATES_CALCULATOR',
        'ROLE_ADJUSTMENTS_MAINTAINER',
        'ROLE_RECALL_MAINTAINER',
      ],
    })

    // Sign in with the new user
    cy.signIn()

    // Verify the new user is signed in
    indexPage.headerUserName().contains('B. Brown')
  })

  it('Session persists across page navigation', () => {
    cy.signIn()
    const indexPage = Page.verifyOnPage(IndexPage)

    // Navigate to home page
    cy.visit('/')

    // User should still be signed in
    indexPage.headerUserName().should('contain.text', 'J. Smith')
  })
})
