import { parse, startOfToday, isEqual, isBefore } from 'date-fns'

export default function dateTodayOrInPast(value: string): boolean {
  if (value === '') {
    return true
  }

  try {
    const inputDate = parse(value, 'yyyy-MM-dd', new Date())

    if (Number.isNaN(inputDate.getTime())) {
      return false
    }

    const today = startOfToday()

    return isEqual(inputDate, today) || isBefore(inputDate, today)
  } catch (_e) {
    return false
  }
}
