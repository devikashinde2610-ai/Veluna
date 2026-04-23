import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import CustomDatePicker from '../components/CustomDatePicker.jsx'
import supabase from '../lib/supabase.js'
import { isValidDate, todayISO } from '../utils/dateUtils.js'

const initialFormState = {
  fullName: '',
  age: '',
  dateOfBirth: '',
  bloodGroup: '',
  heightCm: '',
  weightKg: '',
  foodPreference: '',
  familyHistoryPcos: 'not sure',
  familyHistoryThyroid: 'not sure',
  medicalConditions: '',
  currentMedications: '',
  lastPeriodStartDate: '',
  lastPeriodEndDate: '',
  flowIntensity: '',
  previousPeriodStartDate: '',
  previousPeriodEndDate: '',
  averageCycleLength: '',
}

const bloodGroupOptions = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']
const familyHistoryOptions = ['yes', 'no', 'not sure']
const foodPreferenceOptions = ['Vegetarian', 'Non-Vegetarian', 'Vegan']
const flowOptions = ['Light', 'Normal', 'Heavy', 'Very Heavy']
const stepLabels = ['Personal Details', 'Body Metrics', 'Medical Background', 'Your Period History']

function toNumberOrNull(value) {
  return value === '' ? null : Number(value)
}

function cmToFtIn(cmValue) {
  const cm = Number(cmValue)
  if (!cm || cm <= 0) return { ft: '', inch: '' }
  const totalInches = cm / 2.54
  const ft = Math.floor(totalInches / 12)
  let inch = Math.round(totalInches - ft * 12)
  if (inch === 12) {
    inch = 0
    return { ft: String(ft + 1), inch: '0' }
  }
  return { ft: String(ft), inch: String(inch) }
}

function ftInToCm(feetValue, inchValue) {
  const feet = Number(feetValue) || 0
  const inches = Number(inchValue) || 0
  const totalInches = feet * 12 + inches
  if (!totalInches) return ''
  return String(Math.round(totalInches * 2.54))
}

function kgToLbs(kgValue) {
  const kg = Number(kgValue)
  if (!kg || kg <= 0) return ''
  return (kg * 2.2046226218).toFixed(1)
}

function lbsToKg(lbsValue) {
  const lbs = Number(lbsValue)
  if (!lbs || lbs <= 0) return ''
  return (lbs / 2.2046226218).toFixed(1)
}

function parseISODate(dateString) {
  if (!dateString || !isValidDate(dateString)) return null
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function toISODate(date) {
  const yyyy = String(date.getFullYear())
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function formatPrettyISO(dateString) {
  const date = parseISODate(dateString)
  if (!date) return ''
  return new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

const RANGE_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function PeriodRangeCalendar({
  title,
  subtitle,
  startISO,
  endISO,
  activeEdge,
  setActiveEdge,
  monthStart,
  setMonthStart,
  minMonthStart,
  maxMonthStart,
  maxISO,
  onSetStart,
  onSetEnd,
}) {
  const maxDate = startOfDay(parseISODate(maxISO) ?? new Date())
  const year = monthStart.getFullYear()
  const monthIndex = monthStart.getMonth()
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const firstWeekday = new Date(year, monthIndex, 1).getDay()

  const startDate = startISO ? startOfDay(parseISODate(startISO) ?? new Date()) : null
  const endDate = endISO ? startOfDay(parseISODate(endISO) ?? new Date()) : null

  const minSelectableForEnd = startDate ?? null

  const isDisabled = (dateObj) => {
    const dayDate = startOfDay(dateObj)
    if (dayDate > maxDate) return true
    if (activeEdge === 'end' && minSelectableForEnd && dayDate < minSelectableForEnd) return true
    return false
  }

  const isInRange = (dateObj) => {
    if (!startDate || !endDate) return false
    const dayDate = startOfDay(dateObj)
    return dayDate > startDate && dayDate < endDate
  }

  const chipValue = (iso) => (iso ? formatPrettyISO(iso) : 'Select')

  const canPrev = monthStart > minMonthStart
  const canNext = monthStart < maxMonthStart
  const monthLabel = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(monthStart)

  return (
    <section className="range-calendar-shell">
      <div className="range-calendar-head">
        <div>
          <p className="card-label">{title}</p>
          {subtitle ? <p className="muted">{subtitle}</p> : null}
        </div>
      </div>

      <div className="range-calendar-chips">
        <button
          type="button"
          className={`range-chip${activeEdge === 'start' ? ' is-active' : ''}`}
          onClick={() => setActiveEdge('start')}
          aria-pressed={activeEdge === 'start'}
        >
          <span className="range-chip-label">Start</span>
          <span className="range-chip-value">{chipValue(startISO)}</span>
        </button>

        <button
          type="button"
          className={`range-chip${activeEdge === 'end' ? ' is-active' : ''}`}
          onClick={() => setActiveEdge('end')}
          aria-pressed={activeEdge === 'end'}
          disabled={!startISO}
          title={!startISO ? 'Select a start date first' : ''}
        >
          <span className="range-chip-label">End</span>
          <span className="range-chip-value">{chipValue(endISO)}</span>
        </button>
      </div>

      <div className="range-calendar-nav">
        <button
          type="button"
          className="onboarding-secondary-button"
          onClick={() => setMonthStart((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
          disabled={!canPrev}
          aria-label="Previous month"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="range-calendar-month">{monthLabel}</div>
        <button
          type="button"
          className="onboarding-secondary-button"
          onClick={() => setMonthStart((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
          disabled={!canNext}
          aria-label="Next month"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="booking-calendar range-calendar-grid" role="group" aria-label="Choose dates">
        <div className="booking-calendar-grid booking-calendar-weekdays" aria-hidden="true">
          {RANGE_WEEKDAYS.map((label) => (
            <div key={label} className="booking-calendar-weekday">{label}</div>
          ))}
        </div>

        <div className="booking-calendar-grid">
          {Array.from({ length: firstWeekday }).map((_, idx) => (
            <div key={`blank-${idx}`} className="booking-calendar-blank"></div>
          ))}

          {Array.from({ length: daysInMonth }, (_, idx) => {
            const day = idx + 1
            const dateObj = new Date(year, monthIndex, day)
            const iso = toISODate(dateObj)
            const disabled = isDisabled(dateObj)
            const selected = iso === startISO || iso === endISO
            const inRange = isInRange(dateObj)

            return (
              <button
                key={iso}
                type="button"
                className={[
                  'booking-calendar-day',
                  selected ? 'is-selected' : '',
                  disabled ? 'is-disabled' : '',
                  inRange ? 'is-in-range' : '',
                ].filter(Boolean).join(' ')}
                onClick={() => {
                  if (disabled) return
                  if (activeEdge === 'start') {
                    onSetStart(iso)
                    setActiveEdge('end')
                    return
                  }
                  onSetEnd(iso)
                }}
                disabled={disabled}
                aria-pressed={selected}
                aria-label={iso}
              >
                {day}
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default function Onboarding({ onComplete }) {
  const todayDate = todayISO()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState(initialFormState)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [flowIntensityLevel, setFlowIntensityLevel] = useState(0)
  const [heightUnit, setHeightUnit] = useState('cm')
  const [heightFt, setHeightFt] = useState('')
  const [heightIn, setHeightIn] = useState('')
  const [weightUnit, setWeightUnit] = useState('kg')
  const [weightLbs, setWeightLbs] = useState('')

  const [lastRangeMonth, setLastRangeMonth] = useState(() => {
    const base = parseISODate(todayDate) ?? new Date()
    return new Date(base.getFullYear(), base.getMonth(), 1)
  })
  const [lastActiveEdge, setLastActiveEdge] = useState('start')
  const [showPreviousRange, setShowPreviousRange] = useState(false)
  const [prevRangeMonth, setPrevRangeMonth] = useState(() => {
    const base = parseISODate(todayDate) ?? new Date()
    return new Date(base.getFullYear(), base.getMonth(), 1)
  })
  const [prevActiveEdge, setPrevActiveEdge] = useState('start')

  const bmi = useMemo(() => {
    const height = Number(form.heightCm)
    const weight = Number(form.weightKg)

    if (!height || !weight) {
      return null
    }

    const meters = height / 100
    return weight / (meters * meters)
  }, [form.heightCm, form.weightKg])

  const progressWidth = `${((step + 1) / stepLabels.length) * 100}%`

  const calculateAge = (dob) => {
    if (!dob) return ''
    const today = new Date()
    const birthDate = new Date(dob)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  const updateField = (key) => (event) => {
    setForm((current) => ({
      ...current,
      [key]: event.target.value,
    }))
  }

  const toggleHeightUnit = (nextUnit) => {
    if (nextUnit === heightUnit) return

    if (nextUnit === 'ftin') {
      const converted = cmToFtIn(form.heightCm)
      setHeightFt(converted.ft)
      setHeightIn(converted.inch)
      setHeightUnit('ftin')
      return
    }

    // Switching to cm: convert current ft/in display to cm and store canonically.
    const cm = ftInToCm(heightFt, heightIn)
    if (cm !== '') {
      setForm((current) => ({ ...current, heightCm: cm }))
    }
    setHeightUnit('cm')
  }

  const toggleWeightUnit = (nextUnit) => {
    if (nextUnit === weightUnit) return

    if (nextUnit === 'lbs') {
      setWeightLbs(kgToLbs(form.weightKg))
      setWeightUnit('lbs')
      return
    }

    const kg = lbsToKg(weightLbs)
    if (kg !== '') {
      setForm((current) => ({ ...current, weightKg: kg }))
    }
    setWeightUnit('kg')
  }

  const handleFeetChange = (event) => {
    const nextFeet = event.target.value
    setHeightFt(nextFeet)
    const cm = ftInToCm(nextFeet, heightIn)
    setForm((current) => ({ ...current, heightCm: cm }))
  }

  const handleInchesChange = (event) => {
    const nextIn = event.target.value
    setHeightIn(nextIn)
    const cm = ftInToCm(heightFt, nextIn)
    setForm((current) => ({ ...current, heightCm: cm }))
  }

  const handleLbsChange = (event) => {
    const nextLbs = event.target.value
    setWeightLbs(nextLbs)
    const kg = lbsToKg(nextLbs)
    setForm((current) => ({ ...current, weightKg: kg }))
  }

  const updateDateField = (key) => (nextValue) => {
    const validValue = nextValue && isValidDate(nextValue) ? nextValue : ''
    setForm((current) => {
      const updated = {
        ...current,
        [key]: validValue,
      }
      return updated
    })
  }

  const handleDobChange = (dateValue) => {
    console.log('[Onboarding Step 1] handleDobChange received:', dateValue)
    if (dateValue && isValidDate(dateValue)) {
      const today = new Date()
      const birth = new Date(dateValue)
      let age = today.getFullYear() - birth.getFullYear()
      const m = today.getMonth() - birth.getMonth()
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
      console.log('[Onboarding Step 1] Calculated age:', age)
      setForm((current) => ({
        ...current,
        dateOfBirth: dateValue,
        age: age.toString(),
      }))
    } else {
      console.log('[Onboarding Step 1] Invalid or empty date, clearing age')
      setForm((current) => ({
        ...current,
        dateOfBirth: '',
        age: '',
      }))
    }
  }

  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  function parseDateString(dateStr) {
    if (!dateStr) return { year: '', month: '', day: '' }
    const parts = dateStr.split('-')
    return {
      year: parts[0] || '',
      month: parts[1] || '',
      day: parts[2] || ''
    }
  }

  function formatDateString(year, month, day) {
    if (year && month && day) {
      return `${year}-${month}-${day}`
    }
    return ''
  }

  function getMonthName(monthNum) {
    const index = Number(monthNum) - 1
    return index >= 0 && index < 12 ? MONTH_NAMES[index] : ''
  }

  function intensityLevelToText(level) {
    const intensities = ['', 'Spotting', 'Light', 'Moderate', 'Heavy', 'Very Heavy']
    return intensities[level] || ''
  }

  function textToIntensityLevel(text) {
    const intensities = ['', 'Spotting', 'Light', 'Moderate', 'Heavy', 'Very Heavy']
    return intensities.indexOf(text) || 0
  }

  function handleIntensityChange(level) {
    setFlowIntensityLevel(level)
    setForm((current) => ({
      ...current,
      flowIntensity: intensityLevelToText(level),
    }))
  }

  const goNext = () => {
    setError('')
    setStep((current) => Math.min(current + 1, stepLabels.length - 1))
  }

  const goBack = () => {
    setError('')
    setStep((current) => Math.max(current - 1, 0))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSaving(true)

    if (!form.lastPeriodStartDate) {
      setError('Please add your last period start date so we can personalize your dashboard.')
      setSaving(false)
      return
    }

    if (form.lastPeriodEndDate && form.lastPeriodEndDate < form.lastPeriodStartDate) {
      setError('Your last period end date cannot be earlier than the start date.')
      setSaving(false)
      return
    }

    if (form.previousPeriodEndDate && !form.previousPeriodStartDate) {
      setError('Please add the start date for the earlier period or clear its end date.')
      setSaving(false)
      return
    }

    if (
      form.previousPeriodStartDate &&
      form.previousPeriodEndDate &&
      form.previousPeriodEndDate < form.previousPeriodStartDate
    ) {
      setError('The earlier period end date cannot be earlier than its start date.')
      setSaving(false)
      return
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setError(userError?.message || 'Could not verify your account.')
      setSaving(false)
      return
    }

    const { error: saveError } = await supabase.from('profiles').upsert(
      {
        id: user.id,
        full_name: form.fullName.trim() || null,
        name: form.fullName.trim() || null,
        age: toNumberOrNull(form.age),
        height_cm: toNumberOrNull(form.heightCm),
        weight_kg: toNumberOrNull(form.weightKg),
        bmi: bmi ? Number(bmi.toFixed(1)) : null,
        blood_group: form.bloodGroup || null,
        food_preference: form.foodPreference || null,
        date_of_birth: form.dateOfBirth || null,
        email: user.email ?? null,
        family_history_pcos: form.familyHistoryPcos || null,
        family_history_thyroid: form.familyHistoryThyroid || null,
        known_conditions: form.medicalConditions.trim() || null,
        medical_conditions: form.medicalConditions.trim() || null,
        current_medications: form.currentMedications.trim() || null,
      },
      { onConflict: 'id' },
    )

    if (saveError) {
      setError(saveError.message || 'Could not save your onboarding details.')
      setSaving(false)
      return
    }

    const cycleLogsToInsert = [
      {
        profile_id: user.id,
        start_date: form.lastPeriodStartDate,
        end_date: form.lastPeriodEndDate || null,
        flow_intensity: form.flowIntensity || null,
        notes: form.averageCycleLength
          ? `Average cycle length from onboarding: ${form.averageCycleLength} days`
          : null,
      },
    ]

    if (form.previousPeriodStartDate) {
      cycleLogsToInsert.push({
        profile_id: user.id,
        start_date: form.previousPeriodStartDate,
        end_date: form.previousPeriodEndDate || null,
        flow_intensity: form.flowIntensity || null,
        notes: null,
      })
    }

    const { error: cycleLogError } = await supabase.from('cycle_logs').insert(cycleLogsToInsert)

    if (cycleLogError) {
      setError(cycleLogError.message || 'Your profile saved, but your period history could not be saved.')
      setSaving(false)
      return
    }

    onComplete?.()
    navigate('/', { replace: true })
  }

  return (
    <div className="onboarding-page">
      <div className="onboarding-shell">
        <header className="onboarding-header">
          <p className="eyebrow">Welcome to Veluna</p>
          <h1>Let&apos;s set up your care profile</h1>
          <p className="onboarding-subtitle">
            A few thoughtful details help Veluna personalize your wellness journey.
          </p>
        </header>

        <section className="onboarding-progress-card">
          <div className="onboarding-progress-head">
            <span>
              Step {step + 1} of {stepLabels.length}
            </span>
            <strong>{stepLabels[step]}</strong>
          </div>
          <div className="onboarding-progress-track" aria-hidden="true">
            <div className="onboarding-progress-fill" style={{ width: progressWidth }}></div>
          </div>
          <div className="onboarding-step-dots" aria-hidden="true">
            {stepLabels.map((label, index) => (
              <span
                key={label}
                className={`onboarding-step-dot${index <= step ? ' is-active' : ''}`}
              ></span>
            ))}
          </div>
        </section>

        {error ? (
          <div className="status-card status-card-error" role="alert">
            {error}
          </div>
        ) : null}

        <form className="card onboarding-card" onSubmit={handleSubmit} onClick={(e) => {
          if (!e.target.closest('.calendar-card-date-picker')) {
            setShowLastPeriodStartDropdown(false)
            setShowLastPeriodEndDropdown(false)
            setShowPreviousStartDropdown(false)
            setShowPreviousEndDropdown(false)
          }
        }}>
          {step === 0 ? (
            <div className="page-stack">
              <div>
                <p className="card-label">Step 1</p>
                <h2>Personal Details</h2>
              </div>

              <div className="field-grid">
                <label className="field full-width">
                  <span>Full Name</span>
                  <input type="text" value={form.fullName} onChange={updateField('fullName')} />
                </label>
                <label className="field">
                  <span>Age</span>
                  <input 
                    type="number" 
                    min="1" 
                    value={form.age} 
                    onChange={updateField('age')}
                    disabled={!!form.dateOfBirth}
                  />
                  {form.dateOfBirth && (
                    <span className="field-note">Auto-calculated from date of birth</span>
                  )}
                </label>
                <CustomDatePicker
                  label="Date of Birth"
                  value={form.dateOfBirth}
                  maxYear={Number(todayDate.slice(0, 4))}
                  onChange={handleDobChange}
                />
                <label className="field">
                  <span>Blood Group</span>
                  <select value={form.bloodGroup} onChange={updateField('bloodGroup')}>
                    <option value="">Select blood group</option>
                    {bloodGroupOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="page-stack">
              <div className="onboarding-step-head">
                <div>
                  <p className="card-label">Step 2</p>
                  <h2>Body Metrics</h2>
                </div>
                <div className="profile-bmi-pill">
                  <span>BMI</span>
                  <strong>{bmi ? bmi.toFixed(1) : '--'}</strong>
                </div>
              </div>

              <div className="field-grid">
                <label className="field">
                  <span className="field-label-row">
                    <span>Height</span>
                    <span className="unit-toggle" aria-label="Height units">
                      <button
                        type="button"
                        className={`unit-pill${heightUnit === 'cm' ? ' is-active' : ''}`}
                        aria-pressed={heightUnit === 'cm'}
                        onClick={() => toggleHeightUnit('cm')}
                      >
                        cm
                      </button>
                      <button
                        type="button"
                        className={`unit-pill${heightUnit === 'ftin' ? ' is-active' : ''}`}
                        aria-pressed={heightUnit === 'ftin'}
                        onClick={() => toggleHeightUnit('ftin')}
                      >
                        ft/in
                      </button>
                    </span>
                  </span>
                  {heightUnit === 'cm' ? (
                    <input
                      type="number"
                      min="1"
                      value={form.heightCm}
                      onChange={updateField('heightCm')}
                      placeholder="162"
                    />
                  ) : (
                    <div className="unit-split-inputs">
                      <input
                        type="number"
                        min="0"
                        placeholder="ft"
                        value={heightFt}
                        onChange={handleFeetChange}
                      />
                      <input
                        type="number"
                        min="0"
                        max="11"
                        placeholder="in"
                        value={heightIn}
                        onChange={handleInchesChange}
                      />
                    </div>
                  )}
                </label>
                <label className="field">
                  <span className="field-label-row">
                    <span>Weight</span>
                    <span className="unit-toggle" aria-label="Weight units">
                      <button
                        type="button"
                        className={`unit-pill${weightUnit === 'kg' ? ' is-active' : ''}`}
                        aria-pressed={weightUnit === 'kg'}
                        onClick={() => toggleWeightUnit('kg')}
                      >
                        kg
                      </button>
                      <button
                        type="button"
                        className={`unit-pill${weightUnit === 'lbs' ? ' is-active' : ''}`}
                        aria-pressed={weightUnit === 'lbs'}
                        onClick={() => toggleWeightUnit('lbs')}
                      >
                        lbs
                      </button>
                    </span>
                  </span>
                  {weightUnit === 'kg' ? (
                    <input
                      type="number"
                      min="1"
                      step="0.1"
                      value={form.weightKg}
                      onChange={updateField('weightKg')}
                      placeholder="58"
                    />
                  ) : (
                    <input
                      type="number"
                      min="1"
                      step="0.1"
                      value={weightLbs}
                      onChange={handleLbsChange}
                      placeholder="127.9"
                    />
                  )}
                </label>
                <div className="field full-width">
                  <span>Food Preference</span>
                  <div className="pill-row preference-pill-row">
                    {foodPreferenceOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        className={`option-pill${form.foodPreference === option ? ' selected' : ''}`}
                        aria-pressed={form.foodPreference === option}
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            foodPreference: option,
                          }))
                        }
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="page-stack">
              <div>
                <p className="card-label">Step 3</p>
                <h2>Medical Background</h2>
              </div>

              <div className="field-grid">
                <label className="field">
                  <span>Family history of PCOS</span>
                  <select
                    value={form.familyHistoryPcos}
                    onChange={updateField('familyHistoryPcos')}
                  >
                    {familyHistoryOptions.map((option) => (
                      <option key={option} value={option}>
                        {option === 'not sure' ? 'Not sure' : option[0].toUpperCase() + option.slice(1)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Family history of thyroid</span>
                  <select
                    value={form.familyHistoryThyroid}
                    onChange={updateField('familyHistoryThyroid')}
                  >
                    {familyHistoryOptions.map((option) => (
                      <option key={option} value={option}>
                        {option === 'not sure' ? 'Not sure' : option[0].toUpperCase() + option.slice(1)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field full-width">
                  <span>Any known conditions</span>
                  <textarea
                    rows="3"
                    value={form.medicalConditions}
                    onChange={updateField('medicalConditions')}
                  />
                </label>
                <label className="field full-width">
                  <span>Current medications</span>
                  <textarea
                    rows="3"
                    value={form.currentMedications}
                    onChange={updateField('currentMedications')}
                  />
                </label>
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="page-stack">
              <div>
                <p className="card-label">Step 4</p>
                <h2>Your Period History</h2>
                <p className="muted">
                  This helps us predict your next period and show you accurate insights right away.
                </p>
              </div>

              <div className="custom-date-picker-stack">
                {/* Last Period Start Date Card */}
                <div className="calendar-card-date-picker">
                  <button
                    type="button"
                    className="calendar-card"
                    onClick={openLastPeriodStartPicker}
                  >
                    <div className="calendar-card-header"></div>
                    {form.lastPeriodStartDate ? (
                      <div className="calendar-card-content">
                        <div className="calendar-card-date">
                          <div className="calendar-card-day">
                            {parseDateString(form.lastPeriodStartDate).day}
                          </div>
                          <div className="calendar-card-month-year">
                            {getMonthName(parseDateString(form.lastPeriodStartDate).month)} {parseDateString(form.lastPeriodStartDate).year}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="calendar-card-content">
                        <div className="calendar-card-placeholder">
                          <Calendar size={24} strokeWidth={1.5} />
                          <div className="calendar-card-placeholder-text">Select</div>
                        </div>
                      </div>
                    )}
                  </button>
                  {showLastPeriodStartDropdown && (
                    <div className="calendar-card-dropdown">
                      <div className="calendar-card-dropdown-row">
                        <select
                          className="calendar-card-select calendar-card-select-day"
                          value={lastStartPickerDay}
                          onChange={(e) => setLastStartPickerDay(e.target.value)}
                        >
                          <option value="">Day</option>
                          {Array.from({ length: 31 }, (_, i) => {
                            const day = String(i + 1).padStart(2, '0')
                            return <option key={day} value={day}>{i + 1}</option>
                          })}
                        </select>
                        <select
                          className="calendar-card-select calendar-card-select-month"
                          value={lastStartPickerMonth}
                          onChange={(e) => setLastStartPickerMonth(e.target.value)}
                        >
                          <option value="">Month</option>
                          {MONTH_NAMES.map((month, i) => {
                            const monthNum = String(i + 1).padStart(2, '0')
                            return <option key={monthNum} value={monthNum}>{month}</option>
                          })}
                        </select>
                        <select
                          className="calendar-card-select calendar-card-select-year"
                          value={lastStartPickerYear}
                          onChange={(e) => setLastStartPickerYear(e.target.value)}
                        >
                          <option value="">Year</option>
                          {Array.from({ length: 150 }, (_, i) => {
                            const year = String(new Date().getFullYear() - i)
                            return <option key={year} value={year}>{year}</option>
                          })}
                        </select>
                      </div>
                      <button
                        type="button"
                        className="calendar-card-confirm-btn"
                        onClick={confirmLastPeriodStart}
                      >
                        Confirm
                      </button>
                    </div>
                  )}
                </div>

                {/* Last Period End Date Card */}
                <div className="calendar-card-date-picker">
                  <button
                    type="button"
                    className="calendar-card"
                    onClick={openLastPeriodEndPicker}
                  >
                    <div className="calendar-card-header end-date"></div>
                    {form.lastPeriodEndDate ? (
                      <div className="calendar-card-content">
                        <div className="calendar-card-date">
                          <div className="calendar-card-day">
                            {parseDateString(form.lastPeriodEndDate).day}
                          </div>
                          <div className="calendar-card-month-year">
                            {getMonthName(parseDateString(form.lastPeriodEndDate).month)} {parseDateString(form.lastPeriodEndDate).year}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="calendar-card-content">
                        <div className="calendar-card-placeholder">
                          <Calendar size={24} strokeWidth={1.5} />
                          <div className="calendar-card-placeholder-text">Select</div>
                        </div>
                      </div>
                    )}
                  </button>
                  {showLastPeriodEndDropdown && (
                    <div className="calendar-card-dropdown">
                      <div className="calendar-card-dropdown-row">
                        <select
                          className="calendar-card-select calendar-card-select-day"
                          value={lastEndPickerDay}
                          onChange={(e) => setLastEndPickerDay(e.target.value)}
                        >
                          <option value="">Day</option>
                          {Array.from({ length: 31 }, (_, i) => {
                            const day = String(i + 1).padStart(2, '0')
                            return <option key={day} value={day}>{i + 1}</option>
                          })}
                        </select>
                        <select
                          className="calendar-card-select calendar-card-select-month"
                          value={lastEndPickerMonth}
                          onChange={(e) => setLastEndPickerMonth(e.target.value)}
                        >
                          <option value="">Month</option>
                          {MONTH_NAMES.map((month, i) => {
                            const monthNum = String(i + 1).padStart(2, '0')
                            return <option key={monthNum} value={monthNum}>{month}</option>
                          })}
                        </select>
                        <select
                          className="calendar-card-select calendar-card-select-year"
                          value={lastEndPickerYear}
                          onChange={(e) => setLastEndPickerYear(e.target.value)}
                        >
                          <option value="">Year</option>
                          {Array.from({ length: 150 }, (_, i) => {
                            const year = String(new Date().getFullYear() - i)
                            return <option key={year} value={year}>{year}</option>
                          })}
                        </select>
                      </div>
                      <button
                        type="button"
                        className="calendar-card-confirm-btn"
                        onClick={confirmLastPeriodEnd}
                      >
                        Confirm
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flow-intensity-container">
                <span className="flow-intensity-label">Flow Intensity</span>
                <div className="flow-intensity-drops">
                  {Array.from({ length: 5 }, (_, i) => (
                    <button
                      key={i + 1}
                      type="button"
                      className={`flow-intensity-drop${flowIntensityLevel >= i + 1 ? ' active' : ''}`}
                      onClick={() => handleIntensityChange(i + 1)}
                    >
                      🩸
                    </button>
                  ))}
                </div>
                <div className="flow-intensity-value">
                  {flowIntensityLevel > 0 ? intensityLevelToText(flowIntensityLevel) : ''}
                </div>
              </div>

              <div className="custom-date-picker-stack">
                {/* Previous Period Start Date Card */}
                <div className="calendar-card-date-picker">
                  <button
                    type="button"
                    className="calendar-card"
                    onClick={openPreviousStartPicker}
                  >
                    <div className="calendar-card-header"></div>
                    {form.previousPeriodStartDate ? (
                      <div className="calendar-card-content">
                        <div className="calendar-card-date">
                          <div className="calendar-card-day">
                            {parseDateString(form.previousPeriodStartDate).day}
                          </div>
                          <div className="calendar-card-month-year">
                            {getMonthName(parseDateString(form.previousPeriodStartDate).month)} {parseDateString(form.previousPeriodStartDate).year}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="calendar-card-content">
                        <div className="calendar-card-placeholder">
                          <Calendar size={24} strokeWidth={1.5} />
                          <div className="calendar-card-placeholder-text">Select</div>
                        </div>
                      </div>
                    )}
                  </button>
                  {showPreviousStartDropdown && (
                    <div className="calendar-card-dropdown">
                      <div className="calendar-card-dropdown-row">
                        <select
                          className="calendar-card-select calendar-card-select-day"
                          value={prevStartPickerDay}
                          onChange={(e) => setPrevStartPickerDay(e.target.value)}
                        >
                          <option value="">Day</option>
                          {Array.from({ length: 31 }, (_, i) => {
                            const day = String(i + 1).padStart(2, '0')
                            return <option key={day} value={day}>{i + 1}</option>
                          })}
                        </select>
                        <select
                          className="calendar-card-select calendar-card-select-month"
                          value={prevStartPickerMonth}
                          onChange={(e) => setPrevStartPickerMonth(e.target.value)}
                        >
                          <option value="">Month</option>
                          {MONTH_NAMES.map((month, i) => {
                            const monthNum = String(i + 1).padStart(2, '0')
                            return <option key={monthNum} value={monthNum}>{month}</option>
                          })}
                        </select>
                        <select
                          className="calendar-card-select calendar-card-select-year"
                          value={prevStartPickerYear}
                          onChange={(e) => setPrevStartPickerYear(e.target.value)}
                        >
                          <option value="">Year</option>
                          {Array.from({ length: 150 }, (_, i) => {
                            const year = String(new Date().getFullYear() - i)
                            return <option key={year} value={year}>{year}</option>
                          })}
                        </select>
                      </div>
                      <button
                        type="button"
                        className="calendar-card-confirm-btn"
                        onClick={confirmPreviousStart}
                      >
                        Confirm
                      </button>
                    </div>
                  )}
                </div>

                {/* Previous Period End Date Card */}
                <div className="calendar-card-date-picker">
                  <button
                    type="button"
                    className="calendar-card"
                    onClick={openPreviousEndPicker}
                  >
                    <div className="calendar-card-header end-date"></div>
                    {form.previousPeriodEndDate ? (
                      <div className="calendar-card-content">
                        <div className="calendar-card-date">
                          <div className="calendar-card-day">
                            {parseDateString(form.previousPeriodEndDate).day}
                          </div>
                          <div className="calendar-card-month-year">
                            {getMonthName(parseDateString(form.previousPeriodEndDate).month)} {parseDateString(form.previousPeriodEndDate).year}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="calendar-card-content">
                        <div className="calendar-card-placeholder">
                          <Calendar size={24} strokeWidth={1.5} />
                          <div className="calendar-card-placeholder-text">Select</div>
                        </div>
                      </div>
                    )}
                  </button>
                  {showPreviousEndDropdown && (
                    <div className="calendar-card-dropdown">
                      <div className="calendar-card-dropdown-row">
                        <select
                          className="calendar-card-select calendar-card-select-day"
                          value={prevEndPickerDay}
                          onChange={(e) => setPrevEndPickerDay(e.target.value)}
                        >
                          <option value="">Day</option>
                          {Array.from({ length: 31 }, (_, i) => {
                            const day = String(i + 1).padStart(2, '0')
                            return <option key={day} value={day}>{i + 1}</option>
                          })}
                        </select>
                        <select
                          className="calendar-card-select calendar-card-select-month"
                          value={prevEndPickerMonth}
                          onChange={(e) => setPrevEndPickerMonth(e.target.value)}
                        >
                          <option value="">Month</option>
                          {MONTH_NAMES.map((month, i) => {
                            const monthNum = String(i + 1).padStart(2, '0')
                            return <option key={monthNum} value={monthNum}>{month}</option>
                          })}
                        </select>
                        <select
                          className="calendar-card-select calendar-card-select-year"
                          value={prevEndPickerYear}
                          onChange={(e) => setPrevEndPickerYear(e.target.value)}
                        >
                          <option value="">Year</option>
                          {Array.from({ length: 150 }, (_, i) => {
                            const year = String(new Date().getFullYear() - i)
                            return <option key={year} value={year}>{year}</option>
                          })}
                        </select>
                      </div>
                      <button
                        type="button"
                        className="calendar-card-confirm-btn"
                        onClick={confirmPreviousEnd}
                      >
                        Confirm
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <label className="field full-width">
                <span>How many days between your periods usually?</span>
                <input
                  type="number"
                  min="1"
                  placeholder="28"
                  value={form.averageCycleLength}
                  onChange={updateField('averageCycleLength')}
                />
              </label>

              <p className="muted">
                Don&apos;t worry if you are not sure — we will learn your cycle over time.
              </p>
            </div>
          ) : null}

          <div className="onboarding-actions">
            <button
              type="button"
              className="onboarding-secondary-button"
              onClick={goBack}
              disabled={step === 0 || saving}
            >
              Back
            </button>

            {step < stepLabels.length - 1 ? (
              <button
                type="button"
                className="pill-button onboarding-primary-button"
                onClick={goNext}
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                className="pill-button onboarding-primary-button"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Submit'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
