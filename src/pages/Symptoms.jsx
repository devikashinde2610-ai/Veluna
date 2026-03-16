import { useEffect, useMemo, useState } from 'react'
import { HeartPulse, Lock } from 'lucide-react'
import supabase from '../lib/supabase.js'
import { updateStreak } from '../lib/streak.js'
import { formatDisplayDate, isValidDate, minDateISO, todayISO } from '../utils/dateUtils.js'

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

const menopauseSymptomOptions = [
  'Hot Flashes',
  'Night Sweats',
  'Brain Fog',
  'Vaginal Dryness',
  'Mood Changes',
  'Sleep Problems',
  'Weight Changes',
  'Joint Pain',
  'Heart Palpitations',
  'Memory Issues',
]

const MOOD_OPTIONS = [
  { value: 1, label: 'Rough day', color: '#b0b0b0', activeColor: '#b0b0b0' },
  { value: 2, label: 'Could be better', color: '#f4a5b8', activeColor: '#f4a5b8' },
  { value: 3, label: 'Pretty okay', color: '#e87e9a', activeColor: '#e87e9a' },
  { value: 4, label: 'Good day', color: '#e8607a', activeColor: '#e8607a' },
  { value: 5, label: 'Amazing day!', color: '#dc143c', activeColor: '#dc143c' },
]

function HeartIcon({ size = 24, filled = false, color = '#e8607a', broken = false }) {
  if (broken) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
          fill={filled ? color : 'none'}
          stroke={color}
          strokeWidth="1.5"
        />
        <path
          d="M12 6 L10 10 L14 12 L11 17"
          stroke={filled ? '#fff' : color}
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    )
  }

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        fill={filled ? color : 'none'}
        stroke={color}
        strokeWidth="1.5"
      />
    </svg>
  )
}

function MoodHearts({ moodValue, size = 16 }) {
  if (!moodValue || moodValue < 1 || moodValue > 5) {
    return null
  }

  return (
    <span className="mood-hearts-inline" title={MOOD_OPTIONS[moodValue - 1]?.label}>
      {MOOD_OPTIONS.slice(0, moodValue).map((option, index) => (
        <HeartIcon
          key={index}
          size={size + index * 2}
          filled
          color={option.color}
          broken={option.value === 1}
        />
      ))}
    </span>
  )
}

function getSeverityTone(severity) {
  if (severity <= 3) {
    return 'success'
  }

  if (severity <= 6) {
    return 'warning'
  }

  return 'danger'
}

function dedupeLogsByDate(logs) {
  const latestByDate = new Map()

  for (const log of logs ?? []) {
    const key = log.log_date || log.created_at
    if (!latestByDate.has(key)) {
      latestByDate.set(key, log)
    }
  }

  return Array.from(latestByDate.values())
}

export default function Symptoms() {
  const [profileId, setProfileId] = useState(null)
  const [profileAge, setProfileAge] = useState(null)
  const [selectedDate, setSelectedDate] = useState(todayISO())
  const [selectedSymptoms, setSelectedSymptoms] = useState([])
  const [severity, setSeverity] = useState(5)
  const [notes, setNotes] = useState('')
  const [moodRating, setMoodRating] = useState(null)
  const [moodAnimating, setMoodAnimating] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [pastLogs, setPastLogs] = useState([])
  const [existingLogId, setExistingLogId] = useState(null)
  const [activeLog, setActiveLog] = useState(null)
  const [isEditing, setIsEditing] = useState(false)

  const todayDate = todayISO()
  const isSelectedLogReadOnly = Boolean(activeLog) && activeLog.log_date !== todayDate
  const showSummaryCard = Boolean(activeLog) && (!isEditing || isSelectedLogReadOnly)
  const datesWithExistingEntries = useMemo(
    () => new Set(pastLogs.map((log) => log.log_date).filter(Boolean)),
    [pastLogs],
  )

  useEffect(() => {
    let active = true

    async function loadUser() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (!active || userError) {
        return
      }

      setProfileId(user?.id ?? null)

      if (!user?.id) {
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('age')
        .eq('id', user.id)
        .maybeSingle()

      if (!active) {
        return
      }

      setProfileAge(Number(profile?.age) || null)
    }

    loadUser()

    return () => {
      active = false
    }
  }, [])

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

  const loadPastLogs = async (nextProfileId = profileId) => {
    if (!nextProfileId) {
      return
    }

    const { data, error: logsError } = await supabase
      .from('symptom_logs')
      .select('*')
      .eq('profile_id', nextProfileId)
      .order('log_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(30)

    if (logsError) {
      setError(logsError.message || 'Could not load symptom history.')
      return
    }

    setPastLogs(dedupeLogsByDate(data))
  }

  useEffect(() => {
    if (!profileId) {
      return
    }

    let active = true

    async function syncPastLogs() {
      const { data, error: logsError } = await supabase
        .from('symptom_logs')
        .select('*')
        .eq('profile_id', profileId)
        .order('log_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(30)

      if (!active) {
        return
      }

      if (logsError) {
        setError(logsError.message || 'Could not load symptom history.')
        return
      }

      setPastLogs(dedupeLogsByDate(data))
    }

    syncPastLogs()

    return () => {
      active = false
    }
  }, [profileId])

  useEffect(() => {
    if (!profileId || !selectedDate) {
      return
    }

    let active = true

    async function loadSelectedLog() {
      const { data, error: existingError } = await supabase
        .from('symptom_logs')
        .select('*')
        .eq('profile_id', profileId)
        .eq('log_date', selectedDate)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!active) {
        return
      }

      if (existingError) {
        setError(existingError.message || 'Could not load the symptom entry for this date.')
        return
      }

      if (data) {
        setActiveLog(data)
        setExistingLogId(data.id)
        setSelectedSymptoms(Array.isArray(data.symptoms) ? data.symptoms : [])
        setSeverity(Number(data.severity) || 5)
        setNotes(data.notes ?? '')
        setMoodRating(data.mood_rating ?? null)
        setIsEditing(false)
        return
      }

      setActiveLog(null)
      setExistingLogId(null)
      setSelectedSymptoms([])
      setSeverity(5)
      setNotes('')
      setMoodRating(null)
      setIsEditing(true)
    }

    loadSelectedLog()

    return () => {
      active = false
    }
  }, [profileId, selectedDate])

  const trendLogs = useMemo(() => pastLogs.slice(0, 10).reverse(), [pastLogs])

  const toggleSymptom = (symptom) => {
    setSelectedSymptoms((current) =>
      current.includes(symptom)
        ? current.filter((item) => item !== symptom)
        : [...current, symptom],
    )
  }

  const selectMood = (value) => {
    setMoodRating(value)
    setMoodAnimating(value)
    setTimeout(() => setMoodAnimating(null), 400)
  }

  const handleSelectedDateChange = (event) => {
    const nextValue = event.target.value
    setSelectedDate(nextValue && isValidDate(nextValue) ? nextValue : '')
  }

  const beginEditing = () => {
    if (!activeLog || activeLog.log_date !== todayDate) {
      return
    }

    setSelectedSymptoms(Array.isArray(activeLog.symptoms) ? activeLog.symptoms : [])
    setSeverity(Number(activeLog.severity) || 5)
    setNotes(activeLog.notes ?? '')
    setMoodRating(activeLog.mood_rating ?? null)
    setExistingLogId(activeLog.id ?? null)
    setIsEditing(true)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    if (!profileId) {
      setError('Please wait for your account to finish loading and try again.')
      setLoading(false)
      return
    }

    const payload = {
      profile_id: profileId,
      log_date: selectedDate,
      symptoms: selectedSymptoms,
      severity,
      notes: notes.trim() || null,
      mood_rating: moodRating || null,
    }
    const saveResponse = existingLogId
      ? await supabase.from('symptom_logs').update(payload).eq('id', existingLogId).select().single()
      : await supabase.from('symptom_logs').insert(payload).select().single()

    const { data: savedLog, error: saveError } = saveResponse

    if (saveError) {
      setError(saveError.message || 'Could not save your symptom log.')
      setLoading(false)
      return
    }

    const { milestone } = await updateStreak(profileId)
    if (milestone) {
      window.dispatchEvent(new CustomEvent('streakMilestone', { detail: milestone }))
    }
    window.dispatchEvent(new CustomEvent('streakUpdated'))

    setSuccess(existingLogId ? 'Symptoms updated successfully!' : 'Symptoms saved successfully!')
    setExistingLogId(savedLog.id)
    setActiveLog(savedLog)
    setIsEditing(false)
    await loadPastLogs(profileId)
    setLoading(false)
  }

  return (
    <div className="symptoms-page page-stack">
      <header className="section-title">
        <p className="eyebrow">Daily check-in</p>
        <h1 className="page-title">
          <span className="page-title-icon" aria-hidden="true">
            <HeartPulse size={22} strokeWidth={1.8} />
          </span>
          <span>Symptom Tracker</span>
        </h1>
      </header>

      {error ? (
        <div className="status-card status-card-error" role="alert">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="status-card status-card-success" role="status">
          {success}
        </div>
      ) : null}

      <section className="card symptoms-date-card">
        <label className="field">
          <span>Log for date</span>
          <input
            type="date"
            value={selectedDate}
            min={minDateISO()}
            onChange={handleSelectedDateChange}
            max={todayDate}
            lang="en-GB"
            title={formatDisplayDate(selectedDate) || 'dd/mm/yyyy'}
          />
        </label>
        {selectedDate !== todayDate && datesWithExistingEntries.has(selectedDate) ? (
          <p className="entry-date-note">
            <Lock size={14} />
            Past entries cannot be edited once the day has passed.
          </p>
        ) : null}
      </section>

      {showSummaryCard ? (
        <>
          <section className="card today-summary-card">
            <div className="today-summary-head">
              <div>
                <p className="today-summary-date">{formatDisplayDate(activeLog.log_date)}</p>
                <h2 className="today-summary-title">
                  {activeLog.log_date === todayDate ? "Today's Symptom Log" : 'Symptom Log'}
                </h2>
              </div>
              {isSelectedLogReadOnly ? (
                <span className="today-summary-lock">
                  <Lock size={14} />
                  Past entries cannot be edited
                </span>
              ) : (
                <span className="today-summary-check">Logged today</span>
              )}
            </div>

            <div className="today-summary-section">
              <span className={`status-pill ${getSeverityTone(Number(activeLog.severity) || 0)}`}>
                Severity {activeLog.severity ?? '-'}
              </span>
            </div>

            <div className="today-summary-pills">
              {(Array.isArray(activeLog.symptoms) && activeLog.symptoms.length > 0
                ? activeLog.symptoms
                : ['No symptoms listed']).map((symptom) => (
                <span key={symptom} className="today-summary-pill">
                  {symptom}
                </span>
              ))}
            </div>

            {activeLog.mood_rating ? (
              <div className="today-summary-mood">
                <MoodHearts moodValue={activeLog.mood_rating} size={16} />
                <span className="mood-label-inline">
                  {MOOD_OPTIONS[activeLog.mood_rating - 1]?.label || ''}
                </span>
              </div>
            ) : null}

            {activeLog.notes ? (
              <p className="today-summary-notes">{activeLog.notes}</p>
            ) : (
              <p className="today-summary-notes">No notes added for this symptom log.</p>
            )}

            {activeLog.log_date === todayDate ? (
              <button type="button" className="summary-edit-button" onClick={beginEditing}>
                Edit Today&apos;s Entry
              </button>
            ) : null}
          </section>

          {activeLog.log_date === todayDate ? (
            <p className="entry-edit-note">Entries can only be edited on the same day they were created.</p>
          ) : null}
        </>
      ) : (
        <>
          <section className="card mood-rating-card">
            <h2 className="mood-rating-title">How was your day today?</h2>
            <div className="mood-options-row">
              {MOOD_OPTIONS.map((option) => {
                const isSelected = moodRating !== null && moodRating >= option.value
                const isExactSelection = moodRating === option.value
                const isAnimating = moodAnimating !== null && option.value <= moodAnimating

                return (
                  <button
                    key={option.value}
                    type="button"
                    className={[
                      'mood-option-btn',
                      isSelected ? 'is-selected' : '',
                      isExactSelection ? 'is-exact' : '',
                      isAnimating ? 'is-animating' : '',
                    ].filter(Boolean).join(' ')}
                    onClick={() => selectMood(option.value)}
                    title={option.label}
                  >
                    <span className="mood-heart-icon">
                      <HeartIcon
                        size={20 + option.value * 4}
                        filled={isSelected}
                        color={isSelected ? option.activeColor : '#d4d4d4'}
                        broken={option.value === 1}
                      />
                    </span>
                    <span className="mood-option-label">{option.label}</span>
                  </button>
                )
              })}
            </div>
          </section>

          <form className="page-stack" onSubmit={handleSubmit}>
            <section className="card symptoms-form-card">
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

              {profileAge !== null && profileAge >= 37 ? (
                <div className="page-stack">
                  <div>
                    <p className="card-label">Menopause symptoms</p>
                    <p className="muted">
                      Track common perimenopause and menopause changes alongside your regular symptoms.
                    </p>
                  </div>
                  <div className="pill-row">
                    {menopauseSymptomOptions.map((symptom) => (
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
                </div>
              ) : null}

              <div className="severity-section">
                <div className="severity-head">
                  <label htmlFor="severity" className="field-label-inline">
                    Severity
                  </label>
                  <span className="severity-value">{severity}</span>
                </div>
                <input
                  id="severity"
                  className="severity-slider"
                  type="range"
                  min="1"
                  max="10"
                  value={severity}
                  onChange={(event) => setSeverity(Number(event.target.value))}
                />
              </div>

              <label className="field full-width">
                <span>Additional notes</span>
                <textarea
                  rows="4"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Anything about timing, triggers, relief, or how you felt today."
                />
              </label>
            </section>

            <button type="submit" className="pill-button submit-button" disabled={loading}>
              {loading ? 'Saving...' : existingLogId ? 'Update Entry' : 'Save Entry'}
            </button>
          </form>
        </>
      )}

      <section className="page-stack">
        <div className="card-head">
          <div>
            <p className="card-label">Symptom history</p>
            <h3>Recent entries</h3>
          </div>
        </div>

        {pastLogs.length === 0 ? (
          <section className="card">
            <p className="muted">No symptom history yet.</p>
          </section>
        ) : (
          pastLogs.map((log, index) => (
            <article key={log.id ?? index} className="card symptom-history-card">
              <div className="symptom-history-head">
                <p className="symptom-history-date">{formatDisplayDate(log.log_date)}</p>
                <div className="history-entry-meta">
                  {log.log_date !== todayDate ? (
                    <span className="history-lock-badge">
                      <Lock size={13} />
                      Read only
                    </span>
                  ) : null}
                  <span className={`status-pill ${getSeverityTone(Number(log.severity) || 0)}`}>
                    Severity {log.severity ?? '-'}
                  </span>
                </div>
              </div>
              {log.mood_rating ? (
                <div className="symptom-history-mood">
                  <MoodHearts moodValue={log.mood_rating} size={14} />
                  <span className="mood-label-inline">
                    {MOOD_OPTIONS[log.mood_rating - 1]?.label || ''}
                  </span>
                </div>
              ) : null}
              <div className="pill-row symptom-history-pills">
                {(Array.isArray(log.symptoms) ? log.symptoms : []).map((symptom) => (
                  <span key={symptom} className="symptom-chip">
                    {symptom}
                  </span>
                ))}
              </div>
              {log.notes ? <p className="muted">{log.notes}</p> : null}
            </article>
          ))
        )}
      </section>

      <section className="card trend-card">
        <p className="card-label">Severity trend</p>
        <h3>Last 10 logs</h3>
        {trendLogs.length === 0 ? (
          <p className="muted">Save symptom logs to see your trend.</p>
        ) : (
          <div className="trend-chart">
            {trendLogs.map((log, index) => {
              const value = Number(log.severity) || 0
              return (
                <div key={log.id ?? index} className="trend-bar-group">
                  <div className="trend-bar-wrap">
                    <div
                      className="trend-bar"
                      style={{ height: `${Math.max(value * 10, 8)}%` }}
                      title={`Severity ${value}`}
                    ></div>
                  </div>
                  <span className="trend-label">{formatDisplayDate(log.log_date)}</span>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
