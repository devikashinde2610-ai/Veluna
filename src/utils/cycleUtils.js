import { parseLocalDate } from './dateUtils.js'

export const DAY_IN_MS = 1000 * 60 * 60 * 24

export function normalizeDate(value) {
  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate())
  }

  return parseLocalDate(value)
}

export function diffInDays(laterDate, earlierDate) {
  return Math.round((laterDate - earlierDate) / DAY_IN_MS)
}

function getCycleLengthFromNotes(notes) {
  const match = String(notes ?? '').match(/average cycle length from onboarding:\s*(\d+)\s*days/i)
  const cycleLength = match ? Number(match[1]) : null
  return cycleLength && cycleLength >= 21 && cycleLength <= 45 ? cycleLength : null
}

export function getAverageCycleLength(cycleLogs, startDates) {
  const notedCycleLength = (cycleLogs ?? [])
    .map((log) => getCycleLengthFromNotes(log.notes))
    .find(Boolean)

  if (notedCycleLength) {
    return notedCycleLength
  }

  if (startDates.length <= 1) {
    return 28
  }

  const validIntervals = startDates
    .slice(0, -1)
    .map((date, index) => diffInDays(date, startDates[index + 1]))
    .filter((interval) => interval >= 21 && interval <= 45)

  if (validIntervals.length === 0) {
    return 28
  }

  return Math.round(
    validIntervals.reduce((total, value) => total + value, 0) / validIntervals.length,
  )
}
