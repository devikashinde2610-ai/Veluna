import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Droplets, Flame, Leaf, Moon, Plus, Sparkles, Sprout, SunMedium, X } from 'lucide-react'
import supabase from '../lib/supabase.js'
import { fetchStreak, getStreakBadge } from '../lib/streak.js'
import { formatDisplayDate, isValidDate, minDateISO, todayISO } from '../utils/dateUtils.js'

const DAY_IN_MS = 1000 * 60 * 60 * 24
const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const PHASE_DEFINITIONS = [
  {
    key: 'menstrual',
    label: 'Menstrual Phase',
    start: 1,
    end: 5,
    color: '#ffd6e0',
    description: 'Your body is shedding the uterine lining, so rest and gentle care matter most.',
    tone: 'menstrual',
    icon: Droplets,
    tip: 'Prioritize rest, warm meals, iron-rich foods, and heat therapy for comfort.',
  },
  {
    key: 'follicular',
    label: 'Follicular Phase',
    start: 6,
    end: 13,
    color: '#fff9db',
    description: 'Energy usually begins to rise as your body prepares an egg for ovulation.',
    tone: 'follicular',
    icon: Sprout,
    tip: 'Use the extra energy to start new habits, take walks, and ease into exercise.',
  },
  {
    key: 'ovulation',
    label: 'Ovulation Phase',
    start: 14,
    end: 16,
    color: '#d4edda',
    description: 'Ovulation is the short window when your body releases an egg.',
    tone: 'ovulation',
    icon: SunMedium,
    tip: 'This can be a great time for social plans, confidence boosts, and higher intensity workouts.',
  },
  {
    key: 'luteal',
    label: 'Luteal Phase',
    start: 17,
    end: 28,
    color: '#e8e0f5',
    description: 'Hormones shift again, so slower routines and self-care can feel especially helpful.',
    tone: 'luteal',
    icon: Moon,
    tip: 'Lean into calming activities, reduce extra sugar, and give yourself more recovery time.',
  },
]

const PHASE_LEGEND = [
  {
    key: 'menstrual',
    color: '#ffd6e0',
    label: 'Menstrual Phase (Day 1–5)',
    description: 'Your period days. Rest and take care.',
  },
  {
    key: 'follicular',
    color: '#fff9db',
    label: 'Follicular Phase (Day 6–13)',
    description: 'Energy rising. Great time to start new things.',
  },
  {
    key: 'ovulation',
    color: '#d4edda',
    label: 'Ovulation (Day 14–16)',
    description: 'Peak fertility and energy.',
  },
  {
    key: 'luteal',
    color: '#e8e0f5',
    label: 'Luteal Phase (Day 17–28)',
    description: 'Slow down and practice self care.',
  },
]

const PHASE_DETAILS = {
  menstrual: {
    title: 'Menstrual Phase',
    color: '#ffd6e0',
    headerGradient: 'linear-gradient(135deg, #ffd6e0 0%, #ffb8cc 100%)',
    sections: [
      { icon: '🩸', heading: 'What happens', text: 'Your uterine lining sheds, causing bleeding. Estrogen and progesterone are at their lowest.' },
      { icon: '💭', heading: 'How you may feel', text: 'Fatigue, cramps, lower back pain, mood changes are common and completely normal.' },
      { icon: '🔋', heading: 'Energy level', text: 'Low — this is your rest phase.' },
      { icon: '🥗', heading: 'Best foods', text: 'Iron rich foods like spinach, lentils, dark chocolate, ginger tea for cramps.' },
      { icon: '🧘', heading: 'Best exercises', text: 'Gentle yoga, stretching, walking.' },
      { icon: '🛁', heading: 'Self care tips', text: 'Use a heating pad, stay hydrated, rest when needed.' },
    ],
  },
  follicular: {
    title: 'Follicular Phase',
    color: '#fff9db',
    headerGradient: 'linear-gradient(135deg, #fff9db 0%, #ffe8a3 100%)',
    sections: [
      { icon: '🌱', heading: 'What happens', text: 'Estrogen rises as follicles develop in your ovaries. Your uterine lining starts rebuilding.' },
      { icon: '💭', heading: 'How you may feel', text: 'More energetic, positive, creative and social.' },
      { icon: '🔋', heading: 'Energy level', text: 'Rising — great time to start new projects.' },
      { icon: '🥗', heading: 'Best foods', text: 'Fermented foods, fresh vegetables, lean protein.' },
      { icon: '💪', heading: 'Best exercises', text: 'Cardio, strength training, dance classes.' },
      { icon: '✨', heading: 'Self care tips', text: 'Try something new, set goals, connect with friends.' },
    ],
  },
  ovulation: {
    title: 'Ovulation Phase',
    color: '#d4edda',
    headerGradient: 'linear-gradient(135deg, #d4edda 0%, #a8ddb5 100%)',
    sections: [
      { icon: '🌸', heading: 'What happens', text: 'A mature egg is released from the ovary. Estrogen peaks and LH surges.' },
      { icon: '💭', heading: 'How you may feel', text: 'Confident, energetic, social and attractive.' },
      { icon: '🔋', heading: 'Energy level', text: 'Peak — your highest energy phase.' },
      { icon: '🥗', heading: 'Best foods', text: 'Antioxidant rich foods, fiber, light meals.' },
      { icon: '🏃', heading: 'Best exercises', text: 'HIIT, running, group fitness classes.' },
      { icon: '🌟', heading: 'Self care tips', text: 'Great time for important meetings, social events, creative work.' },
    ],
  },
  luteal: {
    title: 'Luteal Phase',
    color: '#e8e0f5',
    headerGradient: 'linear-gradient(135deg, #e8e0f5 0%, #d1c4e9 100%)',
    sections: [
      { icon: '🌙', heading: 'What happens', text: 'Progesterone rises to prepare for potential pregnancy. If no pregnancy occurs hormones drop causing PMS.' },
      { icon: '💭', heading: 'How you may feel', text: 'Bloated, tired, mood swings, cravings — PMS symptoms may appear in second half.' },
      { icon: '🔋', heading: 'Energy level', text: 'Declining — honor your need to slow down.' },
      { icon: '🥗', heading: 'Best foods', text: 'Magnesium rich foods like dark chocolate, nuts, complex carbs, avoid caffeine and sugar.' },
      { icon: '🏊', heading: 'Best exercises', text: 'Pilates, light weights, swimming, yoga.' },
      { icon: '📝', heading: 'Self care tips', text: 'Journal, reduce social commitments, practice self compassion.' },
    ],
  },
}

const MENOPAUSE_SYMPTOMS = [
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

const MENOPAUSE_TIPS = [
  'Dress in light layers, keep water nearby, and note what seems to trigger hot flashes.',
  'A short evening wind-down can support sleep when hormones make nights feel unsettled.',
  'Strength work, protein, and fiber can help support mood, energy, and body composition changes.',
  'If cycles are changing, tracking symptoms can make doctor visits much clearer and more useful.',
  'Cutting back on caffeine late in the day may help with sleep problems and heart-racing sensations.',
]

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
  return Math.round((laterDate - earlierDate) / DAY_IN_MS)
}

function getSymptomDate(entry) {
  return (
    entry.logged_at ||
    entry.created_at ||
    entry.log_date ||
    entry.date ||
    entry.entry_date ||
    entry.symptom_date ||
    null
  )
}

function getSymptomList(entry) {
  const rawSymptoms = entry.symptoms ?? entry.symptom ?? entry.tags ?? entry.notes ?? []

  if (Array.isArray(rawSymptoms)) {
    return rawSymptoms.filter(Boolean)
  }

  if (typeof rawSymptoms === 'string') {
    return rawSymptoms
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }

  return []
}

function getCycleDayForDate(date, latestStartDate, averageCycleLength) {
  if (!latestStartDate || !averageCycleLength) return null
  const daysSince = diffInDays(date, latestStartDate)
  if (daysSince < 0) {
    const cycleDayRaw = ((daysSince % averageCycleLength) + averageCycleLength) % averageCycleLength + 1
    return cycleDayRaw
  }
  return ((daysSince % averageCycleLength) + averageCycleLength) % averageCycleLength + 1
}

function getPhaseForCycleDay(cycleDay) {
  if (!cycleDay) return null
  return (
    PHASE_DEFINITIONS.find((phase) => cycleDay >= phase.start && cycleDay <= phase.end) ??
    PHASE_DEFINITIONS[PHASE_DEFINITIONS.length - 1]
  )
}

function isFertileDay(cycleDay) {
  return cycleDay !== null && cycleDay >= 12 && cycleDay <= 16
}

export default function Dashboard({ userId }) {
  const todayDate = todayISO()
  const [cycleLogs, setCycleLogs] = useState([])
  const [healthReport, setHealthReport] = useState(null)
  const [symptomLogs, setSymptomLogs] = useState([])
  const [profileAge, setProfileAge] = useState(null)
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [selectedDay, setSelectedDay] = useState(null)
  const [phaseModalKey, setPhaseModalKey] = useState(null)
  const [streakData, setStreakData] = useState(null)
  const [periodModalOpen, setPeriodModalOpen] = useState(false)
  const [periodSaving, setPeriodSaving] = useState(false)
  const [periodError, setPeriodError] = useState('')
  const [existingPeriodLogId, setExistingPeriodLogId] = useState(null)
  const [periodForm, setPeriodForm] = useState({
    startDate: todayISO(),
    endDate: '',
    flowIntensity: '',
    notes: '',
  })

  const loadDashboardData = useCallback(async () => {
    const [cycleResult, healthResult, symptomResult, profileResult] = await Promise.all([
      supabase
        .from('cycle_logs')
        .select('*')
        .eq('profile_id', userId)
        .order('start_date', { ascending: false })
        .limit(6),
      supabase
        .from('health_reports')
        .select('*')
        .eq('profile_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('symptom_logs')
        .select('*')
        .eq('profile_id', userId)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase.from('profiles').select('age').eq('id', userId).maybeSingle(),
    ])

    setCycleLogs(cycleResult.error ? [] : cycleResult.data ?? [])
    setHealthReport(healthResult.error ? null : healthResult.data ?? null)
    setSymptomLogs(symptomResult.error ? [] : symptomResult.data ?? [])
    setProfileAge(profileResult.error ? null : Number(profileResult.data?.age) || null)
  }, [userId])

  useEffect(() => {
    let active = true

    async function syncStreakData() {
      const data = await fetchStreak(userId)
      if (active) {
        setStreakData(data)
      }
    }

    syncStreakData()

    return () => {
      active = false
    }
  }, [userId])

  useEffect(() => {
    let active = true

    const handleStreakUpdate = async () => {
      const data = await fetchStreak(userId)
      if (active) {
        setStreakData(data)
      }
    }

    window.addEventListener('streakUpdated', handleStreakUpdate)
    return () => {
      active = false
      window.removeEventListener('streakUpdated', handleStreakUpdate)
    }
  }, [userId])

  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {})
    }

    async function loadDashboard() {
      await loadDashboardData()
    }

    loadDashboard()
  }, [loadDashboardData])

  const cycleSummary = useMemo(() => {
    const startDates = cycleLogs.map((log) => normalizeDate(log.start_date)).filter(Boolean)

    const averageCycleLength =
      startDates.length > 1
        ? Math.round(
            startDates
              .slice(0, -1)
              .map((date, index) => diffInDays(date, startDates[index + 1]))
              .reduce((total, value) => total + value, 0) /
              (startDates.length - 1),
          )
        : 28

    const latestStartDate = startDates[0] ?? null
    const predictedNextPeriod = latestStartDate
      ? new Date(latestStartDate.getTime() + averageCycleLength * DAY_IN_MS)
      : null

    const today = new Date()
    const normalizedToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const daysUntilNextPeriod = predictedNextPeriod
      ? Math.max(0, diffInDays(predictedNextPeriod, normalizedToday))
      : null
    const daysSinceLatestStart = latestStartDate ? diffInDays(normalizedToday, latestStartDate) : null
    const cycleDay =
      latestStartDate && averageCycleLength > 0 && daysSinceLatestStart !== null
        ? ((daysSinceLatestStart % averageCycleLength) + averageCycleLength) % averageCycleLength + 1
        : null

    return {
      averageCycleLength,
      cycleDay,
      predictedNextPeriod,
      daysUntilNextPeriod,
      startDates,
      latestStartDate,
    }
  }, [cycleLogs])

  useEffect(() => {
    const { daysUntilNextPeriod } = cycleSummary

    if (
      typeof Notification === 'undefined' ||
      Notification.permission !== 'granted' ||
      daysUntilNextPeriod === null ||
      daysUntilNextPeriod > 3
    ) {
      return
    }

    const notification = new Notification(
      `Your period is expected in ${daysUntilNextPeriod} days. Stay prepared and take care.`,
    )

    return () => notification.close()
  }, [cycleSummary])

  const calendarDays = useMemo(() => {
    const today = new Date()
    const normalizedToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const monthStart = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1)
    const monthEnd = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0)
    const leadingEmptyDays = monthStart.getDay()
    const totalDays = monthEnd.getDate()

    const predictedNextPeriod = cycleSummary.predictedNextPeriod
    const predictedPeriodDays = new Set()
    if (predictedNextPeriod) {
      for (let i = 0; i < 5; i++) {
        const d = new Date(predictedNextPeriod.getTime() + i * DAY_IN_MS)
        predictedPeriodDays.add(d.toDateString())
      }
    }

    const pastPeriodDays = new Set()
    cycleSummary.startDates.forEach((startDate) => {
      for (let i = 0; i < 5; i++) {
        const d = new Date(startDate.getTime() + i * DAY_IN_MS)
        pastPeriodDays.add(d.toDateString())
      }
    })

    return Array.from({ length: leadingEmptyDays + totalDays }, (_, index) => {
      if (index < leadingEmptyDays) {
        return null
      }

      const dayNumber = index - leadingEmptyDays + 1
      const date = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), dayNumber)
      const dateKey = date.toDateString()
      const isToday = dateKey === normalizedToday.toDateString()
      const cycleDay = getCycleDayForDate(date, cycleSummary.latestStartDate, cycleSummary.averageCycleLength)
      const phase = getPhaseForCycleDay(cycleDay)
      const fertile = isFertileDay(cycleDay)
      const isPredicted = predictedPeriodDays.has(dateKey)
      const isPastPeriod = pastPeriodDays.has(dateKey)

      return {
        label: dayNumber,
        date,
        isToday,
        cycleDay,
        phase,
        fertile,
        isPredicted,
        isPastPeriod,
      }
    })
  }, [cycleSummary, calendarMonth])

  const healthScore =
    healthReport && typeof healthReport.risk_score === 'number'
      ? Math.max(0, Math.min(100, 100 - healthReport.risk_score))
      : null

  const countdownToneClass =
    cycleSummary.daysUntilNextPeriod === null
      ? 'tone-default'
      : cycleSummary.daysUntilNextPeriod <= 3
        ? 'tone-danger'
        : cycleSummary.daysUntilNextPeriod <= 7
          ? 'tone-warning'
          : 'tone-default'

  const currentPhase = useMemo(() => {
    if (!cycleSummary.cycleDay) {
      return null
    }

    return (
      PHASE_DEFINITIONS.find(
        (phase) => cycleSummary.cycleDay >= phase.start && cycleSummary.cycleDay <= phase.end,
      ) ?? PHASE_DEFINITIONS[PHASE_DEFINITIONS.length - 1]
    )
  }, [cycleSummary.cycleDay])

  const menopauseLogs = useMemo(
    () =>
      symptomLogs
        .filter((entry) => getSymptomList(entry).some((symptom) => MENOPAUSE_SYMPTOMS.includes(symptom)))
        .slice(0, 3),
    [symptomLogs],
  )

  const menopauseTip = useMemo(() => {
    const today = new Date()
    const daySeed = today.getFullYear() * 1000 + Math.floor(today.getTime() / DAY_IN_MS)
    return MENOPAUSE_TIPS[daySeed % MENOPAUSE_TIPS.length]
  }, [])

  function goToPrevMonth() {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
    setSelectedDay(null)
  }

  function goToNextMonth() {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
    setSelectedDay(null)
  }

  function handleDayClick(day) {
    if (!day) return
    setSelectedDay(day)
    if (day.phase) {
      setPhaseModalKey(day.phase.key)
    }
  }

  function openPhaseModal(key) {
    setPhaseModalKey(key)
  }

  function closePhaseModal() {
    setPhaseModalKey(null)
  }

  async function openPeriodModal() {
    const today = todayISO()
    setPeriodError('')
    setPeriodModalOpen(true)

    const { data, error: cycleError } = await supabase
      .from('cycle_logs')
      .select('*')
      .eq('profile_id', userId)
      .eq('start_date', today)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (cycleError) {
      setPeriodError(cycleError.message || 'Could not load today\'s period log.')
      setExistingPeriodLogId(null)
      setPeriodForm({
        startDate: today,
        endDate: '',
        flowIntensity: '',
        notes: '',
      })
      return
    }

    if (data) {
      setExistingPeriodLogId(data.id)
      setPeriodForm({
        startDate: data.start_date ?? today,
        endDate: data.end_date ?? '',
        flowIntensity: data.flow_intensity ?? '',
        notes: data.notes ?? '',
      })
      return
    }

    setExistingPeriodLogId(null)
    setPeriodForm({
      startDate: today,
      endDate: '',
      flowIntensity: '',
      notes: '',
    })
  }

  function closePeriodModal() {
    setPeriodModalOpen(false)
    setPeriodSaving(false)
    setPeriodError('')
  }

  const updatePeriodField = (key, value) => {
    setPeriodForm((current) => ({
      ...current,
      [key]: value,
    }))
  }

  const updatePeriodDateField = (key, value) => {
    setPeriodForm((current) => ({
      ...current,
      [key]: value && isValidDate(value) ? value : '',
    }))
  }

  async function handlePeriodSave(event) {
    event.preventDefault()
    setPeriodSaving(true)
    setPeriodError('')

    const payload = {
      profile_id: userId,
      start_date: periodForm.startDate,
      end_date: periodForm.endDate || null,
      flow_intensity: periodForm.flowIntensity || null,
      notes: periodForm.notes.trim() || null,
    }

    const response = existingPeriodLogId
      ? await supabase.from('cycle_logs').update(payload).eq('id', existingPeriodLogId)
      : await supabase.from('cycle_logs').insert(payload)

    if (response.error) {
      setPeriodError(response.error.message || 'Could not save your period log.')
      setPeriodSaving(false)
      return
    }

    await loadDashboardData()
    closePeriodModal()
  }

  const calendarMonthLabel = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(calendarMonth)

  return (
    <div className="dashboard-page page-stack">
      <div className="page-header-row">
        <header className="section-title">
          <p className="eyebrow">Welcome back</p>
          <h1>Your Dashboard</h1>
        </header>

        {/* ───── Streak Card ───── */}
        <div className="streak-card">
          <div className="streak-card-flame">
            <Flame size={28} strokeWidth={2} />
          </div>
          <div className="streak-card-info">
            {streakData && streakData.current_streak > 0 ? (
              <>
                <span className="streak-card-number">{streakData.current_streak}</span>
                <span className="streak-card-label">day streak</span>
                {(() => {
                  const badge = getStreakBadge(streakData.current_streak)
                  if (!badge) return null
                  return (
                    <span
                      className={`streak-badge streak-badge-${badge.tier}`}
                      title={`${badge.label} badge`}
                    >
                      {badge.label}
                    </span>
                  )
                })()}
              </>
            ) : (
              <span className="streak-card-empty">Start your streak today!</span>
            )}
          </div>
        </div>
      </div>

      <section className="card dashboard-hero">
        <p className="card-label card-label-light">Next Period In</p>
        <div className={`dashboard-countdown ${countdownToneClass}`}>
          {cycleSummary.daysUntilNextPeriod === null
            ? 'Log a cycle to predict'
            : `${cycleSummary.daysUntilNextPeriod} day${cycleSummary.daysUntilNextPeriod === 1 ? '' : 's'}`}
        </div>
        <p className="dashboard-predicted-date">
          {cycleSummary.predictedNextPeriod ? formatDisplayDate(cycleSummary.predictedNextPeriod) : 'No predicted date yet'}
        </p>
      </section>

      <section className="grid two-up dashboard-insight-grid">
        <article className={`card cycle-phase-card${currentPhase ? ` phase-${currentPhase.tone}` : ''}`}>
          <div className="card-head cycle-phase-head">
            <div>
              <p className="card-label">Cycle phase</p>
              <h3>{currentPhase ? currentPhase.label : 'Phase unavailable'}</h3>
            </div>
            <div className="cycle-phase-icon" aria-hidden="true">
              {currentPhase ? <currentPhase.icon size={20} strokeWidth={2} /> : <Moon size={20} strokeWidth={2} />}
            </div>
          </div>
          <p className="cycle-phase-description">
            {currentPhase
              ? currentPhase.description
              : 'Log more cycle data to see which phase you are in today.'}
          </p>
          <div className="phase-timeline" aria-label="Cycle phase timeline">
            {PHASE_DEFINITIONS.map((phase) => (
              <div
                key={phase.key}
                className={`phase-timeline-item${currentPhase?.key === phase.key ? ' is-current' : ''}`}
              >
                <span className="phase-timeline-bar"></span>
                <span className="phase-timeline-label">{phase.label.replace(' Phase', '')}</span>
              </div>
            ))}
          </div>
        </article>

        <article className={`card today-tip-card${currentPhase ? ` phase-${currentPhase.tone}` : ''}`}>
          <p className="card-label">Today&apos;s tip</p>
          <h3>{currentPhase ? `${currentPhase.label} support` : 'Cycle-aware support'}</h3>
          <p className="today-tip-copy">
            {currentPhase
              ? currentPhase.tip
              : 'Once you log a cycle, daily guidance will adapt to your current phase automatically.'}
          </p>
        </article>
      </section>

      {profileAge !== null && profileAge >= 37 && profileAge <= 44 ? (
        <section className="card menopause-awareness-card">
          <div className="card-head">
            <div>
              <p className="card-label">Early menopause awareness</p>
              <h3>Changes can begin earlier than expected</h3>
            </div>
            <span className="dashboard-mini-icon" aria-hidden="true">
              <Flame size={20} strokeWidth={1.9} />
            </span>
          </div>
          <p className="menopause-card-copy">
            Some women experience early menopause or perimenopause starting in their late 30s. If
            you notice irregular cycles, hot flashes, or mood changes, it may be worth discussing
            with your doctor.
          </p>
        </section>
      ) : null}

      {profileAge !== null && profileAge >= 40 ? (
        <section className="card menopause-wellness-card">
          <div className="card-head">
            <div>
              <p className="card-label">Menopause wellness</p>
              <h3>Recent symptoms and today&apos;s tip</h3>
            </div>
            <span className="dashboard-mini-icon" aria-hidden="true">
              <Sparkles size={20} strokeWidth={1.9} />
            </span>
          </div>
          <div className="grid two-up menopause-wellness-grid">
            <div className="page-stack">
              <p className="muted">Last 3 menopause-related entries</p>
              {menopauseLogs.length === 0 ? (
                <p className="muted">No menopause symptoms logged yet.</p>
              ) : (
                menopauseLogs.map((entry, index) => (
                  <article key={entry.id ?? index} className="menopause-log-card">
                    <p className="symptom-entry-date">
                      {formatDisplayDate(getSymptomDate(entry))}
                    </p>
                    <div className="pill-row symptom-pill-row">
                      {getSymptomList(entry)
                        .filter((symptom) => MENOPAUSE_SYMPTOMS.includes(symptom))
                        .map((symptom) => (
                          <span key={symptom} className="symptom-chip">
                            {symptom}
                          </span>
                        ))}
                    </div>
                  </article>
                ))
              )}
            </div>

            <article className="menopause-tip-panel">
              <p className="card-label">Daily menopause tip</p>
              <p className="menopause-card-copy">{menopauseTip}</p>
            </article>
          </div>
        </section>
      ) : null}

      {/* ───────── Premium Calendar ───────── */}
      <section className="card premium-calendar-card" id="cycle-calendar">
        <div className="premium-calendar-header">
          <button
            type="button"
            className="premium-cal-nav-btn"
            onClick={goToPrevMonth}
            aria-label="Previous month"
          >
            <ChevronLeft size={20} />
          </button>
          <h3 className="premium-cal-month-label">{calendarMonthLabel}</h3>
          <button
            type="button"
            className="premium-cal-nav-btn"
            onClick={goToNextMonth}
            aria-label="Next month"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="premium-cal-weekdays">
          {WEEKDAY_LABELS.map((label) => (
            <span key={label} className="premium-cal-weekday">
              {label}
            </span>
          ))}
        </div>

        <div className="premium-cal-grid">
          {calendarDays.map((day, index) =>
            day ? (
              <button
                type="button"
                key={`${day.label}-${index}`}
                className={[
                  'premium-cal-day',
                  day.isToday ? 'is-today' : '',
                  day.phase ? `phase-${day.phase.key}` : '',
                  day.isPredicted ? 'is-predicted' : '',
                  day.isPastPeriod ? 'is-past-period' : '',
                  selectedDay?.label === day.label ? 'is-selected' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => handleDayClick(day)}
              >
                {day.cycleDay !== null && (
                  <span className="premium-cal-cycle-day">{day.cycleDay}</span>
                )}
                <span className="premium-cal-day-number">{day.label}</span>
                {day.fertile && (
                  <span className="premium-cal-fertile-icon" aria-label="Fertile day">
                    <Leaf size={12} />
                  </span>
                )}
                {day.isPredicted && !day.isPastPeriod && (
                  <span className="premium-cal-predicted-dot"></span>
                )}
              </button>
            ) : (
              <div key={`empty-${index}`} className="premium-cal-day empty"></div>
            ),
          )}
        </div>

        {/* Selected Day Info Card */}
        {selectedDay && (
          <div className="premium-cal-selected-card">
            <div className="premium-cal-selected-info">
              <span className="premium-cal-selected-date">
                {formatDisplayDate(selectedDay.date)}
              </span>
              <span className="premium-cal-selected-cycle-day">
                {selectedDay.cycleDay !== null ? `Cycle Day ${selectedDay.cycleDay}` : 'No cycle data'}
              </span>
              <span className="premium-cal-selected-phase">
                {selectedDay.phase ? selectedDay.phase.label : 'Phase unknown'}
              </span>
            </div>
            <button type="button" className="premium-cal-edit-btn">
              Edit
            </button>
          </div>
        )}

        {/* Phase Legend */}
        <div className="premium-cal-legend">
          {PHASE_LEGEND.map((item) => (
            <button
              type="button"
              key={item.label}
              className="premium-cal-legend-item premium-cal-legend-clickable"
              onClick={() => openPhaseModal(item.key)}
            >
              <span
                className="premium-cal-legend-dot"
                style={{ background: item.color }}
              ></span>
              <div className="premium-cal-legend-text">
                <strong>{item.label}</strong>
                <span>{item.description}</span>
              </div>
              <span className="premium-cal-legend-arrow">›</span>
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <p className="card-label">Health score</p>
        <h3>How your latest report looks</h3>
        <div className="health-score-panel">
          {healthScore === null ? (
            <p className="muted">No report yet - go to Analysis</p>
          ) : (
            <>
              <strong>{healthScore}/100</strong>
              <span className="muted">
                Based on the newest health report and inverse risk score.
              </span>
            </>
          )}
        </div>
      </section>

      {/* ───── Streak History ───── */}
      <section className="card streak-history-card">
        <p className="card-label">Streak history</p>
        <div className="streak-history-simple">
          <span className="streak-history-flame-large" aria-hidden="true">
            <Flame size={30} strokeWidth={2} />
          </span>
          {streakData && streakData.current_streak > 0 ? (
            <>
              <strong className="streak-history-number">{streakData.current_streak}</strong>
              <span className="streak-history-day-label">day streak</span>
              {(() => {
                const badge = getStreakBadge(streakData.current_streak)
                return badge ? (
                  <span className={`streak-badge streak-badge-${badge.tier}`}>{badge.label}</span>
                ) : null
              })()}
            </>
          ) : (
            <strong className="streak-history-empty">Start your streak today!</strong>
          )}
          <p className="streak-history-meta">
            Longest: {streakData?.longest_streak ?? 0} days
            <span aria-hidden="true"> • </span>
            Total logged: {streakData?.total_days_logged ?? 0} days
          </p>
        </div>
      </section>

      <button type="button" className="dashboard-log-period-fab" onClick={openPeriodModal}>
        <Plus size={18} strokeWidth={2.3} />
        <span>Log Period</span>
      </button>

      {periodModalOpen ? (
        <div className="phase-modal-backdrop" onClick={closePeriodModal}>
          <div
            className="quick-log-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Quick log period"
          >
            <div className="quick-log-modal-head">
              <div>
                <p className="card-label">Quick log</p>
                <h3>Log Period</h3>
              </div>
              <button
                type="button"
                className="phase-modal-close"
                onClick={closePeriodModal}
                aria-label="Close period log modal"
              >
                <X size={18} strokeWidth={2.4} />
              </button>
            </div>

            {periodError ? (
              <div className="status-card status-card-error" role="alert">
                {periodError}
              </div>
            ) : null}

            <form className="quick-log-form" onSubmit={handlePeriodSave}>
              <div className="field-grid">
                <label className="field">
                  <span>Period Start Date</span>
                  <input
                    type="date"
                    value={periodForm.startDate}
                    min={minDateISO()}
                    max={todayDate}
                    lang="en-GB"
                    title={formatDisplayDate(periodForm.startDate) || 'dd/mm/yyyy'}
                    onChange={(event) => updatePeriodDateField('startDate', event.target.value)}
                    required
                  />
                </label>
                <label className="field">
                  <span>Period End Date</span>
                  <input
                    type="date"
                    value={periodForm.endDate}
                    min={minDateISO()}
                    max={todayDate}
                    lang="en-GB"
                    title={formatDisplayDate(periodForm.endDate) || 'dd/mm/yyyy'}
                    onChange={(event) => updatePeriodDateField('endDate', event.target.value)}
                  />
                </label>
              </div>

              <div className="quick-log-section">
                <p className="card-label">Flow intensity</p>
                <div className="pill-row flow-pill-row">
                  {['Light', 'Normal', 'Heavy', 'Very Heavy'].map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={`option-pill${periodForm.flowIntensity === option ? ' selected' : ''}`}
                      onClick={() => updatePeriodField('flowIntensity', option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <label className="field full-width">
                <span>Notes</span>
                <textarea
                  rows="4"
                  value={periodForm.notes}
                  onChange={(event) => updatePeriodField('notes', event.target.value)}
                  placeholder="Anything you want to note about today."
                />
              </label>

              <button type="submit" className="pill-button submit-button" disabled={periodSaving}>
                {periodSaving ? 'Saving...' : existingPeriodLogId ? 'Update' : 'Save'}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {/* Phase Detail Modal */}
      {phaseModalKey && PHASE_DETAILS[phaseModalKey] && (
        <div className="phase-modal-backdrop" onClick={closePhaseModal}>
          <div
            className="phase-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={PHASE_DETAILS[phaseModalKey].title}
          >
            <div
              className="phase-modal-header"
              style={{ background: PHASE_DETAILS[phaseModalKey].headerGradient }}
            >
              <h2 className="phase-modal-title">{PHASE_DETAILS[phaseModalKey].title}</h2>
              <button
                type="button"
                className="phase-modal-close"
                onClick={closePhaseModal}
                aria-label="Close modal"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>
            <div className="phase-modal-body">
              {PHASE_DETAILS[phaseModalKey].sections.map((section) => (
                <div key={section.heading} className="phase-modal-section">
                  <div className="phase-modal-section-header">
                    <span className="phase-modal-section-icon">{section.icon}</span>
                    <h3 className="phase-modal-section-title">{section.heading}</h3>
                  </div>
                  <p className="phase-modal-section-text">{section.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
