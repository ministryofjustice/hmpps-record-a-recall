/* eslint-disable @typescript-eslint/no-explicit-any */
import FormWizard from 'hmpo-form-wizard'
import { SessionManager } from './sessionManager'

// Mock the getRecallType function
jest.mock('../@types/recallTypes', () => ({
  getRecallType: jest.fn((code: string) => {
    if (code === 'FIXED') {
      return { code: 'FIXED', description: 'Fixed term recall' }
    }
    return undefined
  }),
}))

describe('SessionManager', () => {
  let req: any
  let mockSessionModel: any

  beforeEach(() => {
    mockSessionModel = {
      get: jest.fn(),
      set: jest.fn(),
      unset: jest.fn(),
      save: jest.fn(),
    }

    req = {
      sessionModel: mockSessionModel,
    } as FormWizard.Request
  })

  describe('getRecallData', () => {
    it('should return formatted recall journey data', () => {
      mockSessionModel.get.mockImplementation((key: string) => {
        const values: Record<string, unknown> = {
          courtCases: ['case1', 'case2'],
          summarisedSentenceGroups: [
            {
              eligibleSentences: [{ sentenceId: 'sent1' }, { sentenceId: 'sent2' }],
            },
          ],
          revocationDate: '2024-01-15',
          returnToCustodyDate: '2024-01-10',
          UAL: 5,
          recallType: 'FIXED',
          inPrisonAtRecall: true,
          manualCaseSelection: false,
          eligibleSentenceCount: 3,
          isEdit: false,
        }
        return values[key]
      })

      const result = SessionManager.getRecallData(req)

      expect(result).toEqual({
        storedRecall: undefined,
        revocationDate: new Date('2024-01-15'),
        revDateString: '2024-01-15',
        inPrisonAtRecall: true,
        returnToCustodyDate: new Date('2024-01-10'),
        returnToCustodyDateString: '2024-01-10',
        ual: 5,
        ualText: '5 days',
        manualCaseSelection: false,
        recallType: {
          code: 'FIXED',
          description: 'Fixed term recall',
        },
        courtCaseCount: 2,
        eligibleSentenceCount: 3,
        sentenceIds: ['sent1', 'sent2'],
        isEdit: false,
      })
    })

    it('should handle missing optional values', () => {
      mockSessionModel.get.mockReturnValue(undefined)

      const result = SessionManager.getRecallData(req)

      expect(result).toEqual({
        storedRecall: undefined,
        revocationDate: undefined,
        revDateString: undefined,
        inPrisonAtRecall: false,
        returnToCustodyDate: undefined,
        returnToCustodyDateString: undefined,
        ual: undefined,
        ualText: undefined,
        manualCaseSelection: false,
        recallType: undefined,
        courtCaseCount: 0,
        eligibleSentenceCount: 0,
        sentenceIds: undefined,
        isEdit: false,
      })
    })

    it('should handle UAL text formatting for single day', () => {
      mockSessionModel.get.mockImplementation((key: string) => {
        if (key === 'UAL') return 1
        return undefined
      })

      const result = SessionManager.getRecallData(req)

      expect(result.ualText).toBe('1 day')
    })
  })

  describe('updateRecallData', () => {
    it('should update session values for provided data', () => {
      const data: any = {
        UAL: 10,
        inPrisonAtRecall: true,
        recallType: 'STANDARD',
      }

      SessionManager.updateRecallData(req, data)

      expect(mockSessionModel.set).toHaveBeenCalledWith('UAL', 10)
      expect(mockSessionModel.set).toHaveBeenCalledWith('inPrisonAtRecall', true)
      expect(mockSessionModel.set).toHaveBeenCalledWith('recallType', 'STANDARD')
    })

    it('should unset values that are null or undefined', () => {
      const data: any = {
        UAL: null,
        recallType: undefined,
      }

      SessionManager.updateRecallData(req, data)

      expect(mockSessionModel.unset).toHaveBeenCalledWith('UAL')
      expect(mockSessionModel.unset).toHaveBeenCalledWith('recallType')
      expect(mockSessionModel.set).not.toHaveBeenCalled()
    })

    it('should ignore keys that do not map to session keys', () => {
      const data = {
        unknownKey: 'value',
      } as any

      SessionManager.updateRecallData(req, data)

      expect(mockSessionModel.set).not.toHaveBeenCalled()
      expect(mockSessionModel.unset).not.toHaveBeenCalled()
    })
  })

  describe('clearRecallData', () => {
    it('should unset all session keys', () => {
      SessionManager.clearRecallData(req)

      const expectedKeys = Object.values(SessionManager.SESSION_KEYS)
      expect(mockSessionModel.unset).toHaveBeenCalledTimes(expectedKeys.length)

      expectedKeys.forEach(key => {
        expect(mockSessionModel.unset).toHaveBeenCalledWith(key)
      })
    })
  })

  describe('getAllSessionData', () => {
    it('should return all session data with camelCase keys', () => {
      mockSessionModel.get.mockImplementation((key: string) => {
        const values: Record<string, unknown> = {
          UAL: 5,
          recallId: 'recall123',
          inPrisonAtRecall: true,
          returnToCustodyDate: '2024-01-10',
        }
        return values[key]
      })

      const result = SessionManager.getAllSessionData(req)

      expect(result).toEqual({
        UAL: 5,
        recallId: 'recall123',
        inPrisonAtRecall: true,
        returnToCustodyDate: '2024-01-10', // Using actual session key value now
      })
    })

    it('should exclude undefined values', () => {
      mockSessionModel.get.mockImplementation((key: string) => {
        if (key === 'UAL') return 5
        return undefined
      })

      const result = SessionManager.getAllSessionData(req)

      expect(result).toEqual({
        UAL: 5,
      })
    })
  })

  describe('hasSessionModel', () => {
    it('should return true when sessionModel exists', () => {
      expect(SessionManager.hasSessionModel(req)).toBe(true)
    })

    it('should return false when sessionModel does not exist', () => {
      const reqWithoutSession = {} as FormWizard.Request
      expect(SessionManager.hasSessionModel(reqWithoutSession)).toBe(false)
    })
  })

  describe('getSessionValue', () => {
    it('should return the value from session', () => {
      mockSessionModel.get.mockReturnValue('testValue')

      const result = SessionManager.getSessionValue(req, 'testKey')

      expect(result).toBe('testValue')
      expect(mockSessionModel.get).toHaveBeenCalledWith('testKey')
    })

    it('should return undefined when sessionModel does not exist', () => {
      const reqWithoutSession = {} as FormWizard.Request
      const result = SessionManager.getSessionValue(reqWithoutSession, 'testKey')

      expect(result).toBeUndefined()
    })

    it('should return undefined and not throw when get fails', () => {
      mockSessionModel.get.mockImplementation(() => {
        throw new Error('Session error')
      })

      const result = SessionManager.getSessionValue(req, 'testKey')

      expect(result).toBeUndefined()
    })
  })

  describe('setSessionValue', () => {
    it('should set the value in session', () => {
      SessionManager.setSessionValue(req, 'testKey', 'testValue')

      expect(mockSessionModel.set).toHaveBeenCalledWith('testKey', 'testValue')
    })

    it('should not throw when sessionModel does not exist', () => {
      const reqWithoutSession = {} as FormWizard.Request

      expect(() => {
        SessionManager.setSessionValue(reqWithoutSession, 'testKey', 'testValue')
      }).not.toThrow()
    })

    it('should throw when set fails', () => {
      mockSessionModel.set.mockImplementation(() => {
        throw new Error('Session error')
      })

      expect(() => {
        SessionManager.setSessionValue(req, 'testKey', 'testValue')
      }).toThrow('Session error')
    })
  })

  describe('save', () => {
    it('should call save on sessionModel when it exists', () => {
      SessionManager.save(req)
      expect(mockSessionModel.save).toHaveBeenCalled()
    })

    it('should not throw when sessionModel does not exist', () => {
      const reqWithoutSession = {} as FormWizard.Request

      expect(() => {
        SessionManager.save(reqWithoutSession)
      }).not.toThrow()
    })

    it('should not throw when save is not a function', () => {
      req.sessionModel.save = undefined

      expect(() => {
        SessionManager.save(req)
      }).not.toThrow()
    })

    it('should throw when save fails', () => {
      mockSessionModel.save.mockImplementation(() => {
        throw new Error('Save error')
      })

      expect(() => {
        SessionManager.save(req)
      }).toThrow('Save error')
    })
  })
})
