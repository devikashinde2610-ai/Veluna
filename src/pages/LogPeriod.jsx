import { useEffect, useState } from 'react'
import { CalendarDays, Lock } from 'lucide-react'
import CustomDatePicker from '../components/CustomDatePicker.jsx'
import supabase from '../lib/supabase.js'
import { updateStreak } from '../lib/streak.js'
import { formatDisplayDate, isValidDate, todayISO } from '../utils/dateUtils.js'

function getMonthBounds(dateString) {
  const [year, month] = dateString.split('-').map(Number)
  const monthStart = new Date(year, month - 1, 1)
  const nextMonthStart = new Date(year, month, 1)

  return {
    monthStart: `${String(monthStart.getFullYear())}-${String(monthStart.getMonth() + 1).padStart(2, '0')}-01`,
    nextMonthStart: `${String(nextMonthStart.getFullYear())}-${String(nextMonthStart.getMonth() + 1).padStart(2, '0')}-01`,
  }
}

export default function LogPeriod() {
  const [profileId, setProfileId] = useState(null)
  const [startDate, setStartDate] = useState(todayISO())
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [existingLogId, setExistingLogId] = useState(null)
  const [currentMonthLog, setCurrentMonthLog] = useState(null)
  const [isEditingCurrentMonth, setIsEditingCurrentMonth] = useState(false)

  const todayDate = todayISO()
  const showSummaryCard = Boolean(currentMonthLog) && !isEditingCurrentMonth

  useEffect(() => {
    let active = true

    async function loadUser() {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()

      if (!active || error) {
        return
      }

      setProfileId(user?.id ?? null)
    }

    loadUser()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!profileId) {
      return
    }

    let active = true

    async function loadCurrentMonthLog() {
      const { monthStart, nextMonthStart } = getMonthBounds(todayDate)

      const { data, error } = await supabase
        .from('cycle_logs')
        .select('*')
        .eq('profile_id', profileId)
        .gte('start_date', monthStart)
        .lt('start_date', nextMonthStart)
        .order('start_date', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!active) {
        return
      }

      if (error) {
        setErrorMessage(error.message || "Could not load this month's period entry.")
        return
      }

      if (data) {
        setExistingLogId(data.id)
        setCurrentMonthLog(data)
        setStartDate(data.start_date ?? todayDate)
        setIsEditingCurrentMonth(false)
        return
      }

      setExistingLogId(null)
      setCurrentMonthLog(null)
      setStartDate(todayDate)
      setIsEditingCurrentMonth(true)
    }

    loadCurrentMonthLog()

    return () => {
      active = false
    }
  }, [profileId, todayDate])

  const beginEditing = () => {
    if (!currentMonthLog) {
      return
    }

    setStartDate(currentMonthLog.start_date ?? todayDate)
    setExistingLogId(currentMonthLog.id ?? null)
    setIsEditingCurrentMonth(true)
    setSuccessMessage('')
    setErrorMessage('')
  }

  const handleStartDateChange = (nextValue) => {
    setStartDate(nextValue && isValidDate(nextValue) && nextValue <= todayDate ? nextValue : '')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSuccessMessage('')
    setErrorMessage('')
    setIsSaving(true)

    if (!profileId) {
      setErrorMessage('Please wait for your account to finish loading and try again.')
      setIsSaving(false)
      return
    }

    if (!startDate) {
      setErrorMessage('Please choose your period start date.')
      setIsSaving(false)
      return
    }

    if (startDate > todayDate) {
      setErrorMessage('You can only log a period for today or a past date.')
      setIsSaving(false)
      return
    }

    try {
      const { monthStart, nextMonthStart } = getMonthBounds(startDate)
      const { data: monthlyLogs, error: monthlyLogError } = await supabase
        .from('cycle_logs')
        .select('id, start_date')
        .eq('profile_id', profileId)
        .gte('start_date', monthStart)
        .lt('start_date', nextMonthStart)

      if (monthlyLogError) {
        setErrorMessage(monthlyLogError.message || 'Could not validate your monthly period log.')
        setIsSaving(false)
        return
      }

      const conflictingLog = (monthlyLogs ?? []).find((log) => log.id !== existingLogId)
      const targetLogId = conflictingLog?.id ?? existingLogId

      const payload = {
        profile_id: profileId,
        start_date: startDate,
        end_date: null,
        flow_intensity: null,
        symptoms: [],
        notes: null,
      }

      const response = targetLogId
        ? await supabase.from('cycle_logs').update(payload).eq('id', targetLogId).select().single()
        : await supabase.from('cycle_logs').insert(payload).select().single()

      if (response.error) {
        setErrorMessage(response.error.message || 'Could not save your period log.')
        setIsSaving(false)
        return
      }

      if (response.data) {
        const { milestone } = await updateStreak(profileId)
        if (milestone) {
          window.dispatchEvent(new CustomEvent('streakMilestone', { detail: milestone }))
        }
        window.dispatchEvent(new CustomEvent('streakUpdated'))

        const savedMonthKey = response.data.start_date?.slice(0, 7)
        const currentMonthKey = todayDate.slice(0, 7)

        setSuccessMessage(targetLogId ? 'Period date updated successfully!' : 'Period date logged successfully!')

        if (savedMonthKey === currentMonthKey) {
          setExistingLogId(response.data.id)
          setCurrentMonthLog(response.data)
          setIsEditingCurrentMonth(false)
        } else {
          setExistingLogId(null)
          setStartDate(todayDate)
        }
      }

      setIsSaving(false)
    } catch (submitError) {
      setErrorMessage(
        submitError.message || 'Something went wrong while saving your period log.',
      )
      setIsSaving(false)
    }
  }

  return (
    <div className="log-period-page page-stack">
      <header className="section-title">
        <p className="eyebrow">Cycle tracking</p>
        <h1 className="page-title">
          <span className="page-title-icon" aria-hidden="true">
            <CalendarDays size={22} strokeWidth={1.8} />
          </span>
          <span>Log Your Period</span>
        </h1>
      </header>

      {errorMessage ? (
        <div className="status-card status-card-error" role="alert">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="status-card status-card-success" role="status">
          {successMessage}
        </div>
      ) : null}

      {showSummaryCard ? (
        <>
          <section className="card today-summary-card">
            <div className="today-summary-head">
              <div>
                <p className="today-summary-date">{formatDisplayDate(currentMonthLog.start_date)}</p>
                <h2 className="today-summary-title">This Month&apos;s Period Log</h2>
              </div>
              <span className="today-summary-lock">
                <Lock size={14} />
                One period log this month
              </span>
            </div>

            <p className="today-summary-notes">
              Your saved period start date can be updated anytime for this month.
            </p>

            <button type="button" className="summary-edit-button" onClick={beginEditing}>
              Update This Month&apos;s Date
            </button>
          </section>
        </>
      ) : (
        <form className="card form-card log-form" onSubmit={handleSubmit}>
          <CustomDatePicker
            label="Period Start Date"
            value={startDate}
            maxYear={Number(todayDate.slice(0, 4))}
            maxDate={todayDate}
            onChange={handleStartDateChange}
          />

          <p className="muted">
            Choose the day your period started. If this month already has a saved date, saving will update it.
          </p>

          <button type="submit" className="pill-button submit-button" disabled={isSaving}>
            {isSaving ? 'Saving...' : existingLogId ? 'Update Date' : 'Save Date'}
          </button>
        </form>
      )}
    </div>
  )
}
