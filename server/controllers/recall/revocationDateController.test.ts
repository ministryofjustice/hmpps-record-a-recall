import { Response } from 'express'
// eslint-disable-next-line import/no-unresolved
import { Recall } from 'models'
import { ExtendedRequest } from '../base/ExpressBaseController'
import RevocationDateController from './revocationDateController'
import { AdjustmentDto } from '../../@types/adjustmentsApi/adjustmentsApiTypes'
import getJourneyDataFromRequest, { RecallJourneyData } from '../../helpers/recallSessionHelper'

jest.mock('../../helpers/recallSessionHelper', () => {
  const actual = jest.requireActual('../../helpers/recallSessionHelper')
  return {
    __esModule: true,
    ...actual,
    default: jest.fn(),
    getExistingAdjustments: jest.fn(),
    getCrdsSentences: jest.fn().mockReturnValue([]),
    getCourtCaseOptions: jest.fn().mockReturnValue([]),
  }
})

describe('RevocationDateController', () => {
  let req: ExtendedRequest
  let res: Response
  const controller = new RevocationDateController({ route: '/revocation-date' })

  const recallId = 'RECALL_123'
  const nomsId = 'A1234BC'

  beforeEach(() => {
    req = {
      params: { nomsId },
      session: {
        token: 'token',
        userDetails: { userId: 'user1' },
      },
      form: {
        values: {},
        errors: {},
        options: { fields: {} },
      },
      flash: jest.fn(),
      isEditing: false,
      journeyModel: { get: jest.fn(), set: jest.fn(), load: jest.fn(), reset: jest.fn(), data: {} },
    } as unknown as ExtendedRequest

    res = {
      locals: {
        user: { token: 'token', nomisId: nomsId },
        urlInfo: { basePath: '/' },
      },
      render: jest.fn(),
      redirect: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    } as unknown as Response
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('validateFields', () => {
    const validRevocationDate = '2023-01-01'
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 1)
    const futureRevocationDate = futureDate.toISOString().split('T')[0]

    const mockJourneyData = (isEdit: boolean, currentRecallIdVal?: string): RecallJourneyData => ({
      isEdit,
      storedRecall:
        isEdit && currentRecallIdVal
          ? ({
              recallId: currentRecallIdVal,
              createdAt: '2023-01-01T00:00:00.000Z',
              revocationDate: new Date('2023-01-01'),
              returnToCustodyDate: new Date('2023-01-10'),
              recallType: { code: 'LR', description: 'Standard', fixedTerm: false },
              location: 'prison',
              sentenceIds: [],
              courtCaseIds: [],
            } as Recall)
          : undefined,
      revocationDate: undefined,
      revDateString: '',
      inPrisonAtRecall: false,
      returnToCustodyDate: undefined,
      returnToCustodyDateString: '',
      ual: undefined,
      ualText: '',
      manualCaseSelection: false,
      recallType: { code: 'LR', description: 'Standard', fixedTerm: false },
      courtCaseCount: 0,
      eligibleSentenceCount: 0,
      sentenceIds: [],
    })

    const ualAdjustmentLinked: AdjustmentDto = {
      id: 'ual-linked-1',
      bookingId: 123,
      sentenceSequence: 1,
      adjustmentType: 'UNLAWFULLY_AT_LARGE',
      fromDate: '2022-12-20',
      toDate: '2023-01-05',
      days: 17,
      recallId,
      person: nomsId,
    }

    const ualAdjustmentUnlinked: AdjustmentDto = {
      id: 'ual-unlinked-1',
      bookingId: 123,
      sentenceSequence: 1,
      adjustmentType: 'UNLAWFULLY_AT_LARGE',
      fromDate: '2022-12-20',
      toDate: '2023-01-05',
      days: 17,
      recallId: 'OTHER_RECALL_456',
      person: nomsId,
    }

    const ualAdjustmentNoRecallId: AdjustmentDto = {
      id: 'ual-no-recall-1',
      bookingId: 123,
      sentenceSequence: 1,
      adjustmentType: 'UNLAWFULLY_AT_LARGE',
      fromDate: '2022-12-20',
      toDate: '2023-01-05',
      days: 17,
      person: nomsId,
    }

    it('should pass validation with a valid date and no conflicting adjustments', done => {
      ;(req.form.values as { revocationDate: string }).revocationDate = validRevocationDate
      ;(getJourneyDataFromRequest as jest.Mock).mockReturnValue(mockJourneyData(false, undefined))
      ;(jest.requireMock('../../helpers/recallSessionHelper').getExistingAdjustments as jest.Mock).mockReturnValue([])

      controller.validateFields(req, res, errors => {
        expect(Object.keys(errors).length).toBe(0)
        done()
      })
    })

    it('should fail if revocation date is before earliest valid sentence date', done => {
      const earliestSentenceTestSetupDate = new Date()
      earliestSentenceTestSetupDate.setDate(earliestSentenceTestSetupDate.getDate() + 2) // "Day after tomorrow"
      const earliestSentenceDateForTest = earliestSentenceTestSetupDate.toISOString().split('T')[0]

      // Set revocationDate to "tomorrow" (futureRevocationDate), which is before "day after tomorrow" (earliestSentenceDateForTest)
      ;(req.form.values as { revocationDate: string }).revocationDate = futureRevocationDate
      ;(getJourneyDataFromRequest as jest.Mock).mockReturnValue(mockJourneyData(false, undefined))
      ;(jest.requireMock('../../helpers/recallSessionHelper').getExistingAdjustments as jest.Mock).mockReturnValue([])
      // Temporarily override the global mock for getCrdsSentences for this specific test case
      ;(jest.requireMock('../../helpers/recallSessionHelper').getCrdsSentences as jest.Mock).mockReturnValueOnce([
        {
          sentenceDate: earliestSentenceDateForTest,
          bookingId: 123,
          sentenceSequence: 1,
          lineSequence: 1,
          caseSequence: 1,
          recallType: 'STANDARD',
          releaseDate: earliestSentenceDateForTest,
        },
      ])

      controller.validateFields(req, res, errors => {
        expect((errors as Record<string, { type: string; args?: unknown }>).revocationDate.type).toBe(
          'mustBeAfterEarliestSentenceDate',
        )
        done()
      })
    })

    it('Edit Mode - should pass if overlapping UAL is linked to the current recall', done => {
      ;(req.form.values as { revocationDate: string }).revocationDate = '2023-01-01'
      ;(getJourneyDataFromRequest as jest.Mock).mockReturnValue(mockJourneyData(true, recallId))
      ;(jest.requireMock('../../helpers/recallSessionHelper').getExistingAdjustments as jest.Mock).mockReturnValue([
        ualAdjustmentLinked,
      ])

      controller.validateFields(req, res, errors => {
        expect(Object.keys(errors).length).toBe(0)
        done()
      })
    })

    it('Edit Mode - should fail if overlapping UAL is linked to a different recall', done => {
      ;(req.form.values as { revocationDate: string }).revocationDate = '2023-01-01'
      ;(getJourneyDataFromRequest as jest.Mock).mockReturnValue(mockJourneyData(true, recallId))
      ;(jest.requireMock('../../helpers/recallSessionHelper').getExistingAdjustments as jest.Mock).mockReturnValue([
        ualAdjustmentUnlinked,
      ])

      controller.validateFields(req, res, errors => {
        expect((errors as Record<string, { type: string; args?: unknown }>).revocationDate.type).toBe(
          'cannotBeWithinAdjustmentPeriod',
        )
        done()
      })
    })

    it('Edit Mode - should fail if overlapping UAL has no recallId', done => {
      ;(req.form.values as { revocationDate: string }).revocationDate = '2023-01-01'
      ;(getJourneyDataFromRequest as jest.Mock).mockReturnValue(mockJourneyData(true, recallId))
      ;(jest.requireMock('../../helpers/recallSessionHelper').getExistingAdjustments as jest.Mock).mockReturnValue([
        ualAdjustmentNoRecallId,
      ])

      controller.validateFields(req, res, errors => {
        expect((errors as Record<string, { type: string; args?: unknown }>).revocationDate.type).toBe(
          'cannotBeWithinAdjustmentPeriod',
        )
        done()
      })
    })

    it('Create Mode - should fail if overlapping UAL exists (linked to different recall)', done => {
      ;(req.form.values as { revocationDate: string }).revocationDate = '2023-01-01'
      ;(getJourneyDataFromRequest as jest.Mock).mockReturnValue(mockJourneyData(false, undefined))
      ;(jest.requireMock('../../helpers/recallSessionHelper').getExistingAdjustments as jest.Mock).mockReturnValue([
        ualAdjustmentUnlinked,
      ])

      controller.validateFields(req, res, errors => {
        expect((errors as Record<string, { type: string; args?: unknown }>).revocationDate.type).toBe(
          'cannotBeWithinAdjustmentPeriod',
        )
        done()
      })
    })

    it('Create Mode - should fail if overlapping UAL exists (no recallId)', done => {
      ;(req.form.values as { revocationDate: string }).revocationDate = '2023-01-01'
      ;(getJourneyDataFromRequest as jest.Mock).mockReturnValue(mockJourneyData(false, undefined))
      ;(jest.requireMock('../../helpers/recallSessionHelper').getExistingAdjustments as jest.Mock).mockReturnValue([
        ualAdjustmentNoRecallId,
      ])

      controller.validateFields(req, res, errors => {
        expect((errors as Record<string, { type: string; args?: unknown }>).revocationDate.type).toBe(
          'cannotBeWithinAdjustmentPeriod',
        )
        done()
      })
    })
  })
})
