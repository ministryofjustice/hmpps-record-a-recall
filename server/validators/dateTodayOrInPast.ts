import { parse, startOfToday, isEqual, isBefore } from 'date-fns'
import logger from '../../logger'

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
  } catch (e) {
    logger.error(e)
    return false
  }
}
