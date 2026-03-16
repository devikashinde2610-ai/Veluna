import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Circle, Droplets, Leaf, Pencil, Salad, Sparkles } from 'lucide-react'
import supabase, { GROQ_KEY } from '../lib/supabase.js'
import { updateStreak } from '../lib/streak.js'

const MOOD_OPTIONS = ['Energetic', 'Normal', 'Tired', 'Bloated', 'In Pain']
const MEAL_SLOTS = ['Breakfast', 'Lunch', 'Dinner', 'Snack 1', 'Snack 2']
const PHASE_NOTES = {
  menstrual: 'Your body needs iron, warmth, and steady energy today.',
  follicular: 'Fresh, lighter meals can support rising energy and recovery.',
  ovulation: 'Hydration, fiber, and antioxidants can help you feel balanced today.',
  luteal: 'Magnesium, complex carbs, and calming meals can ease late-cycle cravings.',
}
const PHASE_COLORS = {
  menstrual: 'phase-menstrual',
  follicular: 'phase-follicular',
  ovulation: 'phase-ovulation',
  luteal: 'phase-luteal',
}
const FOOD_PREFERENCE_RULES = {
  Vegetarian: 'If Vegetarian: all meals must be completely vegetarian — no meat, no fish, no eggs.',
  'Non-Vegetarian':
    'If Non-Vegetarian: include a good mix of plant and animal protein sources like chicken, fish, eggs.',
  Vegan: 'If Vegan: all meals must be plant based — no dairy, no eggs, no meat.',
}

function getTodayDate() {
  return new Date().toISOString().split('T')[0]
}

function formatLogDate(value) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function normalizeDate(value) {
  if (!value) {
    return null
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function diffInDays(laterDate, earlierDate) {
  return Math.round((laterDate - earlierDate) / (1000 * 60 * 60 * 24))
}

function getCurrentPhase(cycleLogs) {
  const startDates = (cycleLogs ?? []).map((log) => normalizeDate(log.start_date)).filter(Boolean)

  if (startDates.length === 0) {
    return 'luteal'
  }

  const averageCycleLength =
    startDates.length > 1
      ? Math.round(
          startDates
            .slice(0, -1)
            .map((date, index) => diffInDays(date, startDates[index + 1]))
            .reduce((total, value) => total + value, 0) / (startDates.length - 1),
        )
      : 28

  const latestStartDate = startDates[0]
  const today = normalizeDate(new Date())
  const cycleDay =
    ((diffInDays(today, latestStartDate) % averageCycleLength) + averageCycleLength) %
      averageCycleLength +
    1

  if (cycleDay >= 1 && cycleDay <= 5) {
    return 'menstrual'
  }

  if (cycleDay >= 6 && cycleDay <= 13) {
    return 'follicular'
  }

  if (cycleDay >= 14 && cycleDay <= 16) {
    return 'ovulation'
  }

  return 'luteal'
}

function parseSnackValues(snacks) {
  if (!snacks) {
    return { snack1: '', snack2: '' }
  }

  const parts = snacks
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean)

  const snack1 = parts[0]?.replace(/^Snack 1:\s*/i, '') ?? ''
  const snack2 = parts[1]?.replace(/^Snack 2:\s*/i, '') ?? ''

  return { snack1, snack2 }
}

function combineSnackValues(snack1, snack2) {
  return [
    snack1.trim() ? `Snack 1: ${snack1.trim()}` : '',
    snack2.trim() ? `Snack 2: ${snack2.trim()}` : '',
  ]
    .filter(Boolean)
    .join(' | ')
}

function safeArray(value) {
  return Array.isArray(value) ? value : []
}

function parseMealPlanResponse(content) {
  try {
    return JSON.parse(content)
  } catch {
    const cleaned = content
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()
    return JSON.parse(cleaned)
  }
}

function FoodPreferenceBadge({ preference }) {
  if (!preference) {
    return null
  }

  if (preference === 'Vegetarian') {
    return (
      <span className="diet-food-pref-badge vegetarian">
        <Leaf size={14} />
        Vegetarian
      </span>
    )
  }

  if (preference === 'Non-Vegetarian') {
    return (
      <span className="diet-food-pref-badge non-vegetarian">
        <Circle size={10} fill="currentColor" />
        Non-Vegetarian
      </span>
    )
  }

  return (
    <span className="diet-food-pref-badge vegan">
      <Circle size={10} fill="currentColor" />
      Vegan
    </span>
  )
}

async function callGroq(messages, responseFormat) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GROQ_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages,
      temperature: 0.7,
      max_tokens: 1400,
      response_format: responseFormat,
    }),
  })

  if (!response.ok) {
    let errorText = 'Groq API request failed.'
    try {
      const errorBody = await response.json()
      errorText = errorBody.error?.message || errorText
    } catch {
      // ignore response parsing failures
    }
    throw new Error(errorText)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content?.trim() ?? ''
}

export default function Diet() {
  const [profileId, setProfileId] = useState(null)
  const [profile, setProfile] = useState(null)
  const [cycleLogs, setCycleLogs] = useState([])
  const [symptomsToday, setSymptomsToday] = useState([])
  const [mood, setMood] = useState('Normal')
  const [mealPlan, setMealPlan] = useState(null)
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false)
  const [breakfast, setBreakfast] = useState('')
  const [lunch, setLunch] = useState('')
  const [dinner, setDinner] = useState('')
  const [snack1, setSnack1] = useState('')
  const [snack2, setSnack2] = useState('')
  const [waterLitres, setWaterLitres] = useState('')
  const [aiComparison, setAiComparison] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [activeLog, setActiveLog] = useState(null)
  const [existingLogId, setExistingLogId] = useState(null)
  const [isEditingToday, setIsEditingToday] = useState(false)

  const todayDate = getTodayDate()
  const currentPhase = useMemo(() => getCurrentPhase(cycleLogs), [cycleLogs])
  const summaryVisible = Boolean(activeLog) && !isEditingToday

  useEffect(() => {
    let active = true

    async function loadDietCompanion() {
      setLoading(true)
      setError('')

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError || !user) {
          throw new Error(userError?.message || 'Could not load your diet companion.')
        }

        if (!active) {
          return
        }

        setProfileId(user.id)

        const [profileResult, cycleResult, symptomResult, dietTodayResult] = await Promise.all([
          supabase
            .from('profiles')
            .select('age, bmi, family_history_pcos, family_history_thyroid, known_conditions, food_preference')
            .eq('id', user.id)
            .maybeSingle(),
          supabase
            .from('cycle_logs')
            .select('*')
            .eq('profile_id', user.id)
            .order('start_date', { ascending: false })
            .limit(6),
          supabase
            .from('symptom_logs')
            .select('symptoms')
            .eq('profile_id', user.id)
            .eq('log_date', todayDate)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from('diet_logs')
            .select('*')
            .eq('profile_id', user.id)
            .eq('log_date', todayDate)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
        ])

        if (!active) {
          return
        }

        if (profileResult.error) {
          throw new Error(profileResult.error.message || 'Could not load your profile.')
        }
        if (cycleResult.error) {
          throw new Error(cycleResult.error.message || 'Could not load your cycle data.')
        }
        if (symptomResult.error) {
          throw new Error(symptomResult.error.message || 'Could not load today’s symptoms.')
        }
        if (dietTodayResult.error) {
          throw new Error(dietTodayResult.error.message || 'Could not load today’s diet log.')
        }
        const nextProfile = profileResult.data ?? {}
        const nextCycleLogs = cycleResult.data ?? []
        const nextSymptoms = safeArray(symptomResult.data?.symptoms)
        const todayLog = dietTodayResult.data ?? null
        const parsedSnacks = parseSnackValues(todayLog?.snacks ?? '')

        setProfile(nextProfile)
        setCycleLogs(nextCycleLogs)
        setSymptomsToday(nextSymptoms)
        setActiveLog(todayLog)
        setExistingLogId(todayLog?.id ?? null)
        setBreakfast(todayLog?.breakfast ?? '')
        setLunch(todayLog?.lunch ?? '')
        setDinner(todayLog?.dinner ?? '')
        setSnack1(parsedSnacks.snack1)
        setSnack2(parsedSnacks.snack2)
        setWaterLitres(todayLog?.water_litres?.toString() ?? '')
        setAiComparison(todayLog?.ai_feedback ?? '')
        setIsEditingToday(!todayLog)
      } catch (loadError) {
        if (active) {
          setError(loadError.message || 'Could not load your personalized diet companion.')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadDietCompanion()

    return () => {
      active = false
    }
  }, [todayDate])

  const handleGenerateMealPlan = async () => {
    setError('')

    if (!GROQ_KEY) {
      setError('Missing Groq API key. Add VITE_GROQ_KEY to your environment first.')
      return
    }

    setIsGeneratingPlan(true)

    try {
      const knownConditions = profile?.known_conditions?.trim() || 'none noted'
      const foodPreference = profile?.food_preference || 'No stated preference'
      const foodPreferenceRule =
        FOOD_PREFERENCE_RULES[profile?.food_preference] ||
        'No specific food preference was saved, so keep meals balanced and broadly suitable.'
      const prompt = `Create a warm, friendly, personalized meal plan for one day.

Return valid JSON only using this exact shape:
{
  "phase_note": "string",
  "meals": [
    {
      "slot": "Breakfast",
      "meal_name": "string",
      "ingredients": ["string"],
      "why_it_helps": "string",
      "prep_time": "string",
      "nutrient_focus": "string"
    }
  ],
  "foods_to_avoid": ["string"]
}

Requirements:
- Include exactly 5 meals in this order: Breakfast, Lunch, Dinner, Snack 1, Snack 2.
- Tailor the advice to cycle phase, mood, BMI, symptoms, family history, and known conditions.
- Keep the food suggestions practical and realistic.
- "foods_to_avoid" must contain exactly 5 items.
- User food preference is ${foodPreference}. All meal recommendations MUST strictly follow this - if Vegetarian no meat fish or eggs, if Vegan no dairy eggs or meat, if Non-Vegetarian include a healthy mix of plant and animal proteins.
- ${foodPreferenceRule}

User context:
- Current cycle phase: ${currentPhase}
- Today's mood: ${mood}
- BMI: ${profile?.bmi ?? 'unknown'}
- Age: ${profile?.age ?? 'unknown'}
- Family history of PCOS: ${profile?.family_history_pcos ?? 'unknown'}
- Family history of thyroid concerns: ${profile?.family_history_thyroid ?? 'unknown'}
- Known conditions: ${knownConditions}
- Food preference: ${foodPreference}
- Symptoms logged today: ${symptomsToday.length > 0 ? symptomsToday.join(', ') : 'none logged'}`

      const content = await callGroq(
        [
          {
            role: 'system',
            content:
              'You are a warm, evidence-informed women’s health nutrition companion. Return only valid JSON.',
          },
          { role: 'user', content: prompt },
        ],
        { type: 'json_object' },
      )

      const parsedPlan = parseMealPlanResponse(content)
      setMealPlan(parsedPlan)
    } catch (requestError) {
      setError(requestError.message || 'Could not generate your meal plan right now.')
    } finally {
      setIsGeneratingPlan(false)
    }
  }

  const beginEditing = () => {
    if (!activeLog) {
      return
    }

    const parsedSnacks = parseSnackValues(activeLog.snacks ?? '')
    setBreakfast(activeLog.breakfast ?? '')
    setLunch(activeLog.lunch ?? '')
    setDinner(activeLog.dinner ?? '')
    setSnack1(parsedSnacks.snack1)
    setSnack2(parsedSnacks.snack2)
    setWaterLitres(activeLog.water_litres?.toString() ?? '')
    setAiComparison(activeLog.ai_feedback ?? '')
    setExistingLogId(activeLog.id ?? null)
    setIsEditingToday(true)
  }

  const handleSaveLog = async (event) => {
    event.preventDefault()
    setError('')

    if (!profileId) {
      setError('Please wait for your account to finish loading and try again.')
      return
    }

    if (!mealPlan) {
      setError('Generate your personalized meal plan first so Veluna can compare it with what you ate.')
      return
    }

    if (!GROQ_KEY) {
      setError('Missing Groq API key. Add VITE_GROQ_KEY to your environment first.')
      return
    }

    setSaving(true)

    try {
      const combinedSnacks = combineSnackValues(snack1, snack2)
      const payload = {
        profile_id: profileId,
        log_date: todayDate,
        breakfast: breakfast.trim() || null,
        lunch: lunch.trim() || null,
        dinner: dinner.trim() || null,
        snacks: combinedSnacks || null,
        water_litres: waterLitres ? Number(waterLitres) : null,
      }

      const saveQuery = existingLogId
        ? supabase.from('diet_logs').update(payload).eq('id', existingLogId)
        : supabase.from('diet_logs').insert(payload)

      const { data: savedLog, error: saveError } = await saveQuery.select('*').single()
      if (saveError) {
        throw new Error(saveError.message || 'Could not save your nutrition log.')
      }

      const comparisonPrompt = `Compare this recommended nutrition plan with what the user actually ate today. Keep the tone warm, encouraging, and brief. Mention one thing they did well and one gentle suggestion for tomorrow in 2 to 4 sentences.

Recommended plan:
${JSON.stringify(mealPlan, null, 2)}

What they actually ate:
- Breakfast: ${breakfast || 'none'}
- Lunch: ${lunch || 'none'}
- Dinner: ${dinner || 'none'}
- Snack 1: ${snack1 || 'none'}
- Snack 2: ${snack2 || 'none'}
- Water intake: ${waterLitres || '0'} litres`

      const feedbackText = await callGroq(
        [
          {
            role: 'system',
            content:
              'You are a kind women’s health nutrition coach. Keep your comparison practical, positive, and concise.',
          },
          { role: 'user', content: comparisonPrompt },
        ],
      )

      const { error: updateError } = await supabase
        .from('diet_logs')
        .update({ ai_feedback: feedbackText })
        .eq('id', savedLog.id)

      if (updateError) {
        throw new Error(updateError.message || 'Saved your log, but could not attach AI feedback.')
      }

      const nextLog = { ...savedLog, ai_feedback: feedbackText }
      setActiveLog(nextLog)
      setExistingLogId(savedLog.id)
      setAiComparison(feedbackText)
      setIsEditingToday(false)
      const { milestone } = await updateStreak(profileId)
      if (milestone) {
        window.dispatchEvent(new CustomEvent('streakMilestone', { detail: milestone }))
      }
      window.dispatchEvent(new CustomEvent('streakUpdated'))
    } catch (saveError) {
      setError(saveError.message || 'Something went wrong while saving your nutrition log.')
    } finally {
      setSaving(false)
    }
  }

  const planMeals = mealPlan?.meals ?? []

  return (
    <div className="diet-page page-stack">
      <header className="section-title">
        <p className="eyebrow">Daily nourishment</p>
        <h1 className="page-title">
          <span className="page-title-icon" aria-hidden="true">
            <Salad size={22} strokeWidth={1.8} />
          </span>
          <span>Smart Diet Companion</span>
        </h1>
      </header>

      {error ? (
        <div className="status-card status-card-error" role="alert">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="analysis-loading">
          <span className="analysis-spinner" aria-hidden="true"></span>
          <span>Preparing your personalized meal companion...</span>
        </div>
      ) : (
        <>
          <section className="diet-hero-grid">
            <article className="card diet-checkin-card">
              <div className="diet-card-head">
                <div>
                  <p className="card-label">Morning check-in</p>
                  <h2>How are you feeling today?</h2>
                </div>
                <span className={`diet-phase-pill ${PHASE_COLORS[currentPhase]}`}>
                  {currentPhase} phase
                </span>
              </div>

              <div className="diet-mood-row" role="list" aria-label="Mood options">
                {MOOD_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`diet-mood-pill${mood === option ? ' is-active' : ''}`}
                    onClick={() => setMood(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>

              <div className="diet-profile-glance">
                <span>BMI: {profile?.bmi ?? '--'}</span>
                <span>Conditions: {profile?.known_conditions || 'None noted'}</span>
                <span>Food preference: {profile?.food_preference || 'Not set yet'}</span>
                <span>Symptoms today: {symptomsToday.length > 0 ? symptomsToday.join(', ') : 'None logged'}</span>
              </div>

              <button
                type="button"
                className="diet-generate-button"
                onClick={handleGenerateMealPlan}
                disabled={isGeneratingPlan}
              >
                {isGeneratingPlan ? 'Generating your plan...' : 'Generate My Meal Plan'}
              </button>
            </article>

            <article className={`card diet-phase-card ${PHASE_COLORS[currentPhase]}`}>
              <div className="diet-card-head">
                <div>
                  <p className="card-label">Today&apos;s phase</p>
                  <h3>{currentPhase.charAt(0).toUpperCase() + currentPhase.slice(1)}</h3>
                </div>
                <FoodPreferenceBadge preference={profile?.food_preference} />
              </div>
              <p>{mealPlan?.phase_note || PHASE_NOTES[currentPhase]}</p>
            </article>
          </section>

          {mealPlan ? (
            <section className="page-stack">
              <div className="diet-plan-grid">
                {MEAL_SLOTS.map((slot) => {
                  const meal = planMeals.find((item) => item.slot === slot)
                  if (!meal) {
                    return null
                  }

                  return (
                    <article key={slot} className="card diet-meal-card">
                      <div className="diet-card-head">
                        <div>
                          <p className="card-label">{slot}</p>
                          <h3>{meal.meal_name}</h3>
                        </div>
                        <span className="diet-prep-badge">{meal.prep_time}</span>
                      </div>

                      <div className="diet-ingredient-pills">
                        {safeArray(meal.ingredients).map((ingredient) => (
                          <span key={ingredient} className="diet-ingredient-pill">
                            {ingredient}
                          </span>
                        ))}
                      </div>

                      <p className="diet-meal-why">{meal.why_it_helps}</p>
                      <p className="diet-meal-nutrient">
                        <strong>Nutrient focus:</strong> {meal.nutrient_focus}
                      </p>
                    </article>
                  )
                })}
              </div>

              <article className="card diet-avoid-card">
                <div className="diet-card-head">
                  <div>
                    <p className="card-label">Foods to avoid</p>
                    <h3>Today&apos;s gentle watch-outs</h3>
                  </div>
                  <span className="diet-warning-icon" aria-hidden="true">
                    <AlertTriangle size={16} />
                  </span>
                </div>
                <div className="diet-avoid-pills">
                  {safeArray(mealPlan.foods_to_avoid).map((food) => (
                    <span key={food} className="diet-avoid-pill">
                      {food}
                    </span>
                  ))}
                </div>
              </article>
            </section>
          ) : null}

          <section className="page-stack">
            <div className="diet-section-head">
              <div>
                <p className="card-label">What I actually ate</p>
                <h2>Today&apos;s real-life log</h2>
              </div>
              {summaryVisible ? (
                <button type="button" className="diet-edit-button" onClick={beginEditing}>
                  <Pencil size={15} />
                  Edit today
                </button>
              ) : null}
            </div>

            {summaryVisible ? (
              <article className="card diet-summary-card">
                <div className="diet-card-head">
                  <div>
                    <p className="today-summary-date">{formatLogDate(activeLog.log_date)}</p>
                    <h3>Today&apos;s saved meals</h3>
                  </div>
                  <span className="today-summary-check">Saved today</span>
                </div>

                <div className="diet-log-grid">
                  {[
                    ['Breakfast', activeLog.breakfast],
                    ['Lunch', activeLog.lunch],
                    ['Dinner', activeLog.dinner],
                    ['Snack 1', parseSnackValues(activeLog.snacks).snack1],
                    ['Snack 2', parseSnackValues(activeLog.snacks).snack2],
                  ].map(([label, value]) => (
                    <article key={label} className="diet-log-panel">
                      <p className="diet-log-panel-label">{label}</p>
                      <p className="diet-log-panel-value">{value || 'Not logged'}</p>
                    </article>
                  ))}
                </div>

                <div className="diet-summary-footer">
                  <span className="status-pill neutral">
                    <Droplets size={14} />
                    Water: {activeLog.water_litres ?? 0} L
                  </span>
                </div>
              </article>
            ) : null}

            {!summaryVisible || isEditingToday ? (
              <form className="card diet-log-form" onSubmit={handleSaveLog}>
                <div className="diet-log-input-grid">
                  <label className="field">
                    <span>Breakfast</span>
                    <input type="text" value={breakfast} onChange={(event) => setBreakfast(event.target.value)} />
                  </label>
                  <label className="field">
                    <span>Lunch</span>
                    <input type="text" value={lunch} onChange={(event) => setLunch(event.target.value)} />
                  </label>
                  <label className="field">
                    <span>Dinner</span>
                    <input type="text" value={dinner} onChange={(event) => setDinner(event.target.value)} />
                  </label>
                  <label className="field">
                    <span>Snack 1</span>
                    <input type="text" value={snack1} onChange={(event) => setSnack1(event.target.value)} />
                  </label>
                  <label className="field">
                    <span>Snack 2</span>
                    <input type="text" value={snack2} onChange={(event) => setSnack2(event.target.value)} />
                  </label>
                  <label className="field">
                    <span>Water intake (litres)</span>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={waterLitres}
                      onChange={(event) => setWaterLitres(event.target.value)}
                    />
                  </label>
                </div>

                <button type="submit" className="diet-save-button" disabled={saving}>
                  {saving ? 'Saving your log...' : 'Save My Log'}
                </button>
              </form>
            ) : null}

            {aiComparison ? (
              <article className="card diet-ai-card">
                <div className="diet-card-head">
                  <div>
                    <p className="card-label">AI comparison</p>
                    <h3>How today matched your plan</h3>
                  </div>
                  <span className="diet-ai-badge">
                    <Sparkles size={14} />
                    Friendly feedback
                  </span>
                </div>
                <p className="diet-ai-copy">{aiComparison}</p>
              </article>
            ) : null}
          </section>
        </>
      )}
    </div>
  )
}
