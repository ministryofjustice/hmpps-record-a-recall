import { ExistingRecall } from '../model/ExistingRecall'

const isRecallInCurrentPeriodOfCustody = (
  recall: ExistingRecall,
  activeBookingId: string | undefined,
): boolean => {
  if (!activeBookingId) {
    return true
  }

  if (!recall.courtCases.length) {
    return true
  }

  return recall.courtCases.some(
    courtCase => courtCase.bookingId == null || String(courtCase.bookingId) === activeBookingId,
  )
}

const sortByCreatedAtDesc = (recalls: ExistingRecall[]): ExistingRecall[] =>
  [...recalls].sort(
    (a, b) => new Date(b.createdAtTimestamp).getTime() - new Date(a.createdAtTimestamp).getTime(),
  )

/** AC7: when showing all recalls, current period of custody recalls appear before previous periods. */
export const sortRecallsWithCurrentPeriodFirst = (
  recalls: ExistingRecall[],
  activeBookingId: string | undefined,
): ExistingRecall[] => {
  const currentPeriodRecalls = sortByCreatedAtDesc(
    recalls.filter(recall => isRecallInCurrentPeriodOfCustody(recall, activeBookingId)),
  )
  const previousPeriodRecalls = sortByCreatedAtDesc(
    recalls.filter(recall => !isRecallInCurrentPeriodOfCustody(recall, activeBookingId)),
  )
  return [...currentPeriodRecalls, ...previousPeriodRecalls]
}
