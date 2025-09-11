import FormWizard from 'hmpo-form-wizard'
import { NextFunction, Response } from 'express'
import type { CourtCase } from 'models'
import BulkSentenceTypeController from './bulkSentenceTypeController'
import { SentenceType } from '../../@types/remandAndSentencingApi/remandAndSentencingTypes'
import * as formWizardHelper from '../../helpers/formWizardHelper'
import SENTENCE_TYPE_UUIDS from '../../utils/sentenceTypeConstants'
import { SessionManager } from '../../services/sessionManager'

jest.mock('../../../logger')
jest.mock('../../services/sessionManager')
jest.mock('../../helpers/urlHelper', () => ({
  __esModule: true,
  default: jest.fn().mockReturnValue({}),
}))
jest.mock('../../helpers/formWizardHelper', () => ({
  __esModule: true,
  default: jest.fn().mockReturnValue({}),
  getCourtCaseOptions: jest.fn(),
  getTemporaryCalc: jest.fn().mockReturnValue(null),
  sessionModelFields: {
    SENTENCES_IN_CURRENT_CASE: 'sentencesInCurrentCase',
    UPDATED_SENTENCE_TYPES: 'updatedSentences',
    BULK_UPDATE_MODE: 'bulkUpdateMode',
    CURRENT_SENTENCE_INDEX: 'currentSentenceIndex',
    IS_EDIT: 'isEdit',
    STORED_RECALL: 'storedRecall',
    CRDS_ERRORS: 'crdsValidationErrors',
    HAPPY_PATH_FAIL_REASONS: 'autoRecallFailErrors',
    RELEVANT_ADJUSTMENTS: 'relevantAdjustment',
    HAS_MULTIPLE_OVERLAPPING_UAL_TYPE_RECALL: 'hasMultipleOverlappingUalTypeRecall',
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

describe('BulkSentenceTypeController', () => {
  let controller: BulkSentenceTypeController
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
          sentenceTypeUuid: SENTENCE_TYPE_UUIDS.UNKNOWN_PRE_RECALL,
          offenceCode: 'TH68037',
          offenceStartDate: '2024-01-09',
          outcome: 'Burglary other than dwelling - theft',
          sentenceType: 'unknown pre-recall sentence',
        },
        {
          sentenceUuid: 'sentence-2',
          sentenceTypeUuid: SENTENCE_TYPE_UUIDS.UNKNOWN_PRE_RECALL,
          offenceCode: 'TH68038',
          offenceStartDate: '2024-01-10',
          outcome: 'Theft from person',
          sentenceType: 'unknown pre-recall sentence',
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

  const mockSentencesInCase = [
    { sentenceUuid: 'sentence-1', isUnknownSentenceType: true },
    { sentenceUuid: 'sentence-2', isUnknownSentenceType: true },
  ]

  beforeEach(() => {
    controller = new BulkSentenceTypeController({ route: '/bulk-sentence-type' })
    mockGetCourtCaseOptionsFromRas.mockReturnValue(mockCourtCases)

    req = {
      params: { courtCaseId: 'court-case-1' },
      sessionModel: {
        get: jest.fn() as jest.MockedFunction<(key: string) => unknown>,
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
              items: [],
            },
          },
        },
      },
    } as unknown as FormWizard.Request

    res = {
      locals: {
        nomisId: 'A1234BC',
        user: { username: 'testuser' },
      },
      redirect: jest.fn(),
    } as unknown as Response

    next = jest.fn()

    // Mock SessionManager methods
    ;(SessionManager.getSessionValue as jest.Mock) = jest.fn()
    ;(SessionManager.setSessionValue as jest.Mock) = jest.fn()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('setSentenceTypeFieldItems middleware', () => {
    it('should set sentence type items when court case and sentences are found', async () => {
      mockGetCourtCaseOptions.mockReturnValue(mockCourtCases)
      ;(SessionManager.getSessionValue as jest.Mock).mockImplementation((request, key) => {
        if (key === SessionManager.SESSION_KEYS.SENTENCES_IN_CURRENT_CASE) {
          return mockSentencesInCase
        }
        if (key === 'prisoner') {
          return { dateOfBirth: '1990-01-01' }
        }
        return null
      })
      // Also mock req.sessionModel.get for the helper function
      ;(req.sessionModel.get as jest.Mock).mockImplementation(key => {
        if (key === 'prisoner') {
          return { dateOfBirth: '1990-01-01' }
        }
        return null
      })

      await controller.setSentenceTypeFieldItems(req, res, next)

      expect(req.form.options.fields.sentenceType.items).toEqual([
        { value: 'sds-uuid', text: 'Standard Determinate Sentence (SDS)' },
        { value: 'eds-uuid', text: 'Extended Determinate Sentence (EDS)' },
      ])
      expect(res.locals.courtCase).toEqual(mockCourtCases[0])
      expect(res.locals.sentenceCount).toBe(2)
      expect(next).toHaveBeenCalledWith()
    })

    it('should call next with error when court case not found', async () => {
      req.params.courtCaseId = 'non-existent'
      mockGetCourtCaseOptions.mockReturnValue(mockCourtCases)
      ;(SessionManager.getSessionValue as jest.Mock).mockImplementation((request, key) => {
        if (key === SessionManager.SESSION_KEYS.SENTENCES_IN_CURRENT_CASE) {
          return mockSentencesInCase
        }
        if (key === 'prisoner') {
          return { dateOfBirth: '1990-01-01' }
        }
        return null
      })
      // Also mock req.sessionModel.get for the helper function
      ;(req.sessionModel.get as jest.Mock).mockImplementation(key => {
        if (key === 'prisoner') {
          return { dateOfBirth: '1990-01-01' }
        }
        return null
      })

      await controller.setSentenceTypeFieldItems(req, res, next)

      expect(next).toHaveBeenCalledWith(new Error('Court case not found: non-existent'))
    })

    it('should call next with error when no sentences in session', async () => {
      mockGetCourtCaseOptions.mockReturnValue(mockCourtCases)
      ;(SessionManager.getSessionValue as jest.Mock).mockReturnValue([])

      await controller.setSentenceTypeFieldItems(req, res, next)

      expect(next).toHaveBeenCalledWith(new Error('No sentences found in session'))
    })

    it('should call next with error when sentence not found in court case', async () => {
      mockGetCourtCaseOptions.mockReturnValue(mockCourtCases)
      ;(SessionManager.getSessionValue as jest.Mock).mockImplementation((request, key) => {
        if (key === SessionManager.SESSION_KEYS.SENTENCES_IN_CURRENT_CASE) {
          return [{ sentenceUuid: 'non-existent-sentence', isUnknownSentenceType: true }]
        }
        if (key === 'prisoner') {
          return { dateOfBirth: '1990-01-01' }
        }
        return null
      })
      // Also mock req.sessionModel.get for the helper function
      ;(req.sessionModel.get as jest.Mock).mockImplementation(key => {
        if (key === 'prisoner') {
          return { dateOfBirth: '1990-01-01' }
        }
        return null
      })

      await controller.setSentenceTypeFieldItems(req, res, next)

      expect(next).toHaveBeenCalledWith(new Error('Sentence not found: non-existent-sentence'))
    })

    it('should call next with error when prisoner data not in session', async () => {
      mockGetCourtCaseOptions.mockReturnValue(mockCourtCases)
      ;(SessionManager.getSessionValue as jest.Mock).mockImplementation((request, key) => {
        if (key === SessionManager.SESSION_KEYS.SENTENCES_IN_CURRENT_CASE) {
          return mockSentencesInCase
        }
        if (key === 'prisoner') {
          return null // No prisoner data
        }
        return null
      })

      await controller.setSentenceTypeFieldItems(req, res, next)

      expect(next).toHaveBeenCalledWith(new Error('Prisoner date of birth not found in session'))
    })

    it('should only include sentence types applicable to all sentences in bulk update', async () => {
      // Setup: First sentence has types A,B,C and second sentence has types B,C,D
      // Expected: Only B,C should be available for bulk update
      const differentSentenceTypes = [
        [
          // Types for sentence-1
          { sentenceTypeUuid: 'type-a', description: 'Type A', classification: 'STANDARD', displayOrder: 1 },
          { sentenceTypeUuid: 'type-b', description: 'Type B', classification: 'STANDARD', displayOrder: 2 },
          { sentenceTypeUuid: 'type-c', description: 'Type C', classification: 'STANDARD', displayOrder: 3 },
        ],
        [
          // Types for sentence-2
          { sentenceTypeUuid: 'type-b', description: 'Type B', classification: 'STANDARD', displayOrder: 2 },
          { sentenceTypeUuid: 'type-c', description: 'Type C', classification: 'STANDARD', displayOrder: 3 },
          { sentenceTypeUuid: 'type-d', description: 'Type D', classification: 'STANDARD', displayOrder: 4 },
        ],
      ]

      mockGetCourtCaseOptions.mockReturnValue(mockCourtCases)
      ;(SessionManager.getSessionValue as jest.Mock).mockImplementation((request, key) => {
        if (key === SessionManager.SESSION_KEYS.SENTENCES_IN_CURRENT_CASE) {
          return mockSentencesInCase
        }
        if (key === 'prisoner') {
          return { dateOfBirth: '1990-01-01' }
        }
        return null
      })
      // Also mock req.sessionModel.get for the helper function
      ;(req.sessionModel.get as jest.Mock).mockImplementation(key => {
        if (key === 'prisoner') {
          return { dateOfBirth: '1990-01-01' }
        }
        return null
      })

      // Mock searchSentenceTypes to return different types for each sentence
      let callCount = 0
      req.services.courtCaseService.searchSentenceTypes = jest.fn().mockImplementation(() => {
        const result = differentSentenceTypes[callCount]
        callCount += 1
        return Promise.resolve(result)
      })

      await controller.setSentenceTypeFieldItems(req, res, next)

      // Should only include types B and C which are common to both sentences
      expect(req.form.options.fields.sentenceType.items).toEqual([
        { value: 'type-b', text: 'Type B' },
        { value: 'type-c', text: 'Type C' },
      ])
      expect(next).toHaveBeenCalledWith()
    })
  })

  describe('get', () => {
    it('should render the page when sentences are in session', async () => {
      ;(SessionManager.getSessionValue as jest.Mock).mockReturnValue(mockSentencesInCase)
      req.form.options.fields.sentenceType.items = mockSentenceTypes.map(type => ({
        value: type.sentenceTypeUuid,
        text: type.description,
      }))

      // Mock the parent get method
      const superGetSpy = jest.spyOn(
        BulkSentenceTypeController.prototype as unknown as { get: typeof BulkSentenceTypeController.prototype.get },
        'get',
      )

      await controller.get(req, res, next)

      expect(res.locals.courtCaseId).toBe('court-case-1')
      expect(res.locals.sentenceTypes).toEqual([
        {
          sentenceTypeUuid: 'sds-uuid',
          description: 'Standard Determinate Sentence (SDS)',
        },
        {
          sentenceTypeUuid: 'eds-uuid',
          description: 'Extended Determinate Sentence (EDS)',
        },
      ])
      expect(superGetSpy).toHaveBeenCalled()
    })

    it('should redirect when no sentences in session', async () => {
      ;(SessionManager.getSessionValue as jest.Mock).mockReturnValue(null)

      await controller.get(req, res, next)

      expect(res.redirect).toHaveBeenCalledWith('/person/A1234BC/record-recall/update-sentence-types-summary')
    })
  })

  describe('post', () => {
    it('should update all sentences with selected type and redirect', async () => {
      req.body.sentenceType = 'sds-uuid'
      ;(SessionManager.getSessionValue as jest.Mock)
        .mockReturnValueOnce(mockSentencesInCase) // First call for sentences
        .mockReturnValueOnce({}) // Second call for existing updated sentences

      req.form.options.fields.sentenceType.items = [
        { value: 'sds-uuid', text: 'Standard Determinate Sentence (SDS)' },
        { value: 'eds-uuid', text: 'Extended Determinate Sentence (EDS)' },
      ]

      await controller.post(req, res, next)

      expect(SessionManager.setSessionValue).toHaveBeenCalledWith(
        req,
        SessionManager.SESSION_KEYS.UPDATED_SENTENCE_TYPES,
        {
          'sentence-1': {
            uuid: 'sds-uuid',
            description: 'Standard Determinate Sentence (SDS)',
          },
          'sentence-2': {
            uuid: 'sds-uuid',
            description: 'Standard Determinate Sentence (SDS)',
          },
        },
      )
      expect(SessionManager.setSessionValue).toHaveBeenCalledWith(
        req,
        SessionManager.SESSION_KEYS.BULK_UPDATE_MODE,
        null,
      )
      expect(SessionManager.setSessionValue).toHaveBeenCalledWith(
        req,
        SessionManager.SESSION_KEYS.SENTENCES_IN_CURRENT_CASE,
        null,
      )
      expect(SessionManager.setSessionValue).toHaveBeenCalledWith(
        req,
        SessionManager.SESSION_KEYS.CURRENT_SENTENCE_INDEX,
        null,
      )
      expect(res.redirect).toHaveBeenCalledWith('/person/A1234BC/record-recall/update-sentence-types-summary')
    })

    it('should call next with error when no sentences in session', async () => {
      req.body.sentenceType = 'sds-uuid'
      ;(SessionManager.getSessionValue as jest.Mock).mockReturnValue(null)

      await controller.post(req, res, next)

      expect(next).toHaveBeenCalledWith(new Error('No sentences found in session'))
    })

    it('should preserve existing updated sentences when updating', async () => {
      req.body.sentenceType = 'sds-uuid'
      const existingUpdatedSentences = {
        'sentence-3': {
          uuid: 'eds-uuid',
          description: 'Extended Determinate Sentence (EDS)',
        },
      }
      ;(SessionManager.getSessionValue as jest.Mock)
        .mockReturnValueOnce(mockSentencesInCase) // First call for sentences
        .mockReturnValueOnce(existingUpdatedSentences) // Second call for existing updated sentences

      req.form.options.fields.sentenceType.items = [{ value: 'sds-uuid', text: 'Standard Determinate Sentence (SDS)' }]

      await controller.post(req, res, next)

      expect(SessionManager.setSessionValue).toHaveBeenCalledWith(
        req,
        SessionManager.SESSION_KEYS.UPDATED_SENTENCE_TYPES,
        {
          'sentence-3': {
            uuid: 'eds-uuid',
            description: 'Extended Determinate Sentence (EDS)',
          },
          'sentence-1': {
            uuid: 'sds-uuid',
            description: 'Standard Determinate Sentence (SDS)',
          },
          'sentence-2': {
            uuid: 'sds-uuid',
            description: 'Standard Determinate Sentence (SDS)',
          },
        },
      )
    })
  })

  describe('locals', () => {
    it('should set correct page title', () => {
      const locals = controller.locals(req, res)

      expect(locals.pageTitle).toBe('Select sentence type for all sentences')
    })
  })
})
