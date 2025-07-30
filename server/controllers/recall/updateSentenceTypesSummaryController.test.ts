/* eslint-disable @typescript-eslint/no-explicit-any */

import { jest } from '@jest/globals'
import UpdateSentenceTypesSummaryController from './updateSentenceTypesSummaryController'
import logger from '../../../logger'
import * as formWizardHelper from '../../helpers/formWizardHelper'
import { UpdateSentenceTypesResponse } from '../../@types/remandAndSentencingApi/remandAndSentencingTypes'

jest.mock('../../../logger')

describe('UpdateSentenceTypesSummaryController', () => {
  let req: any
  let res: any
  let next: jest.Mock
  let controller: UpdateSentenceTypesSummaryController

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()

    // Setup request object
    req = {
      sessionModel: {
        get: jest.fn(),
        set: jest.fn(),
        unset: jest.fn(),
      },
      journeyModel: {
        attributes: {
          lastVisited: '/previous-page',
        },
      },
      flash: jest.fn().mockReturnValue([]),
      body: {},
      services: {
        courtCaseService: {
          updateSentenceTypes: jest.fn() as jest.MockedFunction<any>,
        },
      },
    }

    // Setup response object
    res = {
      locals: {
        user: {
          token: 'test-token',
          username: 'test-user',
        },
        nomisId: 'A1234BC',
      },
    }

    next = jest.fn()

    controller = new UpdateSentenceTypesSummaryController({ route: '/update-sentence-types-summary' })

    // Mock the parent class methods
    jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(controller)), 'saveValues').mockImplementation(async () => {
      // Do nothing - just simulate parent method
    })
    jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(controller)), 'get').mockImplementation(async () => {
      // Do nothing - just simulate parent method
    })
    jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(controller)), 'post').mockImplementation(async () => {
      // Do nothing - just simulate parent method
    })
  })

  describe('saveValues', () => {
    it('should successfully update sentence types and clear session data', async () => {
      // Arrange
      const courtCaseUuid = 'court-case-uuid-123'
      const updatedSentenceTypes = {
        'sentence-uuid-1': 'sds-type-uuid',
        'sentence-uuid-2': 'eds-type-uuid',
      }

      req.sessionModel.get.mockImplementation((key: string) => {
        if (key === 'selectedCourtCaseUuid') return courtCaseUuid
        if (key === 'updatedSentenceTypes') return updatedSentenceTypes
        return undefined
      })

      const mockResponse: UpdateSentenceTypesResponse = {
        updatedSentenceUuids: ['sentence-uuid-1', 'sentence-uuid-2'],
      }
      req.services.courtCaseService.updateSentenceTypes.mockResolvedValue(mockResponse)

      // Act
      await controller.saveValues(req, res, next)

      // Assert
      expect(req.services.courtCaseService.updateSentenceTypes).toHaveBeenCalledWith(
        courtCaseUuid,
        {
          updates: [
            { sentenceUuid: 'sentence-uuid-1', sentenceTypeId: 'sds-type-uuid' },
            { sentenceUuid: 'sentence-uuid-2', sentenceTypeId: 'eds-type-uuid' },
          ],
        },
        'test-user',
      )

      expect(req.sessionModel.unset).toHaveBeenCalledWith('updatedSentenceTypes')
      expect(req.sessionModel.unset).toHaveBeenCalledWith('unknownSentencesToUpdate')
      expect(logger.info).toHaveBeenCalledWith('Successfully updated sentence types', {
        courtCaseUuid,
        updatedCount: 2,
      })
      expect(next).not.toHaveBeenCalled()
    })

    it('should skip API call when no sentence updates exist', async () => {
      // Arrange
      req.sessionModel.get.mockImplementation((key: string) => {
        if (key === 'selectedCourtCaseUuid') return 'court-case-uuid'
        if (key === 'updatedSentenceTypes') return {}
        return undefined
      })

      // Act
      await controller.saveValues(req, res, next)

      // Assert
      expect(req.services.courtCaseService.updateSentenceTypes).not.toHaveBeenCalled()
      expect(req.sessionModel.unset).not.toHaveBeenCalled()
      expect(next).not.toHaveBeenCalled()
    })

    it('should skip API call when no court case UUID exists', async () => {
      // Arrange
      req.sessionModel.get.mockImplementation((key: string) => {
        if (key === 'selectedCourtCaseUuid') return undefined
        if (key === 'updatedSentenceTypes') return { 'sentence-1': 'type-1' }
        return undefined
      })

      // Act
      await controller.saveValues(req, res, next)

      // Assert
      expect(req.services.courtCaseService.updateSentenceTypes).not.toHaveBeenCalled()
      expect(next).not.toHaveBeenCalled()
    })

    it('should handle 400 Bad Request error', async () => {
      // Arrange
      const courtCaseUuid = 'court-case-uuid'
      req.sessionModel.get.mockImplementation((key: string) => {
        if (key === 'selectedCourtCaseUuid') return courtCaseUuid
        if (key === 'updatedSentenceTypes') return { 'sentence-1': 'type-1' }
        return undefined
      })

      const error = new Error('Bad Request')
      ;(error as any).status = 400
      req.services.courtCaseService.updateSentenceTypes.mockRejectedValue(error)

      // Act
      await controller.saveValues(req, res, next)

      // Assert
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid sentence type update request',
        }),
      )
    })

    it('should handle 404 Not Found error', async () => {
      // Arrange
      const courtCaseUuid = 'court-case-uuid'
      req.sessionModel.get.mockImplementation((key: string) => {
        if (key === 'selectedCourtCaseUuid') return courtCaseUuid
        if (key === 'updatedSentenceTypes') return { 'sentence-1': 'type-1' }
        return undefined
      })

      const error = new Error('Not Found')
      ;(error as any).status = 404
      req.services.courtCaseService.updateSentenceTypes.mockRejectedValue(error)

      // Act
      await controller.saveValues(req, res, next)

      // Assert
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Court case or sentence not found',
        }),
      )
    })

    it('should handle 422 Unprocessable Entity error', async () => {
      // Arrange
      const courtCaseUuid = 'court-case-uuid'
      req.sessionModel.get.mockImplementation((key: string) => {
        if (key === 'selectedCourtCaseUuid') return courtCaseUuid
        if (key === 'updatedSentenceTypes') return { 'sentence-1': 'type-1' }
        return undefined
      })

      const error = new Error('Unprocessable Entity')
      ;(error as any).status = 422
      req.services.courtCaseService.updateSentenceTypes.mockRejectedValue(error)

      // Act
      await controller.saveValues(req, res, next)

      // Assert
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Unable to update sentence types - business rule violation',
        }),
      )
    })

    it('should handle generic API errors', async () => {
      // Arrange
      const courtCaseUuid = 'court-case-uuid'
      req.sessionModel.get.mockImplementation((key: string) => {
        if (key === 'selectedCourtCaseUuid') return courtCaseUuid
        if (key === 'updatedSentenceTypes') return { 'sentence-1': 'type-1' }
        return undefined
      })

      const error = new Error('Server Error')
      req.services.courtCaseService.updateSentenceTypes.mockRejectedValue(error)

      // Act
      await controller.saveValues(req, res, next)

      // Assert
      expect(logger.error).toHaveBeenCalledWith('Failed to update sentence types', {
        error: 'Server Error',
        courtCaseUuid,
      })
      expect(next).toHaveBeenCalledWith(error)
    })
  })

  describe('get', () => {
    const mockCourtCases = [
      {
        caseId: 'case-1',
        courtName: 'Test Court',
        location: 'Test Location',
        date: '2024-01-01',
        status: 'ACTIVE',
        reference: 'REF001',
        sentenced: true,
        sentences: [
          {
            sentenceId: 'sentence-1',
            sentenceTypeUuid: 'f9a1551e-86b1-425b-96f7-23465a0f05fc', // Unknown sentence
            offenceCode: 'OFF001',
            offenceDescription: 'Test Offence 1',
          },
          {
            sentenceId: 'sentence-2',
            sentenceTypeUuid: 'other-uuid',
            offenceCode: 'OFF002',
            offenceDescription: 'Test Offence 2',
          },
        ],
      },
      {
        caseId: 'case-2',
        courtName: 'Another Court',
        location: 'Another Location',
        date: '2024-02-01',
        status: 'ACTIVE',
        reference: 'REF002',
        sentenced: true,
        sentences: [
          {
            sentenceId: 'sentence-3',
            sentenceTypeUuid: 'f9a1551e-86b1-425b-96f7-23465a0f05fc', // Unknown sentence
            offenceCode: 'OFF003',
            offenceDescription: 'Test Offence 3',
          },
        ],
      },
    ]

    beforeEach(() => {
      // Mock getCourtCaseOptions
      jest.spyOn(formWizardHelper, 'getCourtCaseOptions').mockReturnValue(mockCourtCases)
    })

    it('should correctly identify and group court cases with unknown sentences', async () => {
      // Arrange
      req.sessionModel.get.mockImplementation((key: string) => {
        if (key === 'updatedSentenceTypes') return { 'sentence-1': 'SDS' }
        return undefined
      })

      // Act
      await controller.get(req, res, next)

      // Assert
      expect(res.locals.courtCasesWithUnknownSentences).toHaveLength(2)
      expect(res.locals.totalUnknownSentences).toBe(2) // sentence-1 and sentence-3
      expect(res.locals.totalUpdated).toBe(1) // only sentence-1 is updated
      expect(res.locals.allComplete).toBe(false)
      expect(req.sessionModel.set).toHaveBeenCalledWith('unknownSentencesToUpdate', ['sentence-1', 'sentence-3'])
    })

    it('should mark all complete when all sentences are updated', async () => {
      // Arrange
      req.sessionModel.get.mockImplementation((key: string) => {
        if (key === 'updatedSentenceTypes') return { 'sentence-1': 'SDS', 'sentence-3': 'EDS' }
        return undefined
      })

      // Act
      await controller.get(req, res, next)

      // Assert
      expect(res.locals.allComplete).toBe(true)
    })

    it('should handle errors gracefully', async () => {
      // Arrange
      const error = new Error('Test error')
      req.sessionModel.get.mockImplementation(() => {
        throw error
      })

      // Act
      await controller.get(req, res, next)

      // Assert
      expect(next).toHaveBeenCalledWith(error)
    })
  })

  describe('post', () => {
    it('should allow continuation when all sentences are updated', async () => {
      // Arrange
      req.sessionModel.get.mockImplementation((key: string) => {
        if (key === 'unknownSentencesToUpdate') return ['sentence-1', 'sentence-2']
        if (key === 'updatedSentenceTypes') return { 'sentence-1': 'SDS', 'sentence-2': 'EDS' }
        return undefined
      })

      // Act
      await controller.post(req, res, next)

      // Assert
      expect(req.sessionModel.set).not.toHaveBeenCalledWith('errors', expect.anything())
      expect(Object.getPrototypeOf(Object.getPrototypeOf(controller)).post).toHaveBeenCalled()
    })

    it('should prevent continuation when not all sentences are updated', async () => {
      // Arrange
      req.sessionModel.get.mockImplementation((key: string) => {
        if (key === 'unknownSentencesToUpdate') return ['sentence-1', 'sentence-2']
        if (key === 'updatedSentenceTypes') return { 'sentence-1': 'SDS' } // sentence-2 not updated
        return undefined
      })

      // Mock the get method to be called
      jest.spyOn(controller, 'get').mockImplementation(async () => {})

      // Act
      await controller.post(req, res, next)

      // Assert
      expect(req.sessionModel.set).toHaveBeenCalledWith('errors', {
        sentenceTypes: {
          text: 'You must update all sentence types before continuing',
        },
      })
      expect(res.locals.errors).toBeDefined()
      expect(res.locals.errorSummary).toBeDefined()
      expect(controller.get).toHaveBeenCalled()
    })
  })

  describe('locals', () => {
    it('should set correct locals for display', () => {
      // Arrange
      const updatedSentenceTypes = { 'sentence-1': 'type-1', 'sentence-2': 'type-2' }
      const unknownSentences = ['sentence-1', 'sentence-2', 'sentence-3']

      req.sessionModel.get.mockImplementation((key: string) => {
        if (key === 'updatedSentenceTypes') return updatedSentenceTypes
        if (key === 'unknownSentencesToUpdate') return unknownSentences
        return undefined
      })

      // Act
      controller.locals(req, res)

      // Assert
      expect(res.locals.updatedSentenceTypes).toEqual(updatedSentenceTypes)
      expect(res.locals.unknownSentences).toEqual(unknownSentences)
      expect(res.locals.totalToUpdate).toBe(3)
      expect(res.locals.totalUpdated).toBe(2)
    })

    it('should handle empty data gracefully', () => {
      // Arrange
      req.sessionModel.get.mockReturnValue(undefined)

      // Act
      controller.locals(req, res)

      // Assert
      expect(res.locals.updatedSentenceTypes).toEqual({})
      expect(res.locals.unknownSentences).toEqual([])
      expect(res.locals.totalToUpdate).toBe(0)
      expect(res.locals.totalUpdated).toBe(0)
    })
  })
})
