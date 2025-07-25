/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { jest } from '@jest/globals'
import UpdateSentenceTypesSummaryController from './updateSentenceTypesSummaryController'
import RemandAndSentencingApiClient from '../../api/remandAndSentencingApiClient'
import logger from '../../../logger'

jest.mock('../../api/remandAndSentencingApiClient')
jest.mock('../../../logger')

describe('UpdateSentenceTypesSummaryController', () => {
  let req: any
  let res: any
  let next: jest.Mock
  let controller: UpdateSentenceTypesSummaryController
  let mockApiClient: jest.Mocked<RemandAndSentencingApiClient>

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()

    // Mock API client
    mockApiClient = {
      updateSentenceTypes: jest.fn(),
    } as any

    // @ts-expect-error
    RemandAndSentencingApiClient.mockImplementation(() => mockApiClient)

    // Setup request object
    req = {
      sessionModel: {
        get: jest.fn(),
        unset: jest.fn(),
      },
      journeyModel: {
        attributes: {
          lastVisited: '/previous-page',
        },
      },
      flash: jest.fn().mockReturnValue([]),
    }

    // Setup response object
    res = {
      locals: {
        user: {
          token: 'test-token',
        },
        nomisId: 'A1234BC',
      },
    }

    next = jest.fn()

    controller = new UpdateSentenceTypesSummaryController({ route: '/update-sentence-types-summary' })

    // Mock the parent class saveValues method
    jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(controller)), 'saveValues').mockImplementation(async () => {
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

      const mockResponse = {
        updatedSentenceUuids: ['sentence-uuid-1', 'sentence-uuid-2'],
      }
      mockApiClient.updateSentenceTypes.mockResolvedValue(mockResponse)

      // Act
      await controller.saveValues(req, res, next)

      // Assert
      expect(mockApiClient.updateSentenceTypes).toHaveBeenCalledWith(courtCaseUuid, {
        updates: [
          { sentenceUuid: 'sentence-uuid-1', sentenceTypeId: 'sds-type-uuid' },
          { sentenceUuid: 'sentence-uuid-2', sentenceTypeId: 'eds-type-uuid' },
        ],
      })

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
      expect(mockApiClient.updateSentenceTypes).not.toHaveBeenCalled()
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
      expect(mockApiClient.updateSentenceTypes).not.toHaveBeenCalled()
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
      mockApiClient.updateSentenceTypes.mockRejectedValue(error)

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
      mockApiClient.updateSentenceTypes.mockRejectedValue(error)

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
      mockApiClient.updateSentenceTypes.mockRejectedValue(error)

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
      mockApiClient.updateSentenceTypes.mockRejectedValue(error)

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
