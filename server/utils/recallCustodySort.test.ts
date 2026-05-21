import TestData from '../testutils/testData'
import { sortRecallsWithCurrentPeriodFirst } from './recallCustodySort'

describe('recallCustodySort', () => {
  const activeBookingId = '1233536'

  const recallOnCurrentBooking = () =>
    TestData.existingRecall({
      createdAtTimestamp: '2024-01-01T00:00:00Z',
      courtCases: [{ courtCaseUuid: 'cc-1', bookingId: 1233536, sentences: [] }],
    })

  const recallOnOtherBooking = () =>
    TestData.existingRecall({
      createdAtTimestamp: '2023-01-01T00:00:00Z',
      courtCases: [{ courtCaseUuid: 'cc-2', bookingId: 9999999, sentences: [] }],
    })

  describe('sortRecallsWithCurrentPeriodFirst', () => {
    it('returns current period recalls before previous period recalls', () => {
      const newerPrevious = TestData.existingRecall({
        createdAtTimestamp: '2024-06-01T00:00:00Z',
        courtCases: [{ courtCaseUuid: 'cc-new-previous', bookingId: 9999999, sentences: [] }],
      })
      const olderCurrent = TestData.existingRecall({
        createdAtTimestamp: '2020-01-01T00:00:00Z',
        courtCases: [{ courtCaseUuid: 'cc-old-current', bookingId: 1233536, sentences: [] }],
      })
      const recalls = [newerPrevious, olderCurrent]

      const result = sortRecallsWithCurrentPeriodFirst(recalls, activeBookingId)

      expect(result.map(r => r.courtCases[0]?.courtCaseUuid)).toEqual(['cc-old-current', 'cc-new-previous'])
    })

    it('keeps recalls in created-at order within each period group', () => {
      const recalls = [recallOnOtherBooking(), recallOnCurrentBooking()]

      const result = sortRecallsWithCurrentPeriodFirst(recalls, activeBookingId)

      expect(result.map(r => r.courtCases[0]?.courtCaseUuid)).toEqual(['cc-1', 'cc-2'])
    })
  })
})
