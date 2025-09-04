import { NextFunction, Response } from 'express'
import type { CourtCase } from 'models'
import BulkSentenceTypeController from './bulkSentenceTypeController'
import { SentenceType } from '../../@types/remandAndSentencingApi/remandAndSentencingTypes'
import * as formWizardHelper from '../../helpers/formWizardHelper'
import SENTENCE_TYPE_UUIDS from '../../utils/sentenceTypeConstants'
import { ExtendedRequest } from '../base/ExpressBaseController'
import createExtendedRequestMock from '../../test-utils/extendedRequestMock'
import { Services } from '../../services'

jest.mock('../../../logger')
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

    req = createExtendedRequestMock({
      params: { courtCaseId: 'court-case-1' },
      session: {
        formData: {} as Record<string, unknown>,
      } as unknown as Express.Request['session'],
      services: {
        courtCaseService: {
          searchSentenceTypes: jest.fn().mockResolvedValue(mockSentenceTypes),
        } as unknown as Services['courtCaseService'],
      } as unknown as Services,
      flash: jest.fn().mockReturnValue([]),
      body: {},
      form: {
        values: {},
        options: {
          fields: {
            sentenceType: {
              items: [],
            },
          },
        },
      },
    })

    res = {
      locals: {
        nomisId: 'A1234BC',
        user: { username: 'testuser' },
      },
      redirect: jest.fn(),
    } as unknown as Response

    next = jest.fn()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('setSentenceTypeFieldItems middleware', () => {
    it('should set sentence type items when court case and sentences are found', async () => {
      mockGetCourtCaseOptions.mockReturnValue(mockCourtCases)
      req.session.formData[formWizardHelper.sessionModelFields.SENTENCES_IN_CURRENT_CASE] = mockSentencesInCase
      req.session.formData.prisoner = { dateOfBirth: '1990-01-01' }
      // Session data already set directly on req.session.formData

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
      req.session.formData[formWizardHelper.sessionModelFields.SENTENCES_IN_CURRENT_CASE] = mockSentencesInCase
      req.session.formData.prisoner = { dateOfBirth: '1990-01-01' }
      // Session data already set directly on req.session.formData

      await controller.setSentenceTypeFieldItems(req, res, next)

      expect(next).toHaveBeenCalledWith(new Error('Court case not found: non-existent'))
    })

    it('should call next with error when no sentences in session', async () => {
      mockGetCourtCaseOptions.mockReturnValue(mockCourtCases)
      req.session.formData[formWizardHelper.sessionModelFields.SENTENCES_IN_CURRENT_CASE] = []
      // Session data already set directly on req.session.formData

      await controller.setSentenceTypeFieldItems(req, res, next)

      expect(next).toHaveBeenCalledWith(new Error('No sentences found in session'))
    })

    it('should call next with error when sentence not found in court case', async () => {
      mockGetCourtCaseOptions.mockReturnValue(mockCourtCases)
      req.session.formData[formWizardHelper.sessionModelFields.SENTENCES_IN_CURRENT_CASE] = [
        { sentenceUuid: 'non-existent-sentence', isUnknownSentenceType: true },
      ]
      req.session.formData.prisoner = { dateOfBirth: '1990-01-01' }
      // Session data already set directly on req.session.formData

      await controller.setSentenceTypeFieldItems(req, res, next)

      expect(next).toHaveBeenCalledWith(new Error('Sentence not found: non-existent-sentence'))
    })

    it('should call next with error when prisoner data not in session', async () => {
      mockGetCourtCaseOptions.mockReturnValue(mockCourtCases)
      req.session.formData[formWizardHelper.sessionModelFields.SENTENCES_IN_CURRENT_CASE] = mockSentencesInCase
      req.session.formData.prisoner = null // No prisoner data
      // Session data already set directly on req.session.formData

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
      req.session.formData[formWizardHelper.sessionModelFields.SENTENCES_IN_CURRENT_CASE] = mockSentencesInCase
      req.session.formData.prisoner = { dateOfBirth: '1990-01-01' }
      // Session data already set directly on req.session.formData

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
      req.session.formData[formWizardHelper.sessionModelFields.SENTENCES_IN_CURRENT_CASE] = mockSentencesInCase
      // Session data already set directly on req.session.formData
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
      req.session.formData[formWizardHelper.sessionModelFields.SENTENCES_IN_CURRENT_CASE] = null
      // Session data already set directly on req.session.formData

      await controller.get(req, res, next)

      expect(res.redirect).toHaveBeenCalledWith('/person/A1234BC/record-recall/update-sentence-types-summary')
    })
  })

  describe('post', () => {
    it('should update all sentences with selected type and redirect', async () => {
      req.body.sentenceType = 'sds-uuid'
      req.session.formData[formWizardHelper.sessionModelFields.SENTENCES_IN_CURRENT_CASE] = mockSentencesInCase
      req.session.formData[formWizardHelper.sessionModelFields.UPDATED_SENTENCE_TYPES] = {}
      // Session data already set directly on req.session.formData

      req.form.options.fields.sentenceType.items = [
        { value: 'sds-uuid', text: 'Standard Determinate Sentence (SDS)' },
        { value: 'eds-uuid', text: 'Extended Determinate Sentence (EDS)' },
      ]

      await controller.post(req, res, next)

      // Check that the session was updated
      expect(req.session.formData[formWizardHelper.sessionModelFields.UPDATED_SENTENCE_TYPES]).toEqual({
        'sentence-1': {
          uuid: 'sds-uuid',
          description: 'Standard Determinate Sentence (SDS)',
        },
        'sentence-2': {
          uuid: 'sds-uuid',
          description: 'Standard Determinate Sentence (SDS)',
        },
      })
      expect(req.session.formData[formWizardHelper.sessionModelFields.BULK_UPDATE_MODE]).toBeUndefined()
      expect(req.session.formData[formWizardHelper.sessionModelFields.SENTENCES_IN_CURRENT_CASE]).toBeUndefined()
      expect(req.session.formData[formWizardHelper.sessionModelFields.CURRENT_SENTENCE_INDEX]).toBeUndefined()
      expect(res.redirect).toHaveBeenCalledWith('/person/A1234BC/record-recall/update-sentence-types-summary')
    })

    it('should call next with error when no sentences in session', async () => {
      req.body.sentenceType = 'sds-uuid'
      req.session.formData[formWizardHelper.sessionModelFields.SENTENCES_IN_CURRENT_CASE] = null
      // Session data already set directly on req.session.formData

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
      req.session.formData[formWizardHelper.sessionModelFields.SENTENCES_IN_CURRENT_CASE] = mockSentencesInCase
      req.session.formData[formWizardHelper.sessionModelFields.UPDATED_SENTENCE_TYPES] = existingUpdatedSentences
      // Session data already set directly on req.session.formData

      req.form.options.fields.sentenceType.items = [{ value: 'sds-uuid', text: 'Standard Determinate Sentence (SDS)' }]

      await controller.post(req, res, next)

      expect(req.session.formData[formWizardHelper.sessionModelFields.UPDATED_SENTENCE_TYPES]).toEqual({
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
      })
    })
  })

  describe('locals', () => {
    it('should set correct page title', () => {
      const locals = controller.locals(req, res)

      expect(locals.pageTitle).toBe('Select sentence type for all sentences')
    })
  })
})
