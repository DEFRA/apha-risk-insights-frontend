import { format, isDate, parseISO } from 'date-fns'

const DISPLAY_TIME_ZONE = 'Europe/London'

const displayDateFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: DISPLAY_TIME_ZONE,
  day: 'numeric',
  month: 'long',
  year: 'numeric'
})

export function formatDate(value, formattedDateStr = 'EEE do MMMM yyyy') {
  const date = isDate(value) ? value : parseISO(value)

  return format(date, formattedDateStr)
}

/**
 * Formats a date-time as e.g. "1 July 2026" in the Europe/London time zone.
 * @param {string | Date} value - an ISO date-time string or a Date
 * @returns {string}
 * @throws {Error} when the value is missing or not a valid date
 */
export function formatDisplayDate(value) {
  const date = isDate(value) ? value : new Date(value ?? NaN)

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${value}`)
  }

  return displayDateFormatter.format(date)
}
