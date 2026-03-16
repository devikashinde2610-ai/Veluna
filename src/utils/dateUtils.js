// Format date to dd/mm/yyyy for display
export const formatDisplayDate = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return ''
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

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
