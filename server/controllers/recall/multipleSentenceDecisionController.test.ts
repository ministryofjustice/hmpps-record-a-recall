import { NextFunction, Response } from 'express'
import type { CourtCase } from 'models'
import MultipleSentenceDecisionController from './multipleSentenceDecisionController'
import { ExtendedRequest } from '../base/ExpressBaseController'
import { createExtendedRequestMock } from '../../test-utils/extendedRequestMock'
import * as formWizardHelper from '../../helpers/formWizardHelper'
import * as sessionHelper from '../../helpers/sessionHelper'
import SENTENCE_TYPE_UUIDS from '../../utils/sentenceTypeConstants'

jest.mock('../../../logger')
jest.mock('../../helpers/sessionHelper')
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
    SELECTED_COURT_CASE_UUID: 'selectedCourtCaseUuid',
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

describe('MultipleSentenceDecisionController', () => {
  let controller: MultipleSentenceDecisionController
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
    {
      caseId: 'court-case-2',
      status: 'ACTIVE',
      date: '2024-02-01',
      location: 'MC02',
      locationName: 'Leeds Crown Court',
      reference: '34F2356912',
      sentenced: true,
      sentences: [
        {
          sentenceUuid: 'sentence-3',
          sentenceTypeUuid: 'some-other-uuid',
          offenceCode: 'AB12345',
          offenceStartDate: '2024-01-20',
          outcome: 'Assault',
          sentenceType: 'Standard Determinate Sentence',
        },
      ],
    },
  ]

  beforeEach(() => {
    controller = new MultipleSentenceDecisionController({ route: '/multiple-sentence-decision' })

    req = createExtendedRequestMock({
      params: { courtCaseId: 'court-case-1' },
      sessionModel: {
        get: jest.fn() as jest.MockedFunction<(key: string) => unknown>,
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
      form: {
        options: {
          next: undefined,
          fields: {},
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

  describe('setSentencesInCase middleware', () => {
    it('should set sentences in session when court case has unknown sentences', async () => {
      mockGetCourtCaseOptions.mockReturnValue(mockCourtCases)

      await controller.setSentencesInCase(req, res, next)

      expect(sessionHelper.setSessionValue).toHaveBeenCalledWith(
        req,
        formWizardHelper.sessionModelFields.SENTENCES_IN_CURRENT_CASE,
        [
          { sentenceUuid: 'sentence-1', isUnknownSentenceType: true },
          { sentenceUuid: 'sentence-2', isUnknownSentenceType: true },
        ],
      )
      expect(sessionHelper.setSessionValue).toHaveBeenCalledWith(
        req,
        formWizardHelper.sessionModelFields.SELECTED_COURT_CASE_UUID,
        'court-case-1',
      )
      expect(res.locals.sentenceCount).toBe(2)
      expect(res.locals.courtCase).toEqual(mockCourtCases[0])
      expect(res.locals.courtCaseId).toBe('court-case-1')
      expect(next).toHaveBeenCalledWith()
    })

    it('should redirect when court case has no unknown sentences', async () => {
      req.params.courtCaseId = 'court-case-2'
      mockGetCourtCaseOptions.mockReturnValue(mockCourtCases)

      await controller.setSentencesInCase(req, res, next)

      expect(res.redirect).toHaveBeenCalledWith('/person/A1234BC/record-recall/update-sentence-types-summary')
      expect(next).not.toHaveBeenCalled()
    })

    it('should call next with error when court case not found', async () => {
      req.params.courtCaseId = 'non-existent'
      mockGetCourtCaseOptions.mockReturnValue(mockCourtCases)

      await controller.setSentencesInCase(req, res, next)

      expect(next).toHaveBeenCalledWith(new Error('Court case not found: non-existent'))
    })
  })

  describe('get', () => {
    it('should render the page when sentences are in session', async () => {
      mockGetCourtCaseOptions.mockReturnValue(mockCourtCases)
      ;(sessionHelper.getSessionValue as jest.Mock).mockReturnValue([
        { sentenceUuid: 'sentence-1', isUnknownSentenceType: true },
        { sentenceUuid: 'sentence-2', isUnknownSentenceType: true },
      ])

      // Mock the parent get method
      const superGetSpy = jest.spyOn(
        MultipleSentenceDecisionController.prototype as unknown as {
          get: typeof MultipleSentenceDecisionController.prototype.get
        },
        'get',
      )

      await controller.get(req, res, next)

      expect(res.locals.courtCaseId).toBe('court-case-1')
      expect(superGetSpy).toHaveBeenCalled()
    })

    it('should redirect when no sentences in session', async () => {
      ;(sessionHelper.getSessionValue as jest.Mock).mockReturnValue(null)

      await controller.get(req, res, next)

      expect(res.redirect).toHaveBeenCalledWith('/person/A1234BC/record-recall/update-sentence-types-summary')
    })
  })

  describe('post', () => {
    it('should set bulk update mode to true when user selects yes', async () => {
      req.body.sameSentenceType = 'yes'

      // Mock the parent post method
      const superPostSpy = jest.spyOn(
        MultipleSentenceDecisionController.prototype as unknown as {
          post: typeof MultipleSentenceDecisionController.prototype.post
        },
        'post',
      )

      await controller.post(req, res, next)

      expect(sessionHelper.setSessionValue).toHaveBeenCalledWith(
        req,
        formWizardHelper.sessionModelFields.BULK_UPDATE_MODE,
        true,
      )
      expect(superPostSpy).toHaveBeenCalled()
    })

    it('should set up individual flow when user selects no', async () => {
      req.body.sameSentenceType = 'no'
      ;(sessionHelper.getSessionValue as jest.Mock).mockReturnValue([
        { sentenceUuid: 'sentence-1', isUnknownSentenceType: true },
        { sentenceUuid: 'sentence-2', isUnknownSentenceType: true },
      ])

      // Mock the parent post method
      const superPostSpy = jest.spyOn(
        MultipleSentenceDecisionController.prototype as unknown as {
          post: typeof MultipleSentenceDecisionController.prototype.post
        },
        'post',
      )

      await controller.post(req, res, next)

      expect(sessionHelper.setSessionValue).toHaveBeenCalledWith(
        req,
        formWizardHelper.sessionModelFields.BULK_UPDATE_MODE,
        false,
      )
      expect(sessionHelper.setSessionValue).toHaveBeenCalledWith(
        req,
        formWizardHelper.sessionModelFields.CURRENT_SENTENCE_INDEX,
        0,
      )
      expect((req.form.options as any).next).toBe('/person/A1234BC/record-recall/select-sentence-type/sentence-1')
      expect(superPostSpy).toHaveBeenCalled()
    })
  })

  describe('locals', () => {
    it('should set correct page title', () => {
      const locals = controller.locals(req, res)

      expect(locals.pageTitle).toBe('Is the sentence type the same for all sentences in this court case?')
    })
  })
})
