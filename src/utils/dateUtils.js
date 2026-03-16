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
export const todayISO = () => new Date().toISOString().split('T')[0]

// Get min date as 1900-01-01
export const minDateISO = () => '1900-01-01'

// Validate date is within range
export const isValidDate = (dateStr) => {
  if (!dateStr) return false
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return false
  const min = new Date('1900-01-01')
  const max = new Date()
  return d >= min && d <= max
}
