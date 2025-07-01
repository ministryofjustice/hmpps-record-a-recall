import PersonHome from '../pages/personHome'
import RevocationDatePage from '../pages/Journey/revocationDatePage'

context('Recall overlap validation', () => {
  const nomsId = 'A1234AB'
  const prisonerDetails = {
    nomsNumber: nomsId,
    firstName: 'John',
    lastName: 'Doe',
    bookingId: 123456,
  }

  beforeEach(() => {
    cy.task('reset')
    cy.task('stubSignIn')
    cy.task('stubManageUsersMeCaseloads')
    cy.task('stubPrisonerSearch', { prisonerDetails })
    cy.task('stubRecordARecallCRDS')
    cy.task('stubSentencesAndOffences')
    cy.task('stubGetCalculationBreakdown')
    cy.task('stubGetCourtsByIds')
    cy.task('stubSearchCourtCases', { sortBy: 'desc' })
    cy.task('stubNomisMapping')
  })

  describe('AC1 & AC2: Revocation date overlap validation', () => {
    it('should prevent entering a revocation date that overlaps with an existing recall period', () => {
      // Setup: Mock existing 14-day FTR recall (already in prison)
      const existingRecalls = [
        {
          recallId: 'existing-ftr-123',
          createdAt: '2024-01-01T00:00:00.000Z',
          revocationDate: '2024-01-15T00:00:00.000Z',
          returnToCustodyDate: '2024-01-15T00:00:00.000Z', // Same date = already in prison
          recallType: {
            code: 'FTR_14',
            description: '14-day fixed term',
            fixedTerm: true,
          },
          location: 'BWI',
          locationName: 'HMP Berwyn',
          sentenceIds: ['sentence-123'],
          courtCaseIds: ['case-456'],
        },
      ]

      cy.task('stubExistingRecalls', { recalls: existingRecalls })
      cy.signIn()

      // Navigate to revocation date page
      const personPage = PersonHome.goTo(nomsId)
      personPage.createNewRecallButton().click()
      cy.url().should('include', `/person/${nomsId}/record-recall/revocation-date`)

      // Test overlapping date (within 14 days of existing FTR)
      const revocationPage = RevocationDatePage.verifyOnPage<RevocationDatePage>(
        RevocationDatePage,
        'Enter the date of revocation',
      )

      // Enter date that overlaps with existing 14-day FTR (10 days after)
      revocationPage.enterRevocationDate('2024-01-25') // 10 days after existing recall
      revocationPage.continueButton().click()

      // Should show validation error
      cy.get('.govuk-error-summary').should('be.visible')
      cy.get('.govuk-error-summary').should('contain', 'overlaps with an existing recall period')
      cy.url().should('include', `/person/${nomsId}/record-recall/revocation-date`)
    })

    it('should allow dates outside the FTR overlap period', () => {
      // Setup: Mock existing 14-day FTR recall
      const existingRecalls = [
        {
          recallId: 'existing-ftr-123',
          createdAt: '2024-01-01T00:00:00.000Z',
          revocationDate: '2024-01-15T00:00:00.000Z',
          returnToCustodyDate: '2024-01-15T00:00:00.000Z',
          recallType: {
            code: 'FTR_14',
            description: '14-day fixed term',
            fixedTerm: true,
          },
          location: 'BWI',
          locationName: 'HMP Berwyn',
          sentenceIds: ['sentence-123'],
          courtCaseIds: ['case-456'],
        },
      ]

      cy.task('stubExistingRecalls', { recalls: existingRecalls })
      cy.signIn()

      const personPage = PersonHome.goTo(nomsId)
      personPage.createNewRecallButton().click()

      const revocationPage = RevocationDatePage.verifyOnPage<RevocationDatePage>(
        RevocationDatePage,
        'Enter the date of revocation',
      )

      // Enter date outside 14-day period (16 days after)
      revocationPage.enterRevocationDate('2024-01-31') // 16 days after existing recall
      revocationPage.continueButton().click()

      // Should proceed to next step
      cy.url().should('include', `/person/${nomsId}/record-recall/rtc-date`)
    })
  })

  describe('AC3 & AC4: FTR overlap with UAL (not in prison)', () => {
    it('should prevent overlap with return to custody date when offender was not in prison', () => {
      // Setup: Mock existing 14-day FTR with UAL (not in prison)
      const existingRecalls = [
        {
          recallId: 'existing-ftr-123',
          createdAt: '2024-01-01T00:00:00.000Z',
          revocationDate: '2024-01-15T00:00:00.000Z',
          returnToCustodyDate: '2024-01-18T00:00:00.000Z', // 3 days later
          ual: {
            firstDay: '2024-01-16T00:00:00.000Z',
            lastDay: '2024-01-17T00:00:00.000Z',
            days: 2,
          },
          recallType: {
            code: 'FTR_14',
            description: '14-day fixed term',
            fixedTerm: true,
          },
          location: 'BWI',
          locationName: 'HMP Berwyn',
          sentenceIds: ['sentence-123'],
          courtCaseIds: ['case-456'],
        },
      ]

      cy.task('stubExistingRecalls', { recalls: existingRecalls })
      cy.signIn()

      const personPage = PersonHome.goTo(nomsId)
      personPage.createNewRecallButton().click()

      const revocationPage = RevocationDatePage.verifyOnPage<RevocationDatePage>(
        RevocationDatePage,
        'Enter the date of revocation',
      )

      // Enter date within 14 days of return to custody date
      revocationPage.enterRevocationDate('2024-01-28') // 10 days after RTC date
      revocationPage.continueButton().click()

      // Should show validation error
      cy.get('.govuk-error-summary').should('be.visible')
      cy.get('.govuk-error-summary').should('contain', 'overlaps with an existing recall period')
    })
  })

  describe('AC5 & AC11: Revocation date on or before existing recall', () => {
    it('should prevent entering a revocation date on or before existing recall', () => {
      // Setup: Mock existing standard recall
      const existingRecalls = [
        {
          recallId: 'existing-standard-123',
          createdAt: '2024-01-01T00:00:00.000Z',
          revocationDate: '2024-01-20T00:00:00.000Z',
          returnToCustodyDate: '2024-01-20T00:00:00.000Z',
          recallType: {
            code: 'LR',
            description: 'Standard',
            fixedTerm: false,
          },
          location: 'BWI',
          locationName: 'HMP Berwyn',
          sentenceIds: ['sentence-123'],
          courtCaseIds: ['case-456'],
        },
      ]

      cy.task('stubExistingRecalls', { recalls: existingRecalls })
      cy.signIn()

      const personPage = PersonHome.goTo(nomsId)
      personPage.createNewRecallButton().click()

      const revocationPage = RevocationDatePage.verifyOnPage<RevocationDatePage>(
        RevocationDatePage,
        'Enter the date of revocation',
      )

      // Test same date
      revocationPage.enterRevocationDate('2024-01-20') // Same as existing recall
      revocationPage.continueButton().click()

      // Should show validation error
      cy.get('.govuk-error-summary').should('be.visible')
      cy.get('.govuk-error-summary').should('contain', 'cannot be on or before an existing recall')

      // Test earlier date
      revocationPage.enterRevocationDate('2024-01-19') // Before existing recall
      revocationPage.continueButton().click()

      // Should still show validation error
      cy.get('.govuk-error-summary').should('be.visible')
      cy.get('.govuk-error-summary').should('contain', 'cannot be on or before an existing recall')
    })

    it('should allow revocation date after existing recall', () => {
      // Setup: Mock existing standard recall
      const existingRecalls = [
        {
          recallId: 'existing-standard-123',
          createdAt: '2024-01-01T00:00:00.000Z',
          revocationDate: '2024-01-20T00:00:00.000Z',
          returnToCustodyDate: '2024-01-20T00:00:00.000Z',
          recallType: {
            code: 'LR',
            description: 'Standard',
            fixedTerm: false,
          },
          location: 'BWI',
          locationName: 'HMP Berwyn',
          sentenceIds: ['sentence-123'],
          courtCaseIds: ['case-456'],
        },
      ]

      cy.task('stubExistingRecalls', { recalls: existingRecalls })
      cy.signIn()

      const personPage = PersonHome.goTo(nomsId)
      personPage.createNewRecallButton().click()

      const revocationPage = RevocationDatePage.verifyOnPage<RevocationDatePage>(
        RevocationDatePage,
        'Enter the date of revocation',
      )

      // Enter date after existing recall
      revocationPage.enterRevocationDate('2024-01-25') // 5 days after existing recall
      revocationPage.continueButton().click()

      // Should proceed to next step
      cy.url().should('include', `/person/${nomsId}/record-recall/rtc-date`)
    })
  })

  describe('AC6: Edit mode validation', () => {
    it('should exclude current recall from validation when editing', () => {
      const currentRecallId = 'current-recall-123'

      // Setup: Mock current recall being edited and another existing recall
      const existingRecalls = [
        {
          recallId: currentRecallId,
          createdAt: '2024-01-01T00:00:00.000Z',
          revocationDate: '2024-01-20T00:00:00.000Z',
          returnToCustodyDate: '2024-01-20T00:00:00.000Z',
          recallType: {
            code: 'LR',
            description: 'Standard',
            fixedTerm: false,
          },
          location: 'BWI',
          locationName: 'HMP Berwyn',
          sentenceIds: ['sentence-123'],
          courtCaseIds: ['case-456'],
        },
        {
          recallId: 'other-recall-456',
          createdAt: '2024-01-05T00:00:00.000Z',
          revocationDate: '2024-01-25T00:00:00.000Z',
          returnToCustodyDate: '2024-01-25T00:00:00.000Z',
          recallType: {
            code: 'LR',
            description: 'Standard',
            fixedTerm: false,
          },
          location: 'BWI',
          locationName: 'HMP Berwyn',
          sentenceIds: ['sentence-456'],
          courtCaseIds: ['case-789'],
        },
      ]

      cy.task('stubExistingRecalls', { recalls: existingRecalls })
      cy.task('stubEditRecall', { recallId: currentRecallId })
      cy.signIn()

      // Navigate to edit mode for revocation date
      cy.visit(`/person/${nomsId}/recall/${currentRecallId}/edit/revocation-date`)

      const revocationPage = RevocationDatePage.verifyOnPage<RevocationDatePage>(
        RevocationDatePage,
        'Enter the date of revocation',
      )

      // Enter same date as current recall - should be allowed in edit mode
      revocationPage.enterRevocationDate('2024-01-20')
      revocationPage.continueButton().click()

      // Should proceed (current recall excluded from validation)
      cy.url().should('not.include', 'revocation-date') // Should move to next step

      // Navigate back to test validation against other recall
      cy.visit(`/person/${nomsId}/recall/${currentRecallId}/edit/revocation-date`)

      // Enter date that conflicts with other existing recall
      revocationPage.enterRevocationDate('2024-01-25') // Same as other recall
      revocationPage.continueButton().click()

      // Should show validation error (other recall not excluded)
      cy.get('.govuk-error-summary').should('be.visible')
      cy.get('.govuk-error-summary').should('contain', 'cannot be on or before an existing recall')
    })
  })

  describe('28-day FTR validation', () => {
    it('should prevent overlap with 28-day FTR period', () => {
      // Setup: Mock existing 28-day FTR recall
      const existingRecalls = [
        {
          recallId: 'existing-ftr28-123',
          createdAt: '2024-01-01T00:00:00.000Z',
          revocationDate: '2024-01-15T00:00:00.000Z',
          returnToCustodyDate: '2024-01-15T00:00:00.000Z',
          recallType: {
            code: 'FTR_28',
            description: '28-day fixed term',
            fixedTerm: true,
          },
          location: 'BWI',
          locationName: 'HMP Berwyn',
          sentenceIds: ['sentence-123'],
          courtCaseIds: ['case-456'],
        },
      ]

      cy.task('stubExistingRecalls', { recalls: existingRecalls })
      cy.signIn()

      const personPage = PersonHome.goTo(nomsId)
      personPage.createNewRecallButton().click()

      const revocationPage = RevocationDatePage.verifyOnPage<RevocationDatePage>(
        RevocationDatePage,
        'Enter the date of revocation',
      )

      // Enter date within 28-day period (20 days after)
      revocationPage.enterRevocationDate('2024-02-04') // 20 days after existing recall
      revocationPage.continueButton().click()

      // Should show validation error
      cy.get('.govuk-error-summary').should('be.visible')
      cy.get('.govuk-error-summary').should('contain', 'overlaps with an existing recall period')
    })

    it('should allow dates outside 28-day FTR period', () => {
      // Setup: Mock existing 28-day FTR recall
      const existingRecalls = [
        {
          recallId: 'existing-ftr28-123',
          createdAt: '2024-01-01T00:00:00.000Z',
          revocationDate: '2024-01-15T00:00:00.000Z',
          returnToCustodyDate: '2024-01-15T00:00:00.000Z',
          recallType: {
            code: 'FTR_28',
            description: '28-day fixed term',
            fixedTerm: true,
          },
          location: 'BWI',
          locationName: 'HMP Berwyn',
          sentenceIds: ['sentence-123'],
          courtCaseIds: ['case-456'],
        },
      ]

      cy.task('stubExistingRecalls', { recalls: existingRecalls })
      cy.signIn()

      const personPage = PersonHome.goTo(nomsId)
      personPage.createNewRecallButton().click()

      const revocationPage = RevocationDatePage.verifyOnPage<RevocationDatePage>(
        RevocationDatePage,
        'Enter the date of revocation',
      )

      // Enter date outside 28-day period (30 days after)
      revocationPage.enterRevocationDate('2024-02-14') // 30 days after existing recall
      revocationPage.continueButton().click()

      // Should proceed to next step
      cy.url().should('include', `/person/${nomsId}/record-recall/rtc-date`)
    })
  })

  describe('Multiple recalls validation', () => {
    it('should validate against all existing recalls', () => {
      // Setup: Multiple existing recalls
      const existingRecalls = [
        {
          recallId: 'recall-1',
          createdAt: '2024-01-01T00:00:00.000Z',
          revocationDate: '2024-01-15T00:00:00.000Z',
          returnToCustodyDate: '2024-01-15T00:00:00.000Z',
          recallType: { code: 'FTR_14', description: '14-day fixed term', fixedTerm: true },
          location: 'BWI',
          sentenceIds: ['1'],
          courtCaseIds: ['1'],
        },
        {
          recallId: 'recall-2',
          createdAt: '2024-01-02T00:00:00.000Z',
          revocationDate: '2024-01-25T00:00:00.000Z',
          returnToCustodyDate: '2024-01-25T00:00:00.000Z',
          recallType: { code: 'LR', description: 'Standard', fixedTerm: false },
          location: 'BWI',
          sentenceIds: ['2'],
          courtCaseIds: ['2'],
        },
      ]

      cy.task('stubExistingRecalls', { recalls: existingRecalls })
      cy.signIn()

      const personPage = PersonHome.goTo(nomsId)
      personPage.createNewRecallButton().click()

      const revocationPage = RevocationDatePage.verifyOnPage<RevocationDatePage>(
        RevocationDatePage,
        'Enter the date of revocation',
      )

      // Test date that conflicts with first recall (FTR overlap)
      revocationPage.enterRevocationDate('2024-01-20') // Within 14 days of first recall
      revocationPage.continueButton().click()

      cy.get('.govuk-error-summary').should('be.visible')
      cy.get('.govuk-error-summary').should('contain', 'overlaps with an existing recall period')

      // Test date that conflicts with second recall (on/before rule)
      revocationPage.enterRevocationDate('2024-01-25') // Same as second recall
      revocationPage.continueButton().click()

      cy.get('.govuk-error-summary').should('be.visible')
      cy.get('.govuk-error-summary').should('contain', 'cannot be on or before an existing recall')
    })
  })

  describe('No existing recalls', () => {
    it('should proceed normally when no existing recalls', () => {
      cy.task('stubExistingRecalls', { recalls: [] })
      cy.signIn()

      const personPage = PersonHome.goTo(nomsId)
      personPage.createNewRecallButton().click()

      const revocationPage = RevocationDatePage.verifyOnPage<RevocationDatePage>(
        RevocationDatePage,
        'Enter the date of revocation',
      )

      revocationPage.enterRevocationDate('2024-01-20')
      revocationPage.continueButton().click()

      // Should proceed to next step
      cy.url().should('include', `/person/${nomsId}/record-recall/rtc-date`)
    })
  })
})
