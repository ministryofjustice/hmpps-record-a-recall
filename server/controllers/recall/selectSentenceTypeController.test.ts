import { NextFunction, Response } from 'express'
import type { CourtCase } from 'models'
import SelectSentenceTypeController from './selectSentenceTypeController'
import { ExtendedRequest } from '../base/ExpressBaseController'
import { createExtendedRequestMock } from '../../test-utils/extendedRequestMock'
import { SentenceType } from '../../@types/remandAndSentencingApi/remandAndSentencingTypes'
import * as formWizardHelper from '../../helpers/formWizardHelper'
import * as sessionHelper from '../../helpers/sessionHelper'
import * as sentenceHelper from '../../helpers/sentenceHelper'

jest.mock('../../../logger')
jest.mock('../../helpers/sessionHelper')
jest.mock('../../helpers/sentenceHelper')
jest.mock('../../helpers/formWizardHelper', () => ({
  getCourtCaseOptions: jest.fn(),
  sessionModelFields: {
    UPDATED_SENTENCE_TYPES: 'updatedSentences',
  },
}))

const mockGetCourtCaseOptions = formWizardHelper.getCourtCaseOptions as jest.MockedFunction<
  typeof formWizardHelper.getCourtCaseOptions
>

jest.mock('../../utils/rasCourtCasesUtils', () => ({
  __esModule: true,
  default: jest.fn(),
}))

const mockGetCourtCaseOptionsFromRas = jest.requireMock('../../utils/rasCourtCasesUtils').default

describe('SelectSentenceTypeController', () => {
  let controller: SelectSentenceTypeController
  let req: ExtendedRequest
  let res: Response
  let next: NextFunction

  const mockCourtCases: CourtCase[] = [
    {
      caseId: 'court-case-1',
      status: 'ACTIVE',
      date: '2024-01-15',
      location: 'MC01',
      locationName: 'Manchester Crown Court',
      reference: '34F2356911',
      sentenced: true,
      sentences: [
        {
          sentenceUuid: 'sentence-1',
          offenceCode: 'TH68037',
          offenceStartDate: '2024-01-09',
          outcome: 'Burglary other than dwelling - theft',
          sentenceType: 'unknown pre-recall sentence',
          convictionDate: '2024-01-15',
        },
      ],
    },
  ]

  const mockSentenceTypes: SentenceType[] = [
    {
      sentenceTypeUuid: 'sds-uuid',
      description: 'Standard Determinate Sentence (SDS)',
      classification: 'STANDARD',
      displayOrder: 1,
    },
    {
      sentenceTypeUuid: 'eds-uuid',
      description: 'Extended Determinate Sentence (EDS)',
      classification: 'EXTENDED',
      displayOrder: 2,
    },
  ]

  beforeEach(() => {
    controller = new SelectSentenceTypeController({ route: '/select-sentence-type' })
    mockGetCourtCaseOptionsFromRas.mockReturnValue(mockCourtCases)
    req = createExtendedRequestMock({
      params: { sentenceUuid: 'sentence-1' },
      session: {
        formData: {} as Record<string, any>,
      },
      sessionModel: {
        get: jest.fn(),
        set: jest.fn(),
        unset: jest.fn(),
      },
      services: {
        courtCaseService: {
          searchSentenceTypes: jest.fn().mockResolvedValue(mockSentenceTypes),
        },
      },
      journeyModel: {
        attributes: {
          lastVisited: '/previous-page',
        },
      },
      flash: jest.fn().mockReturnValue([]),
      body: {},
      form: {
        options: {
          fields: {
            sentenceType: {
              items: mockSentenceTypes.map(type => ({
                value: type.sentenceTypeUuid,
                text: type.description,
              })),
            },
          },
        },
      },
    })

    res = {
      locals: {
        user: { username: 'test-user' },
        nomisId: 'A1234BC',
        recallableCourtCases: [],
      },
      redirect: jest.fn(),
    } as unknown as Response

    next = jest.fn()

    // Mock the parent class get method
    jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(controller)), 'get').mockImplementation(() => {})
    jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(controller)), 'post').mockImplementation(() => {})
    jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(controller)), 'locals').mockImplementation(() => ({}))
  })

  describe('get', () => {
    beforeEach(() => {
      mockGetCourtCaseOptions.mockReturnValue(mockCourtCases)
      ;(sessionHelper.getSessionValue as jest.Mock).mockImplementation((req, key: string) => {
        if (key === 'prisoner') return { dateOfBirth: '1990-01-01' }
        if (key === 'updatedSentences') return {}
        return undefined
      })
      ;(sentenceHelper.findSentenceAndCourtCase as jest.Mock).mockReturnValue({
        targetSentence: mockCourtCases[0].sentences[0],
        targetCourtCase: mockCourtCases[0],
      })
      ;(sentenceHelper.getApplicableSentenceTypes as jest.Mock).mockResolvedValue(mockSentenceTypes)
    })

    it('should find the sentence and court case', async () => {
      // Run middleware first to set up field items
      await controller.setSentenceTypeFieldItems(req, res, jest.fn())
      await controller.get(req, res, next)

      expect(res.locals.sentence).toEqual(mockCourtCases[0].sentences[0])
      expect(res.locals.courtCase).toEqual(mockCourtCases[0])
      expect(res.locals.sentenceUuid).toBe('sentence-1')
    })

    it('should fetch applicable sentence types using search API', async () => {
      // Run middleware first to set up field items
      await controller.setSentenceTypeFieldItems(req, res, jest.fn())
      await controller.get(req, res, next)

      expect(sentenceHelper.getApplicableSentenceTypes).toHaveBeenCalledWith(
        req,
        mockCourtCases[0].sentences[0],
        mockCourtCases[0],
        'test-user',
      )
      expect(res.locals.sentenceTypes).toEqual(
        mockSentenceTypes.map(type => ({
          sentenceTypeUuid: type.sentenceTypeUuid,
          description: type.description,
        })),
      )
    })

    it('should set selected type if already updated', async () => {
      req.session.formData.prisoner = { dateOfBirth: '1990-01-01' }
      req.session.formData.updatedSentences = {
        'sentence-1': { uuid: 'sds-uuid', description: 'Standard Determinate Sentence (SDS)' },
      }
      ;(sessionHelper.getSessionValue as jest.Mock).mockImplementation((req, key: string) => {
        return req.session.formData[key]
      })

      // Run middleware first to set up field items
      await controller.setSentenceTypeFieldItems(req, res, jest.fn())
      await controller.get(req, res, next)

      expect(res.locals.selectedType).toBe('sds-uuid')
    })

    it('should throw error if sentence not found', async () => {
      req.params.sentenceUuid = 'non-existent'
      ;(sentenceHelper.findSentenceAndCourtCase as jest.Mock).mockReturnValue({
        targetSentence: null,
        targetCourtCase: null,
      })

      await controller.get(req, res, next)

      expect(next).toHaveBeenCalledWith(expect.any(Error))
      expect((next as jest.Mock).mock.calls[0][0].message).toBe('Sentence not found: non-existent')
    })

    it('should throw error if API fails', async () => {
      ;(sentenceHelper.getApplicableSentenceTypes as jest.Mock).mockRejectedValue(new Error('API error'))

      // Run middleware first to set up field items - should throw error
      const middlewareNext = jest.fn()
      await controller.setSentenceTypeFieldItems(req, res, middlewareNext)

      expect(middlewareNext).toHaveBeenCalledWith(expect.any(Error))
      expect((middlewareNext as jest.Mock).mock.calls[0][0].message).toBe('API error')
    })
  })

  describe('post', () => {
    beforeEach(() => {
      req.body = { sentenceType: 'sds-uuid' }
      req.session.formData.updatedSentences = {}
      ;(sessionHelper.getSessionValue as jest.Mock).mockImplementation((req, key: string) => {
        return req.session.formData[key]
      })
      ;(sessionHelper.setSessionValue as jest.Mock).mockImplementation((req, key: string, value: any) => {
        req.session.formData[key] = value
      })
    })

    it('should update session with selected sentence type', async () => {
      await controller.post(req, res, next)

      expect(req.session.formData.updatedSentences).toEqual({
        'sentence-1': { uuid: 'sds-uuid', description: 'Standard Determinate Sentence (SDS)' },
      })
    })

    it('should always navigate back to summary', async () => {
      req.session.formData.updatedSentences = {}
      req.session.formData.sentencesInCurrentCase = ['sentence-1', 'sentence-2', 'sentence-3']
      req.session.formData.currentSentenceIndex = 0
      ;(sessionHelper.getSessionValue as jest.Mock).mockImplementation((req, key: string) => {
        return req.session.formData[key]
      })

      await controller.post(req, res, next)

      // Should not redirect as it calls super.post
      expect(res.redirect).not.toHaveBeenCalled()
      expect(next).not.toHaveBeenCalled()
    })

    it('should not clear navigation state as sequential flow is removed', async () => {
      req.session.formData.updatedSentences = {}
      req.session.formData.sentencesInCurrentCase = ['sentence-1']
      req.session.formData.currentSentenceIndex = 0
      ;(sessionHelper.getSessionValue as jest.Mock).mockImplementation((req, key: string) => {
        return req.session.formData[key]
      })

      await controller.post(req, res, next)

      // Navigation state clearing removed - always goes back to summary
      // Verify session data was not cleared (these values should still exist)
      expect(req.session.formData.sentencesInCurrentCase).toBeDefined()
      expect(res.redirect).not.toHaveBeenCalled()
      expect(next).not.toHaveBeenCalled()
    })

    it('sequential flow removed - always navigates back to summary', async () => {
      req.session.formData.updatedSentences = {
        'sentence-1': { uuid: 'sds-uuid', description: 'SDS' },
        'sentence-2': { uuid: 'eds-uuid', description: 'EDS' },
      }
      req.session.formData.sentencesInCurrentCase = ['sentence-1', 'sentence-2', 'sentence-3']
      req.session.formData.currentSentenceIndex = 0
      ;(sessionHelper.getSessionValue as jest.Mock).mockImplementation((req, key: string) => {
        return req.session.formData[key]
      })

      await controller.post(req, res, next)

      expect(res.redirect).not.toHaveBeenCalled()
      expect(next).not.toHaveBeenCalled()
    })
  })

  describe('locals', () => {
    it('should return page title in locals', () => {
      const result = controller.locals(req, res)

      expect(result.pageTitle).toBe('Select the sentence type')
    })
  })
})
