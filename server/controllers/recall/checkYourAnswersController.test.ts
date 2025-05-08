/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { jest } from '@jest/globals'
import CheckYourAnswersController from './checkYourAnswersController'
import getJourneyDataFromRequest, { getUalToEdit, getUalToCreate } from '../../helpers/formWizardHelper'

jest.mock('../../helpers/formWizardHelper', () => ({
  __esModule: true,
  default: jest.fn(),
  getJourneyDataFromRequest: jest.fn(),
  getUalToEdit: jest.fn(),
  getUalToCreate: jest.fn(),
}))

jest.mock('../../../logger')

describe('CheckYourAnswersController - saveValues (edit path)', () => {
  let req: any
  let res: any
  let next: jest.Mock
  let checkYourAnswersController: CheckYourAnswersController

  beforeEach(() => {
    req = {
      services: {
        recallService: {
          postRecall: jest.fn(),
        },
        adjustmentsService: {
          postUal: jest.fn(),
          updateUal: jest.fn(),
        },
      },
      flash: jest.fn(),
    }

    res = {
      locals: {
        nomisId: 'A1234BC',
        user: {
          username: 'bob',
          activeCaseload: { id: 'MDI' },
        },
      },
    }

    next = jest.fn()

    checkYourAnswersController = new CheckYourAnswersController({ route: '/check-your-answers' })
  })

  it('should call updateUal when ualToEdit exists and ualToCreate does not', async () => {
    const mockJourneyData = {
      revDateString: '2023-09-30',
      returnToCustodyDateString: '2023-10-01',
      recallType: { code: 'FIXED' },
      sentenceIds: ['SENT1'],
    }

    const mockCreateResponse = { recallUuid: 'abc-123' }

    const mockUalToEdit = {
      adjustmentId: 'adj-001',
      bookingId: 'B123',
      firstDay: '2023-10-01',
      lastDay: '2023-10-15',
      nomisId: 'A1234BC',
    }

    // Mocks
    // @ts-expect-error
    getJourneyDataFromRequest.mockReturnValue(mockJourneyData)
    // @ts-expect-error
    getUalToEdit.mockReturnValue({ ...mockUalToEdit })
    // @ts-expect-error
    getUalToCreate.mockReturnValue(null)
    req.services.recallService.postRecall.mockResolvedValue(mockCreateResponse)

    await checkYourAnswersController.saveValues(req, res, next)

    const updatedUalArg = req.services.adjustmentsService.updateUal.mock.calls[0][0]

    expect(updatedUalArg).toEqual(
      expect.objectContaining({
        adjustmentId: 'adj-001',
        nomisId: 'A1234BC',
        recallId: 'abc-123',
      }),
    )

    expect(req.services.recallService.postRecall).toHaveBeenCalledWith(
      expect.objectContaining({
        prisonerId: 'A1234BC',
        revocationDate: '2023-09-30',
        returnToCustodyDate: '2023-10-01',
        recallTypeCode: 'FIXED',
        createdByUsername: 'bob',
        createdByPrison: 'MDI',
        sentenceIds: ['SENT1'],
      }),
      'bob',
    )

    expect(req.services.adjustmentsService.updateUal).toHaveBeenCalledWith(
      expect.objectContaining({
        adjustmentId: 'adj-001',
        nomisId: 'A1234BC',
      }),
      'bob',
      'adj-001',
    )

    expect(req.services.adjustmentsService.postUal).not.toHaveBeenCalled()

    expect(next).toHaveBeenCalled()
  })
})
