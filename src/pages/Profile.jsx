import { useEffect, useMemo, useState } from 'react'
import { User } from 'lucide-react'
import supabase from '../lib/supabase.js'
import { formatDisplayDate, isValidDate, minDateISO, todayISO } from '../utils/dateUtils.js'

const bloodGroupOptions = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']
const familyHistoryOptions = ['yes', 'no', 'not sure']
const foodPreferenceOptions = ['Vegetarian', 'Non-Vegetarian', 'Vegan']

function toNumberOrNull(value) {
  return value === '' ? null : Number(value)
}

export default function Profile() {
  const todayDate = todayISO()
  const [profileId, setProfileId] = useState(null)
  const [fullName, setFullName] = useState('')
  const [age, setAge] = useState('')
  const [heightCm, setHeightCm] = useState('')
  const [weightKg, setWeightKg] = useState('')
  const [bloodGroup, setBloodGroup] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [familyHistoryPcos, setFamilyHistoryPcos] = useState('not sure')
  const [familyHistoryThyroid, setFamilyHistoryThyroid] = useState('not sure')
  const [foodPreference, setFoodPreference] = useState('')
  const [knownConditions, setKnownConditions] = useState('')
  const [currentMedications, setCurrentMedications] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const bmi = useMemo(() => {
    const height = Number(heightCm)
    const weight = Number(weightKg)

    if (!height || !weight) {
      return null
    }

    const meters = height / 100
    return weight / (meters * meters)
  }, [heightCm, weightKg])

  useEffect(() => {
    let active = true

    async function loadProfile() {
      setLoading(true)
      setError('')

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!active || !user) {
        setError('Could not load your profile.')
        setLoading(false)
        return
      }

      setProfileId(user.id)

      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!active) {
        return
      }

      if (data) {
        setFullName(data.full_name || '')
        setAge(data.age || '')
        setHeightCm(data.height_cm || '')
        setWeightKg(data.weight_kg || '')
        setBloodGroup(data.blood_group || '')
        setDateOfBirth(data.date_of_birth || '')
        setFamilyHistoryPcos(data.family_history_pcos || '')
        setFamilyHistoryThyroid(data.family_history_thyroid || '')
        setFoodPreference(data.food_preference || '')
        setKnownConditions(data.known_conditions || '')
        setCurrentMedications(data.current_medications || '')
        console.log('Profile loaded successfully:', data)
      }

      if (profileError) {
        console.log('Profile load error:', profileError.message)
        if (profileError.code !== 'PGRST116') {
          setError(profileError.message || 'Could not load your saved profile.')
        }
      }

      setLoading(false)
    }

    loadProfile()

    return () => {
      active = false
    }
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)

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
        full_name: fullName.trim() || null,
        age: toNumberOrNull(age),
        height_cm: toNumberOrNull(heightCm),
        weight_kg: toNumberOrNull(weightKg),
        bmi: bmi ? Number(bmi.toFixed(1)) : null,
        blood_group: bloodGroup || null,
        date_of_birth: dateOfBirth || null,
        family_history_pcos: familyHistoryPcos || null,
        family_history_thyroid: familyHistoryThyroid || null,
        food_preference: foodPreference || null,
        known_conditions: knownConditions.trim() || null,
        current_medications: currentMedications.trim() || null,
      },
      { onConflict: 'id' },
    )

    if (saveError) {
      setError(saveError.message || 'Could not save your profile.')
      setSaving(false)
      return
    }

    setProfileId(user.id)
    setSuccess('Profile saved successfully')
    setSaving(false)
  }

  const handleDateOfBirthChange = (event) => {
    const nextValue = event.target.value
    setDateOfBirth(nextValue && isValidDate(nextValue) ? nextValue : '')
  }

  return (
    <div className="profile-page page-stack">
      <header className="section-title">
        <p className="eyebrow">One time setup</p>
        <h1 className="profile-title page-title">
          <span className="page-title-icon" aria-hidden="true">
            <User size={22} strokeWidth={1.8} />
          </span>
          <span>My Profile</span>
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

      {loading ? (
        <div className="analysis-loading">
          <span className="analysis-spinner" aria-hidden="true"></span>
          <span>Loading your profile...</span>
        </div>
      ) : (
        <form className="page-stack" onSubmit={handleSubmit}>
          <section className="card profile-form-card">
            <div className="card-head">
              <div>
                <p className="card-label">Personal details</p>
                <h3>Basics for more personalized care</h3>
              </div>
              <div className="profile-bmi-pill">
                <span>BMI</span>
                <strong>{bmi ? bmi.toFixed(1) : '--'}</strong>
              </div>
            </div>

            <div className="field-grid">
              <label className="field full-width">
                <span>Full Name</span>
                <input type="text" value={fullName} onChange={(event) => setFullName(event.target.value)} />
              </label>
              <label className="field">
                <span>Age</span>
                <input type="number" min="1" value={age} onChange={(event) => setAge(event.target.value)} />
              </label>
              <label className="field">
                <span>Date of Birth</span>
                <input
                  type="date"
                  value={dateOfBirth}
                  min={minDateISO()}
                  max={todayDate}
                  lang="en-GB"
                  title={formatDisplayDate(dateOfBirth) || 'dd/mm/yyyy'}
                  onChange={handleDateOfBirthChange}
                />
              </label>
              <label className="field">
                <span>Height in cm</span>
                <input
                  type="number"
                  min="1"
                  value={heightCm}
                  onChange={(event) => setHeightCm(event.target.value)}
                />
              </label>
              <label className="field">
                <span>Weight in kg</span>
                <input
                  type="number"
                  min="1"
                  step="0.1"
                  value={weightKg}
                  onChange={(event) => setWeightKg(event.target.value)}
                />
              </label>
              <label className="field">
                <span>Blood Group</span>
                <select value={bloodGroup} onChange={(event) => setBloodGroup(event.target.value)}>
                  <option value="">Select blood group</option>
                  {bloodGroupOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <div className="field full-width">
                <span>Food Preference</span>
                <div className="pill-row preference-pill-row">
                  {foodPreferenceOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={`option-pill${foodPreference === option ? ' selected' : ''}`}
                      aria-pressed={foodPreference === option}
                      onClick={() => setFoodPreference(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="card profile-form-card">
            <div>
              <p className="card-label">Medical background</p>
              <h3>History that can shape your health insights</h3>
            </div>

            <div className="field-grid">
              <label className="field">
                <span>Family history of PCOS</span>
                <select
                  value={familyHistoryPcos}
                  onChange={(event) => setFamilyHistoryPcos(event.target.value)}
                >
                  {familyHistoryOptions.map((option) => (
                    <option key={option} value={option}>
                      {option === 'not sure' ? 'Not sure' : option[0].toUpperCase() + option.slice(1)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Family history of thyroid disorder</span>
                <select
                  value={familyHistoryThyroid}
                  onChange={(event) => setFamilyHistoryThyroid(event.target.value)}
                >
                  {familyHistoryOptions.map((option) => (
                    <option key={option} value={option}>
                      {option === 'not sure' ? 'Not sure' : option[0].toUpperCase() + option.slice(1)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field full-width">
                <span>Any known medical conditions</span>
                <textarea
                  rows="4"
                  value={knownConditions}
                  onChange={(event) => setKnownConditions(event.target.value)}
                  placeholder="PCOS, thyroid concerns, anemia, migraines, or anything else you'd like to track."
                />
              </label>
              <label className="field full-width">
                <span>Current medications if any</span>
                <textarea
                  rows="4"
                  value={currentMedications}
                  onChange={(event) => setCurrentMedications(event.target.value)}
                  placeholder="Include supplements, hormonal medication, thyroid medication, or anything relevant."
                />
              </label>
            </div>
          </section>

          <button type="submit" className="pill-button submit-button" disabled={saving || !profileId}>
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      )}
    </div>
  )
}
