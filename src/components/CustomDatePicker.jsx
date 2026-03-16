import { useEffect, useMemo, useState } from 'react'

const MONTH_OPTIONS = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
]

function getDaysInMonth(year, month) {
  if (!year || !month) {
    return 31
  }

  return new Date(Number(year), Number(month), 0).getDate()
}

function parseValue(value) {
  if (!value) {
    return { year: '', month: '', day: '' }
  }

  const normalized = String(value).split('T')[0]
  const [year = '', month = '', day = ''] = normalized.split('-')
  return { year, month, day }
}

export default function CustomDatePicker({
  value,
  onChange,
  label,
  minYear = 1900,
  maxYear = new Date().getFullYear(),
}) {
  const parsedValue = useMemo(() => parseValue(value), [value])
  const [year, setYear] = useState(parsedValue.year)
  const [month, setMonth] = useState(parsedValue.month)
  const [day, setDay] = useState(parsedValue.day)

  useEffect(() => {
    setYear(parsedValue.year)
    setMonth(parsedValue.month)
    setDay(parsedValue.day)
  }, [parsedValue.day, parsedValue.month, parsedValue.year])

  const yearOptions = useMemo(() => {
    const startYear = Number(minYear) || 1900
    const endYear = Number(maxYear) || new Date().getFullYear()
    const years = []

    for (let currentYear = endYear; currentYear >= startYear; currentYear -= 1) {
      years.push(String(currentYear))
    }

    return years
  }, [maxYear, minYear])

  const dayOptions = useMemo(() => {
    const totalDays = getDaysInMonth(year, month)
    return Array.from({ length: totalDays }, (_, index) => ({
      value: String(index + 1).padStart(2, '0'),
      label: String(index + 1),
    }))
  }, [month, year])

  const emitChange = (nextYear, nextMonth, nextDay) => {
    if (nextYear && nextMonth && nextDay) {
      onChange(`${nextYear}-${nextMonth}-${nextDay}`)
      return
    }

    onChange('')
  }

  const handleYearChange = (event) => {
    const nextYear = event.target.value
    const maxDay = getDaysInMonth(nextYear, month)
    const nextDay = day && Number(day) > maxDay ? '' : day

    setYear(nextYear)
    setDay(nextDay)
    emitChange(nextYear, month, nextDay)
  }

  const handleMonthChange = (event) => {
    const nextMonth = event.target.value
    const maxDay = getDaysInMonth(year, nextMonth)
    const nextDay = day && Number(day) > maxDay ? '' : day

    setMonth(nextMonth)
    setDay(nextDay)
    emitChange(year, nextMonth, nextDay)
  }

  const handleDayChange = (event) => {
    const nextDay = event.target.value
    setDay(nextDay)
    emitChange(year, month, nextDay)
  }

  return (
    <label className="field custom-date-picker">
      {label ? <span>{label}</span> : null}
      <div className="custom-date-picker-row">
        <select className="custom-date-select custom-date-select-day" value={day} onChange={handleDayChange}>
          <option value="" disabled>
            Day
          </option>
          {dayOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <span className="custom-date-separator" aria-hidden="true">
          /
        </span>

        <select className="custom-date-select custom-date-select-month" value={month} onChange={handleMonthChange}>
          <option value="" disabled>
            Month
          </option>
          {MONTH_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <span className="custom-date-separator" aria-hidden="true">
          /
        </span>

        <select className="custom-date-select custom-date-select-year" value={year} onChange={handleYearChange}>
          <option value="" disabled>
            Year
          </option>
          {yearOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    </label>
  )
}
