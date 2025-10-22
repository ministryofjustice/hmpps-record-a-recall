import { formatISO } from 'date-fns'
import dateTodayOrInPast from './dateTodayOrInPast'

describe('dateTodayOrInPast', () => {
  it('forbids dates in the future', () => {
    const date = new Date()
    date.setHours(0)
    date.setMinutes(0)
    date.setDate(date.getDate() + 1)
    expect(dateTodayOrInPast(formatISO(date, { representation: 'date' }))).toEqual(false)
  })

  it("allows today's date", () => {
    const date = new Date()
    date.setHours(0)
    date.setMinutes(0)
    date.setSeconds(0)
    date.setDate(date.getDate())
    expect(dateTodayOrInPast(formatISO(date, { representation: 'date' }))).toEqual(true)
  })

  it('allows past dates', () => {
    const date = new Date()
    date.setHours(0)
    date.setMinutes(0)
    date.setDate(date.getDate() - 1)
    expect(dateTodayOrInPast(formatISO(date, { representation: 'date' }))).toEqual(true)
  })
})
