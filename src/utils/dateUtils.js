const DATE_PARTS_PATTERN = /^(\d{4})-(\d{2})-(\d{2})/

// Parse saved yyyy-mm-dd dates as local calendar days, not UTC timestamps.
export const parseLocalDate = (dateStr) => {
  if (!dateStr) return null

  const match = String(dateStr).match(DATE_PARTS_PATTERN)
  if (!match) return null

  const [, year, month, day] = match
  const parsed = new Date(Number(year), Number(month) - 1, Number(day))

  if (
    parsed.getFullYear() !== Number(year) ||
    parsed.getMonth() !== Number(month) - 1 ||
    parsed.getDate() !== Number(day)
  ) {
    return null
  }

  return parsed
}

export const formatLocalISODate = (date = new Date()) => {
  const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  return [
    localDate.getFullYear(),
    String(localDate.getMonth() + 1).padStart(2, '0'),
    String(localDate.getDate()).padStart(2, '0'),
  ].join('-')
}

// Format saved ISO-style dates to dd/mm/yyyy for display only.
export const formatDate = (dateStr) => {
  if (!dateStr) return ''

  const normalized = String(dateStr).split('T')[0]
  const [year, month, day] = normalized.split('-')

  if (!year || !month || !day) {
    return ''
  }

  return `${day}/${month}/${year}`
}

export const formatDisplayDate = formatDate

// Get today's date in yyyy-mm-dd for input max
export const todayISO = () => formatLocalISODate()

// Get min date as 1900-01-01
export const minDateISO = () => '1900-01-01'

// Validate date is within range
export const isValidDate = (dateStr) => {
  const date = parseLocalDate(dateStr)
  if (!date) return false

  const min = new Date(1900, 0, 1)
  const max = new Date()
  max.setHours(0, 0, 0, 0)

  return date >= min && date <= max
}
