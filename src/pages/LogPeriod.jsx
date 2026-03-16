import { useEffect, useState } from 'react'
import { CalendarDays, Lock } from 'lucide-react'
import supabase from '../lib/supabase.js'
import { updateStreak } from '../lib/streak.js'
import { formatDisplayDate, isValidDate, minDateISO, todayISO } from '../utils/dateUtils.js'

const flowOptions = ['Light', 'Normal', 'Heavy', 'Very Heavy']
const symptomOptions = [
  'Acne',
  'Cramps',
  'Fatigue',
  'Bloating',
  'Mood Swings',
  'Headache',
  'Nausea',
  'Hair Loss',
  'Weight Gain',
  'Breast Tenderness',
  'Sleep Issues',
  'Back Pain',
]

export default function LogPeriod() {
  const [profileId, setProfileId] = useState(null)
  const [startDate, setStartDate] = useState(todayISO())
  const [endDate, setEndDate] = useState('')
  const [flowIntensity, setFlowIntensity] = useState('')
  const [selectedSymptoms, setSelectedSymptoms] = useState([])
  const [notes, setNotes] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [existingLogId, setExistingLogId] = useState(null)
  const [todayLog, setTodayLog] = useState(null)
  const [isEditingToday, setIsEditingToday] = useState(false)

  const todayDate = todayISO()
  const showSummaryCard = Boolean(todayLog) && !isEditingToday
  const isTodayEntry = todayLog?.start_date === todayDate

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

    async function loadTodayLog() {
      const { data, error } = await supabase
        .from('cycle_logs')
        .select('*')
        .eq('profile_id', profileId)
        .eq('start_date', todayDate)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!active) {
        return
      }

      if (error) {
        setErrorMessage(error.message || "Could not load today's period entry.")
        return
      }

      if (data) {
        setExistingLogId(data.id)
        setTodayLog(data)
        setStartDate(data.start_date ?? todayDate)
        setEndDate(data.end_date ?? '')
        setFlowIntensity(data.flow_intensity ?? '')
        setSelectedSymptoms(Array.isArray(data.symptoms) ? data.symptoms : [])
        setNotes(data.notes ?? '')
        setIsEditingToday(false)
        return
      }

      setExistingLogId(null)
      setTodayLog(null)
      setStartDate(todayDate)
      setEndDate('')
      setFlowIntensity('')
      setSelectedSymptoms([])
      setNotes('')
      setIsEditingToday(true)
    }

    loadTodayLog()

    return () => {
      active = false
    }
  }, [profileId, todayDate])

  useEffect(() => {
    const handleVoiceInput = (event) => {
      const transcript = event.detail?.trim()
      if (!transcript) {
        return
      }

      setNotes((current) => (current.trim() ? `${current.trim()} ${transcript}` : transcript))
    }

    window.addEventListener('voiceInput', handleVoiceInput)
    return () => window.removeEventListener('voiceInput', handleVoiceInput)
  }, [])

  const toggleSymptom = (symptom) => {
    setSelectedSymptoms((current) =>
      current.includes(symptom)
        ? current.filter((item) => item !== symptom)
        : [...current, symptom],
    )
  }

  const beginEditing = () => {
    if (!todayLog || !isTodayEntry) {
      return
    }

    setStartDate(todayLog.start_date ?? todayDate)
    setEndDate(todayLog.end_date ?? '')
    setFlowIntensity(todayLog.flow_intensity ?? '')
    setSelectedSymptoms(Array.isArray(todayLog.symptoms) ? todayLog.symptoms : [])
    setNotes(todayLog.notes ?? '')
    setExistingLogId(todayLog.id ?? null)
    setIsEditingToday(true)
  }

  const handleStartDateChange = (event) => {
    const nextValue = event.target.value
    setStartDate(nextValue && isValidDate(nextValue) ? nextValue : '')
  }

  const handleEndDateChange = (event) => {
    const nextValue = event.target.value
    setEndDate(nextValue && isValidDate(nextValue) ? nextValue : '')
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

    try {
      const payload = {
        profile_id: profileId,
        start_date: startDate,
        end_date: endDate || null,
        flow_intensity: flowIntensity || null,
        symptoms: selectedSymptoms,
        notes: notes.trim() || null,
      }
      const response = existingLogId
        ? await supabase.from('cycle_logs').update(payload).eq('id', existingLogId).select().single()
        : await supabase.from('cycle_logs').insert(payload).select().single()

      if (response.error) {
        setErrorMessage(response.error.message)
        setIsSaving(false)
        return
      }

      if (response.data) {
        const { milestone } = await updateStreak(profileId)
        if (milestone) {
          window.dispatchEvent(new CustomEvent('streakMilestone', { detail: milestone }))
        }
        window.dispatchEvent(new CustomEvent('streakUpdated'))

        setSuccessMessage(existingLogId ? 'Period entry updated successfully!' : 'Period logged successfully!')
        setExistingLogId(response.data.id)
        setTodayLog(response.data)
        setIsEditingToday(false)
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
                <p className="today-summary-date">{formatDisplayDate(todayLog.start_date)}</p>
                <h2 className="today-summary-title">
                  {isTodayEntry ? "Today's Period Log" : 'Period Log'}
                </h2>
              </div>
              {isTodayEntry ? (
                <span className="today-summary-check">Logged today</span>
              ) : (
                <span className="today-summary-lock">
                  <Lock size={14} />
                  Past entries cannot be edited
                </span>
              )}
            </div>

            <div className="today-summary-section">
              <span className="status-pill neutral">
                Flow: {todayLog.flow_intensity || 'Not specified'}
              </span>
              {todayLog.end_date ? (
                <span className="status-pill neutral">Ends: {formatDisplayDate(todayLog.end_date)}</span>
              ) : null}
            </div>

            <div className="today-summary-pills">
              {(Array.isArray(todayLog.symptoms) && todayLog.symptoms.length > 0
                ? todayLog.symptoms
                : ['No symptoms listed']).map((symptom) => (
                <span key={symptom} className="today-summary-pill">
                  {symptom}
                </span>
              ))}
            </div>

            {todayLog.notes ? (
              <p className="today-summary-notes">{todayLog.notes}</p>
            ) : (
              <p className="today-summary-notes">No notes added for today&apos;s period log.</p>
            )}

            {isTodayEntry ? (
              <button type="button" className="summary-edit-button" onClick={beginEditing}>
                Edit Today&apos;s Entry
              </button>
            ) : null}
          </section>

          {isTodayEntry ? (
            <p className="entry-edit-note">Entries can only be edited on the same day they were created.</p>
          ) : null}
        </>
      ) : (
        <form className="card form-card log-form" onSubmit={handleSubmit}>
          <div className="field-grid">
            <label className="field">
              <span>Period Start Date</span>
              <input
                type="date"
                value={startDate}
                min={minDateISO()}
                max={todayDate}
                lang="en-GB"
                title={formatDisplayDate(startDate) || 'dd/mm/yyyy'}
                onChange={handleStartDateChange}
                required
              />
            </label>

            <label className="field">
              <span>Period End Date</span>
              <input
                type="date"
                value={endDate}
                min={minDateISO()}
                max={todayDate}
                lang="en-GB"
                title={formatDisplayDate(endDate) || 'dd/mm/yyyy'}
                onChange={handleEndDateChange}
              />
            </label>
          </div>

          <section className="log-section">
            <p className="card-label">Flow intensity</p>
            <div className="pill-row flow-pill-row">
              {flowOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`option-pill${flowIntensity === option ? ' selected' : ''}`}
                  onClick={() => setFlowIntensity(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </section>

          <section className="log-section">
            <p className="card-label">Symptoms</p>
            <div className="pill-row">
              {symptomOptions.map((symptom) => (
                <button
                  key={symptom}
                  type="button"
                  className={`option-pill${selectedSymptoms.includes(symptom) ? ' selected' : ''}`}
                  onClick={() => toggleSymptom(symptom)}
                >
                  {symptom}
                </button>
              ))}
            </div>
          </section>

          <label className="field full-width">
            <span>Anything else you want to note?</span>
            <textarea
              rows="5"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Write anything about your energy, cravings, pain, or how today feels."
            />
          </label>

          <button type="submit" className="pill-button submit-button" disabled={isSaving}>
            {isSaving ? 'Saving...' : existingLogId ? 'Update Entry' : 'Save Entry'}
          </button>
        </form>
      )}
    </div>
  )
}
