import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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

export default function Onboarding({ onComplete }) {
  const todayDate = todayISO()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState(initialFormState)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

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

  const updateField = (key) => (event) => {
    setForm((current) => ({
      ...current,
      [key]: event.target.value,
    }))
  }

  const updateDateField = (key) => (nextValue) => {
    setForm((current) => ({
      ...current,
      [key]: nextValue && isValidDate(nextValue) ? nextValue : '',
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

        <form className="card onboarding-card" onSubmit={handleSubmit}>
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
                  <input type="number" min="1" value={form.age} onChange={updateField('age')} />
                </label>
                <CustomDatePicker
                  label="Date of Birth"
                  value={form.dateOfBirth}
                  maxYear={Number(todayDate.slice(0, 4))}
                  onChange={updateDateField('dateOfBirth')}
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
                  <span>Height in cm</span>
                  <input
                    type="number"
                    min="1"
                    value={form.heightCm}
                    onChange={updateField('heightCm')}
                  />
                </label>
                <label className="field">
                  <span>Weight in kg</span>
                  <input
                    type="number"
                    min="1"
                    step="0.1"
                    value={form.weightKg}
                    onChange={updateField('weightKg')}
                  />
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
                    rows="4"
                    value={form.medicalConditions}
                    onChange={updateField('medicalConditions')}
                  />
                </label>
                <label className="field full-width">
                  <span>Current medications</span>
                  <textarea
                    rows="4"
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

              <div className="field-grid">
                <CustomDatePicker
                  label="Last period start date"
                  value={form.lastPeriodStartDate}
                  maxYear={Number(todayDate.slice(0, 4))}
                  onChange={updateDateField('lastPeriodStartDate')}
                />
                <CustomDatePicker
                  label="Last period end date"
                  value={form.lastPeriodEndDate}
                  maxYear={Number(todayDate.slice(0, 4))}
                  onChange={updateDateField('lastPeriodEndDate')}
                />
              </div>

              <section className="log-section">
                <p className="card-label">Flow intensity</p>
                <div className="pill-row flow-pill-row">
                  {flowOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={`option-pill${form.flowIntensity === option ? ' selected' : ''}`}
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          flowIntensity: option,
                        }))
                      }
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </section>

              <div className="field-grid">
                <CustomDatePicker
                  label="Period before that (optional)"
                  value={form.previousPeriodStartDate}
                  maxYear={Number(todayDate.slice(0, 4))}
                  onChange={updateDateField('previousPeriodStartDate')}
                />
                <CustomDatePicker
                  label="Second to last period end date"
                  value={form.previousPeriodEndDate}
                  maxYear={Number(todayDate.slice(0, 4))}
                  onChange={updateDateField('previousPeriodEndDate')}
                />
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
              </div>

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
