Cypress.Commands.add('signIn', (options = { failOnStatusCode: false }) => {
  // Visit the sign-in page which will redirect to the OAuth provider
  cy.visit('/sign-in', options)

  // The mock auth API will handle the OAuth flow and redirect back
  // We should end up on the search page after successful authentication
  cy.url().should('include', '/search', { timeout: 10000 })
})
