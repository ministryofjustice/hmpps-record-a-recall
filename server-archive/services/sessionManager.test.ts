/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request } from 'express'
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

  beforeEach(() => {
    req = {
      session: {},
    } as Request

    // Mock the session save method
    ;(req.session as any).save = jest.fn((callback: (err?: any) => void) => callback())
  })

  describe('getRecallData', () => {
    it('should return formatted recall journey data', () => {
      // Set session data directly
      ;(req.session as any).courtCases = ['case1', 'case2']
      ;(req.session as any).summarisedSentenceGroups = [
        {
          eligibleSentences: [{ sentenceId: 'sent1' }, { sentenceId: 'sent2' }],
        },
      ]
      ;(req.session as any).revocationDate = '2024-01-15'
      ;(req.session as any).returnToCustodyDate = '2024-01-10'
      ;(req.session as any).UAL = 5
      ;(req.session as any).recallType = 'FIXED'
      ;(req.session as any).inPrisonAtRecall = true
      ;(req.session as any).manualCaseSelection = false
      ;(req.session as any).eligibleSentenceCount = 3
      ;(req.session as any).isEdit = false

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
      // Session is already empty from beforeEach

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
      ;(req.session as any).UAL = 1

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

      expect((req.session as any).UAL).toBe(10)
      expect((req.session as any).inPrisonAtRecall).toBe(true)
      expect((req.session as any).recallType).toBe('STANDARD')
    })

    it('should unset values that are null or undefined', () => {
      const data: any = {
        UAL: null,
        recallType: undefined,
      }

      SessionManager.updateRecallData(req, data)

      expect((req.session as any).UAL).toBeUndefined()
      expect((req.session as any).recallType).toBeUndefined()
    })

    it('should ignore keys that do not map to session keys', () => {
      const data = {
        unknownKey: 'value',
      } as any

      const initialSession = { ...(req.session as any) }

      SessionManager.updateRecallData(req, data)

      // Session should remain unchanged
      expect(req.session).toEqual(initialSession)
    })
  })

  describe('clearRecallData', () => {
    it('should unset all session keys', () => {
      // Pre-populate session with some data
      Object.values(SessionManager.SESSION_KEYS).forEach(key => {
        ;(req.session as any)[key] = 'someValue'
      })

      SessionManager.clearRecallData(req)

      const expectedKeys = Object.values(SessionManager.SESSION_KEYS)
      expectedKeys.forEach(key => {
        expect((req.session as any)[key]).toBeUndefined()
      })
    })
  })

  describe('getAllSessionData', () => {
    it('should return all session data with camelCase keys', () => {
      ;(req.session as any).UAL = 5
      ;(req.session as any).recallId = 'recall123'
      ;(req.session as any).inPrisonAtRecall = true
      ;(req.session as any).returnToCustodyDate = '2024-01-10'

      const result = SessionManager.getAllSessionData(req)

      expect(result).toEqual({
        UAL: 5,
        recallId: 'recall123',
        inPrisonAtRecall: true,
        returnToCustodyDate: '2024-01-10', // Using actual session key value now
      })
    })

    it('should exclude undefined values', () => {
      ;(req.session as any).UAL = 5
      // Other values are undefined by default

      const result = SessionManager.getAllSessionData(req)

      expect(result).toEqual({
        UAL: 5,
      })
    })
  })

  describe('hasSession', () => {
    it('should return true when session exists', () => {
      expect(SessionManager.hasSession(req)).toBe(true)
    })

    it('should return false when session does not exist', () => {
      const reqWithoutSession = {} as Request
      expect(SessionManager.hasSession(reqWithoutSession)).toBe(false)
    })
  })

  describe('getSessionValue', () => {
    it('should return the value from session', () => {
      ;(req.session as any).testKey = 'testValue'

      const result = SessionManager.getSessionValue(req, 'testKey')

      expect(result).toBe('testValue')
    })

    it('should return undefined when session does not exist', () => {
      const reqWithoutSession = {} as Request
      const result = SessionManager.getSessionValue(reqWithoutSession, 'testKey')

      expect(result).toBeUndefined()
    })

    it('should return undefined when key does not exist', () => {
      const result = SessionManager.getSessionValue(req, 'nonExistentKey')

      expect(result).toBeUndefined()
    })
  })

  describe('setSessionValue', () => {
    it('should set the value in session', () => {
      SessionManager.setSessionValue(req, 'testKey', 'testValue')

      expect((req.session as any).testKey).toBe('testValue')
    })

    it('should not throw when session does not exist', () => {
      const reqWithoutSession = {} as Request

      expect(() => {
        SessionManager.setSessionValue(reqWithoutSession, 'testKey', 'testValue')
      }).not.toThrow()
    })

    it('should handle setting null value', () => {
      SessionManager.setSessionValue(req, 'testKey', null)

      expect((req.session as any).testKey).toBe(null)
    })
  })

  describe('save', () => {
    it('should call save on session when it exists', async () => {
      await SessionManager.save(req)
      expect(req.session.save).toHaveBeenCalled()
    })

    it('should resolve when session does not exist', async () => {
      const reqWithoutSession = {} as Request

      await expect(SessionManager.save(reqWithoutSession)).resolves.toBeUndefined()
    })

    it('should reject when save fails', async () => {
      ;(req.session as any).save = jest.fn((callback: (err?: any) => void) => callback(new Error('Save error')))

      await expect(SessionManager.save(req)).rejects.toThrow('Save error')
    })
  })
})
