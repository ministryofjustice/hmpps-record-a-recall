import FormWizard from 'hmpo-form-wizard'
import { NextFunction, Response } from 'express'
import type { CourtCase } from 'models'
import SelectSentenceTypeController from './selectSentenceTypeController'
import { SentenceType } from '../../@types/remandAndSentencingApi/remandAndSentencingTypes'
import * as formWizardHelper from '../../helpers/formWizardHelper'

jest.mock('../../../logger')
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
  let req: FormWizard.Request
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
    req = {
      params: { sentenceUuid: 'sentence-1' },
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
    } as unknown as FormWizard.Request

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
      ;(req.sessionModel.get as jest.Mock).mockImplementation((key: string) => {
        if (key === 'prisoner') return { dateOfBirth: '1990-01-01' }
        if (key === 'updatedSentences') return {}
        return undefined
      })
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

      expect(req.services.courtCaseService.searchSentenceTypes).toHaveBeenCalledWith(
        {
          age: 34, // Calculated from date of birth and conviction date
          convictionDate: '2024-01-15',
          offenceDate: '2024-01-09',
          statuses: ['ACTIVE'],
        },
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
      ;(req.sessionModel.get as jest.Mock).mockImplementation((key: string) => {
        if (key === 'prisoner') return { dateOfBirth: '1990-01-01' }
        if (key === 'updatedSentences')
          return { 'sentence-1': { uuid: 'sds-uuid', description: 'Standard Determinate Sentence (SDS)' } }
        return undefined
      })

      // Run middleware first to set up field items
      await controller.setSentenceTypeFieldItems(req, res, jest.fn())
      await controller.get(req, res, next)

      expect(res.locals.selectedType).toBe('sds-uuid')
    })

    it('should throw error if sentence not found', async () => {
      req.params.sentenceUuid = 'non-existent'

      await controller.get(req, res, next)

      expect(next).toHaveBeenCalledWith(expect.any(Error))
      expect((next as jest.Mock).mock.calls[0][0].message).toBe('Sentence not found: non-existent')
    })

    it('should throw error if API fails', async () => {
      req.services.courtCaseService.searchSentenceTypes = jest.fn().mockRejectedValue(new Error('API error'))

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
      ;(req.sessionModel.get as jest.Mock).mockImplementation((key: string) => {
        if (key === 'updatedSentences') return {}
        return undefined
      })
    })

    it('should update session with selected sentence type', async () => {
      await controller.post(req, res, next)

      expect(req.sessionModel.set).toHaveBeenCalledWith('updatedSentences', {
        'sentence-1': { uuid: 'sds-uuid', description: 'Standard Determinate Sentence (SDS)' },
      })
    })

    it('should always navigate back to summary', async () => {
      ;(req.sessionModel.get as jest.Mock).mockImplementation((key: string) => {
        if (key === 'updatedSentences') return {}
        if (key === 'sentencesInCurrentCase') return ['sentence-1', 'sentence-2', 'sentence-3']
        if (key === 'currentSentenceIndex') return 0
        return undefined
      })

      await controller.post(req, res, next)

      // Should not redirect as it calls super.post
      expect(res.redirect).not.toHaveBeenCalled()
      expect(next).not.toHaveBeenCalled()
    })

    it('should not clear navigation state as sequential flow is removed', async () => {
      ;(req.sessionModel.get as jest.Mock).mockImplementation((key: string) => {
        if (key === 'updatedSentences') return {}
        if (key === 'sentencesInCurrentCase') return ['sentence-1']
        if (key === 'currentSentenceIndex') return 0
        return undefined
      })

      await controller.post(req, res, next)

      // Navigation state clearing removed - always goes back to summary
      expect(req.sessionModel.unset).not.toHaveBeenCalled()
      expect(res.redirect).not.toHaveBeenCalled()
      expect(next).not.toHaveBeenCalled()
    })

    it('sequential flow removed - always navigates back to summary', async () => {
      ;(req.sessionModel.get as jest.Mock).mockImplementation((key: string) => {
        if (key === 'updatedSentences')
          return {
            'sentence-1': { uuid: 'sds-uuid', description: 'SDS' },
            'sentence-2': { uuid: 'eds-uuid', description: 'EDS' },
          }
        if (key === 'sentencesInCurrentCase') return ['sentence-1', 'sentence-2', 'sentence-3']
        if (key === 'currentSentenceIndex') return 0
        return undefined
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
