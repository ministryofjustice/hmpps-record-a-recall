import { format, parseISO } from 'date-fns'

export default function formatLongDate(dateOrString: string | Date) {
  const date = typeof dateOrString === 'string' ? parseISO(dateOrString) : dateOrString

  if (!date) {
    return ''
  }

  if (Number.isNaN(date.getTime())) {
    return dateOrString as string
  }

  return format(date, 'd MMMM yyyy')
}
