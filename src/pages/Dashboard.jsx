import { useCallback, useEffect, useMemo, useState } from 'react'
import { Calendar, ChevronLeft, ChevronRight, Droplets, Flame, Leaf, Moon, Sparkles, Sprout, SunMedium, X } from 'lucide-react'
import supabase from '../lib/supabase.js'
import { getStreakBadge } from '../lib/streak.js'
import { formatDisplayDate, isValidDate, todayISO } from '../utils/dateUtils.js'
import { DAY_IN_MS, diffInDays, getAverageCycleLength, normalizeDate } from '../utils/cycleUtils.js'

let dashboardDataCache = null

function getCachedDashboardData(userId) {
  return dashboardDataCache?.profileId === userId ? dashboardDataCache : null
}

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

function getMonthBounds(dateString) {
  const [year, month] = dateString.split('-').map(Number)
  const monthStart = new Date(year, month - 1, 1)
  const nextMonthStart = new Date(year, month, 1)

  return {
    monthStart: `${String(monthStart.getFullYear())}-${String(monthStart.getMonth() + 1).padStart(2, '0')}-01`,
    nextMonthStart: `${String(nextMonthStart.getFullYear())}-${String(nextMonthStart.getMonth() + 1).padStart(2, '0')}-01`,
  }
}

export default function Dashboard({ userId }) {
  const cachedDashboardData = getCachedDashboardData(userId)
  const todayDate = todayISO()
  const [cycleLogs, setCycleLogs] = useState(() => cachedDashboardData?.cycleLogs ?? [])
  const [symptomLogs, setSymptomLogs] = useState(() => cachedDashboardData?.symptomLogs ?? [])
  const [profileAge, setProfileAge] = useState(() => cachedDashboardData?.profileAge ?? null)
  const [fullName, setFullName] = useState(() => cachedDashboardData?.fullName ?? null)
  const [dashboardDataLoaded, setDashboardDataLoaded] = useState(() => Boolean(cachedDashboardData))
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [selectedDay, setSelectedDay] = useState(null)
  const [phaseModalKey, setPhaseModalKey] = useState(null)
  const [streakData, setStreakData] = useState({
    current_streak: 0,
    longest_streak: 0,
    total_days_logged: 0,
  })
  const [periodModalOpen, setPeriodModalOpen] = useState(false)
  const [periodSaving, setPeriodSaving] = useState(false)
  const [periodError, setPeriodError] = useState('')
  const [existingPeriodLogId, setExistingPeriodLogId] = useState(null)
  const [periodForm, setPeriodForm] = useState({
    startDate: todayISO(),
  })
  const [showStartDateDropdown, setShowStartDateDropdown] = useState(false)
  const [startPickerDay, setStartPickerDay] = useState('')
  const [startPickerMonth, setStartPickerMonth] = useState('')
  const [startPickerYear, setStartPickerYear] = useState('')

  const loadDashboardData = useCallback(async () => {
    try {
      const {
        data: { user: authenticatedUser },
      } = await supabase.auth.getUser()

      const activeUserId = authenticatedUser?.id ?? userId

      // Fetch full_name from profiles
      const profileResult = await supabase
        .from('profiles')
        .select('age, full_name')
        .eq('id', activeUserId)
        .maybeSingle()

      const [cycleResult, symptomResult] = await Promise.all([
        supabase
          .from('cycle_logs')
          .select('*')
          .eq('profile_id', activeUserId)
          .order('start_date', { ascending: false })
          .limit(6),
        supabase
          .from('symptom_logs')
          .select('*')
          .eq('profile_id', activeUserId)
          .order('created_at', { ascending: false })
          .limit(20),
      ])

      const nextCycleLogs = cycleResult.error ? [] : cycleResult.data ?? []
      const nextSymptomLogs = symptomResult.error ? [] : symptomResult.data ?? []
      const nextProfileAge = profileResult.error ? null : Number(profileResult.data?.age) || null
      const nextFullName = profileResult.error ? null : profileResult.data?.full_name || null

      dashboardDataCache = {
        profileId: activeUserId,
        cycleLogs: nextCycleLogs,
        symptomLogs: nextSymptomLogs,
        profileAge: nextProfileAge,
        fullName: nextFullName,
      }

      setCycleLogs(nextCycleLogs)
      setSymptomLogs(nextSymptomLogs)
      setProfileAge(nextProfileAge)
      setFullName(nextFullName)
    } finally {
      setDashboardDataLoaded(true)
    }
  }, [userId])

  // Dedicated useEffect for streak fetching on mount (prevents navigation flicker).
  useEffect(() => {
    const fetchStreakOnMount = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          return
        }

        const { data, error } = await supabase
          .from('streaks')
          .select('*')
          .eq('profile_id', user.id)
          .single()

        if (!error && data) {
          setStreakData(data)
        }
      } catch {
        // Intentionally ignore streak fetch errors and keep default state.
      }
    }

    fetchStreakOnMount()
  }, [])

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
    const avgCycleLength = getAverageCycleLength(cycleLogs, startDates)

    const latestStartDate = startDates[0] ?? null
    const predictedDate = latestStartDate
      ? new Date(latestStartDate.getTime() + avgCycleLength * DAY_IN_MS)
      : null

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let daysUntil = null
    if (predictedDate) {
      const predicted = new Date(predictedDate)
      predicted.setHours(0, 0, 0, 0)
      daysUntil = Math.round((predicted - today) / (1000 * 60 * 60 * 24))
    }

    const daysSinceLatestStart = latestStartDate ? diffInDays(today, latestStartDate) : null
    const cycleDay =
      latestStartDate && avgCycleLength > 0 && daysSinceLatestStart !== null
        ? ((daysSinceLatestStart % avgCycleLength) + avgCycleLength) % avgCycleLength + 1
        : null

    return {
      averageCycleLength: avgCycleLength,
      cycleDay,
      predictedNextPeriod: predictedDate,
      daysUntilNextPeriod: daysUntil,
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
      daysUntilNextPeriod < 0 ||
      daysUntilNextPeriod > 3
    ) {
      return
    }

    const notificationMessage =
      daysUntilNextPeriod === 0
        ? 'Your period is expected today. Stay prepared and take care.'
        : `Your period is expected in ${daysUntilNextPeriod} days. Stay prepared and take care.`

    const notification = new Notification(notificationMessage)

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

  const countdownToneClass =
    !dashboardDataLoaded
      ? 'tone-default'
      : cycleSummary.daysUntilNextPeriod === null
        ? 'tone-default'
        : cycleSummary.daysUntilNextPeriod < 0
          ? 'tone-danger'
          : cycleSummary.daysUntilNextPeriod === 0
            ? 'tone-today'
            : cycleSummary.daysUntilNextPeriod <= 3
              ? 'tone-danger'
              : cycleSummary.daysUntilNextPeriod <= 7
                ? 'tone-warning'
                : 'tone-default'

  const countdownMessage =
    !dashboardDataLoaded
      ? ''
      : cycleSummary.daysUntilNextPeriod === null
        ? 'Log a cycle to predict'
        : cycleSummary.daysUntilNextPeriod < 0
          ? 'Update your last period date'
          : cycleSummary.daysUntilNextPeriod === 0
            ? 'Your period is expected today!'
            : `${cycleSummary.daysUntilNextPeriod} day${cycleSummary.daysUntilNextPeriod === 1 ? '' : 's'}`

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

  const firstName = useMemo(() => {
    const normalizedName = typeof fullName === 'string' ? fullName.trim() : ''
    if (!normalizedName) {
      return 'Friend'
    }

    return normalizedName.split(/\s+/)[0]
  }, [fullName])

  const greeting = useMemo(() => {
    const hour = new Date().getHours()

    if (hour >= 6 && hour < 12) {
      return {
        smallGreeting: 'good morning ✨',
        largeGreeting: `hey ${firstName} 🌸`,
        smallGreetingClass: 'small-caps-rose-pink',
        largeGreetingClass: 'large-playfair-italic-plum',
      }
    }

    if (hour >= 12 && hour < 17) {
      return {
        smallGreeting: 'hey girlie 💅',
        largeGreeting: `what's up ${firstName}`,
        smallGreetingClass: 'small-caps-rose-pink',
        largeGreetingClass: 'large-playfair-italic-plum',
      }
    }

    if (hour >= 17 && hour < 21) {
      return {
        smallGreeting: 'slay the evening 🌙',
        largeGreeting: `hey ${firstName}`,
        smallGreetingClass: 'small-caps-rose-pink',
        largeGreetingClass: 'large-playfair-italic-plum',
      }
    }

    return {
      smallGreeting: 'night check-in 🌛',
      largeGreeting: `hey ${firstName}`,
      smallGreetingClass: 'small-caps-rose-pink',
      largeGreetingClass: 'large-playfair-italic-plum',
    }
  }, [firstName])

  const statusSubtitle = useMemo(() => {
    if (!dashboardDataLoaded || !cycleSummary.cycleDay) {
      return null
    }

    const daysUntil = cycleSummary.daysUntilNextPeriod

    if (daysUntil !== null && daysUntil >= 1 && daysUntil <= 3) {
      return {
        text: 'your period is coming soon — stock up! 🩸',
        tone: 'rose',
      }
    }

    if (daysUntil !== null && daysUntil <= 0) {
      return {
        text: 'your period may have started — how are you feeling? 💗',
        tone: 'rose',
      }
    }

    if (currentPhase?.key === 'menstrual') {
      return {
        text: 'rest up, you deserve it 🫂',
        tone: 'muted',
      }
    }

    if (currentPhase?.key === 'follicular') {
      return {
        text: 'energy is rising — great time to start something new! 🌱',
        tone: 'muted',
      }
    }

    if (currentPhase?.key === 'ovulation') {
      return {
        text: 'you are glowing today ✨',
        tone: 'muted',
      }
    }

    if (currentPhase?.key === 'luteal') {
      return {
        text: 'be gentle with yourself today 🌙',
        tone: 'muted',
      }
    }

    return null
  }, [currentPhase, cycleSummary.cycleDay, cycleSummary.daysUntilNextPeriod, dashboardDataLoaded])

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

  const isViewingCurrentMonth = useMemo(() => {
    const now = new Date()
    return (
      calendarMonth.getFullYear() === now.getFullYear() &&
      calendarMonth.getMonth() === now.getMonth()
    )
  }, [calendarMonth])

  function goToPrevMonth() {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
    setSelectedDay(null)
  }

  function goToNextMonth() {
    if (isViewingCurrentMonth) {
      return
    }

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
    setShowStartDateDropdown(false)

    const {
      data: { user: authenticatedUser },
    } = await supabase.auth.getUser()

    const activeUserId = authenticatedUser?.id ?? userId
    const { monthStart, nextMonthStart } = getMonthBounds(today)

    const { data, error: cycleError } = await supabase
      .from('cycle_logs')
      .select('*')
      .eq('profile_id', activeUserId)
      .gte('start_date', monthStart)
      .lt('start_date', nextMonthStart)
      .order('start_date', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (cycleError) {
      setPeriodError(cycleError.message || 'Could not load this month\'s period log.')
      setExistingPeriodLogId(null)
      setPeriodForm({
        startDate: today,
      })
      return
    }

    if (data) {
      setExistingPeriodLogId(data.id)
      setPeriodForm({
        startDate: data.start_date ?? today,
      })
      return
    }

    setExistingPeriodLogId(null)
    setPeriodForm({
      startDate: today,
    })
  }

  function closePeriodModal() {
    setPeriodModalOpen(false)
    setPeriodSaving(false)
    setPeriodError('')
    setShowStartDateDropdown(false)
  }

  const updatePeriodDateField = (key, value) => {
    setPeriodForm((current) => ({
      ...current,
      [key]: value && isValidDate(value) && value <= todayDate ? value : '',
    }))
  }

  async function handlePeriodSave(event) {
    event.preventDefault()
    setPeriodSaving(true)
    setPeriodError('')

    const {
      data: { user: authenticatedUser },
    } = await supabase.auth.getUser()

    const activeUserId = authenticatedUser?.id ?? userId
    const selectedStartDate = periodForm.startDate

    if (!selectedStartDate) {
      setPeriodError('Please choose a period start date.')
      setPeriodSaving(false)
      return
    }

    if (selectedStartDate > todayDate) {
      setPeriodError('You can only log a period for today or a past date.')
      setPeriodSaving(false)
      return
    }

    const { monthStart, nextMonthStart } = getMonthBounds(selectedStartDate)

    const { data: monthlyLogs, error: monthlyLogError } = await supabase
      .from('cycle_logs')
      .select('id, start_date')
      .eq('profile_id', activeUserId)
      .gte('start_date', monthStart)
      .lt('start_date', nextMonthStart)

    if (monthlyLogError) {
      setPeriodError(monthlyLogError.message || 'Could not validate your monthly period log.')
      setPeriodSaving(false)
      return
    }

    const conflictingLog = (monthlyLogs ?? []).find((log) => log.id !== existingPeriodLogId)
    const targetLogId = conflictingLog?.id ?? existingPeriodLogId

    const payload = {
      profile_id: activeUserId,
      start_date: selectedStartDate,
      end_date: null,
      flow_intensity: null,
      symptoms: [],
      notes: null,
    }

    const response = targetLogId
      ? await supabase.from('cycle_logs').update(payload).eq('id', targetLogId)
      : await supabase.from('cycle_logs').insert(payload)

    if (response.error) {
      setPeriodError(response.error.message || 'Could not save your period log.')
      setPeriodSaving(false)
      return
    }

    await loadDashboardData()
    closePeriodModal()
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

  function getDaysInMonth(year, month) {
    if (!year || !month) return 31
    return new Date(Number(year), Number(month), 0).getDate()
  }

  function getMonthName(monthNum) {
    const index = Number(monthNum) - 1
    return index >= 0 && index < 12 ? MONTH_NAMES[index] : ''
  }

  function openStartDatePicker() {
    const parsed = parseDateString(periodForm.startDate)
    setStartPickerDay(parsed.day)
    setStartPickerMonth(parsed.month)
    setStartPickerYear(parsed.year)
    setShowStartDateDropdown(true)
  }

  const availableStartMonths = (() => {
    if (!startPickerYear) {
      return MONTH_NAMES.map((month, index) => ({
        label: month,
        value: String(index + 1).padStart(2, '0'),
      }))
    }

    const selectedYear = Number(startPickerYear)
    const currentYear = Number(todayDate.slice(0, 4))
    const currentMonth = Number(todayDate.slice(5, 7))

    return MONTH_NAMES.map((month, index) => ({
      label: month,
      value: String(index + 1).padStart(2, '0'),
    })).filter((option) => selectedYear < currentYear || Number(option.value) <= currentMonth)
  })()

  const availableStartDays = (() => {
    if (!startPickerYear || !startPickerMonth) {
      return Array.from({ length: 31 }, (_, index) => String(index + 1).padStart(2, '0'))
    }

    const maxDaysInMonth = getDaysInMonth(startPickerYear, startPickerMonth)
    const isCurrentMonth =
      Number(startPickerYear) === Number(todayDate.slice(0, 4)) &&
      Number(startPickerMonth) === Number(todayDate.slice(5, 7))
    const maxDay = isCurrentMonth ? Number(todayDate.slice(8, 10)) : maxDaysInMonth

    return Array.from({ length: maxDay }, (_, index) => String(index + 1).padStart(2, '0'))
  })()

  function confirmStartDate() {
    if (startPickerDay && startPickerMonth && startPickerYear) {
      const newDate = formatDateString(startPickerYear, startPickerMonth, startPickerDay)
      if (newDate > todayDate) {
        setPeriodError('You can only choose a date up to today.')
        return
      }

      updatePeriodDateField('startDate', newDate)
      setPeriodError('')
      setShowStartDateDropdown(false)
    }
  }

  const calendarMonthLabel = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(calendarMonth)

  return (
    <div className="dashboard-page page-stack">
      <div className="page-header-row">
        <header className="section-title">
          <p className={`eyebrow ${greeting.smallGreetingClass}`}>
            {greeting.smallGreeting}
          </p>
          <h1 className={greeting.largeGreetingClass}>
            {greeting.largeGreeting}
          </h1>
          {statusSubtitle ? (
            <p
              style={{
                margin: '10px 0 0',
                fontSize: '0.9rem',
                fontStyle: 'italic',
                color: statusSubtitle.tone === 'rose' ? '#e8607a' : 'var(--color-muted)',
              }}
            >
              {statusSubtitle.text}
            </p>
          ) : null}
        </header>

        {/* ───── Streak Card ───── */}
        <div className="streak-card">
          <div className="streak-card-flame">
            <Flame size={28} strokeWidth={2} />
          </div>
          <div className="streak-card-info">
            <span className="streak-card-number">{streakData.current_streak ?? 0}</span>
            <span className="streak-card-label">day streak</span>
            {(() => {
              const badge = getStreakBadge(streakData.current_streak ?? 0)
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
          </div>
        </div>
      </div>

      <section className="card dashboard-hero">
        <p className="card-label card-label-light">Next Period In</p>
        <div className={`dashboard-countdown ${countdownToneClass}`}>
          {countdownMessage}
        </div>
        <p className="dashboard-predicted-date">
          {!dashboardDataLoaded
            ? ''
            : cycleSummary.predictedNextPeriod
              ? formatDisplayDate(cycleSummary.predictedNextPeriod)
              : 'No predicted date yet'}
        </p>
      </section>

      <section className="grid two-up dashboard-insight-grid">
        <article className={`card cycle-phase-card${currentPhase ? ` phase-${currentPhase.tone}` : ''}`}>
          <div className="card-head cycle-phase-head">
            <div>
              <p className="card-label">Cycle phase</p>
              <h3>
                {!dashboardDataLoaded
                  ? ''
                  : currentPhase
                    ? currentPhase.label
                    : 'Phase unavailable'}
              </h3>
            </div>
            <div className="cycle-phase-icon" aria-hidden="true">
              {currentPhase ? <currentPhase.icon size={20} strokeWidth={2} /> : <Moon size={20} strokeWidth={2} />}
            </div>
          </div>
          <p className="cycle-phase-description">
            {currentPhase
              ? currentPhase.description
              : dashboardDataLoaded
                ? 'Log more cycle data to see which phase you are in today.'
                : ''}
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
          <h3>
            {!dashboardDataLoaded
              ? ''
              : currentPhase
                ? `${currentPhase.label} support`
                : 'Cycle-aware support'}
          </h3>
          <p className="today-tip-copy">
            {currentPhase
              ? currentPhase.tip
              : dashboardDataLoaded
                ? 'Once you log a cycle, daily guidance will adapt to your current phase automatically.'
                : ''}
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
            disabled={isViewingCurrentMonth}
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

      {/* Log Period Button */}
      <button
        onClick={openPeriodModal}
        style={{
          width: '100%',
          padding: '16px',
          background: 'linear-gradient(135deg, #e8607a, #6b3a5e)',
          color: 'white',
          border: 'none',
          borderRadius: '999px',
          fontSize: '1rem',
          fontWeight: '600',
          fontFamily: 'DM Sans, sans-serif',
          cursor: 'pointer',
          letterSpacing: '0.04em',
          boxShadow: '0 6px 24px rgba(232,96,122,0.35)',
          marginTop: '1rem',
          marginBottom: '1rem',
          transition: 'transform 0.15s, box-shadow 0.15s'
        }}
      >
        + Log Period
      </button>

      {periodModalOpen ? (
        <div 
          className="phase-modal-backdrop" 
          onClick={() => {
            setShowStartDateDropdown(false)
            closePeriodModal()
          }}
        >
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
              <div className="custom-date-picker-stack">
                {/* START DATE Calendar Card */}
                <div className="calendar-card-date-picker">
                  <button
                    type="button"
                    className="calendar-card"
                    onClick={openStartDatePicker}
                  >
                    <div className="calendar-card-header"></div>
                    {periodForm.startDate ? (
                      <div className="calendar-card-content">
                        <div className="calendar-card-date">
                          <div className="calendar-card-day">
                            {parseDateString(periodForm.startDate).day}
                          </div>
                          <div className="calendar-card-month-year">
                            {getMonthName(parseDateString(periodForm.startDate).month)} {parseDateString(periodForm.startDate).year}
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
                  {showStartDateDropdown && (
                    <div className="calendar-card-dropdown">
                      <div className="calendar-card-dropdown-row">
                        <select
                          className="calendar-card-select calendar-card-select-day"
                          value={startPickerDay}
                          onChange={(e) => setStartPickerDay(e.target.value)}
                        >
                          <option value="">Day</option>
                          {availableStartDays.map((day) => (
                            <option key={day} value={day}>{Number(day)}</option>
                          ))}
                        </select>
                        <select
                          className="calendar-card-select calendar-card-select-month"
                          value={startPickerMonth}
                          onChange={(e) => {
                            setStartPickerMonth(e.target.value)
                            setStartPickerDay('')
                          }}
                        >
                          <option value="">Month</option>
                          {availableStartMonths.map((month) => {
                            const monthNum = month.value
                            return <option key={monthNum} value={monthNum}>{month.label}</option>
                          })}
                        </select>
                        <select
                          className="calendar-card-select calendar-card-select-year"
                          value={startPickerYear}
                          onChange={(e) => {
                            setStartPickerYear(e.target.value)
                            setStartPickerMonth('')
                            setStartPickerDay('')
                          }}
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
                        onClick={confirmStartDate}
                      >
                        Confirm
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <p className="muted">
                Choose the day your period started. If this month already has a saved date, it will be updated.
              </p>

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
