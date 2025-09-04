Cypress.Commands.add('signIn', (options = { failOnStatusCode: false }) => {
  // With CYPRESS=true set, we can directly visit the callback URL
  // This will authenticate us without going through the full OAuth flow
  cy.visit('/sign-in/callback?code=test&state=test', options)

  // Should be redirected to search page after authentication
  cy.url().should('include', '/search', { timeout: 5000 })
})
