import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Heart, Music2, Pause, Play, RotateCcw, Square, Volume2, VolumeX } from 'lucide-react'
import supabase from '../lib/supabase.js'

const DAY_IN_MS = 1000 * 60 * 60 * 24
const BREATHING_PATTERN = [
  { label: 'Inhale', seconds: 4 },
  { label: 'Hold', seconds: 4 },
  { label: 'Exhale', seconds: 6 },
]
const RING_RADIUS = 68
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

function ExerciseFigure({ pose, motion, tone }) {
  const shadowId = useId()
  const matId = useId()
  const primaryColor = '#e8607a'
  const secondaryColor = '#6b3a5e'
  const skinColor = '#ffe8ef'

  const limb = (x1, y1, x2, y2, color = secondaryColor, width = 14) => (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  )

  const joint = (cx, cy, radius = 7, fill = primaryColor) => (
    <circle cx={cx} cy={cy} r={radius} fill={fill} />
  )

  const renderPose = () => {
    switch (pose) {
      case 'childsPose':
        return (
          <g className="exercise-figure-person" filter={`url(#${shadowId})`}>
            <rect x="42" y="152" width="156" height="16" rx="8" fill={`url(#${matId})`} />
            <ellipse cx="122" cy="148" rx="64" ry="14" fill="rgba(107, 58, 94, 0.09)" />
            {limb(92, 112, 62, 126, primaryColor, 12)}
            {limb(94, 118, 54, 136, primaryColor, 12)}
            {limb(118, 120, 144, 138, secondaryColor, 14)}
            {limb(144, 138, 172, 148, secondaryColor, 14)}
            <path
              d="M84 110 C94 88 132 90 144 118 C128 126 102 126 84 110Z"
              fill={primaryColor}
            />
            <circle cx="76" cy="104" r="14" fill={skinColor} stroke={secondaryColor} strokeWidth="4" />
          </g>
        )
      case 'catCow':
        return (
          <g className="exercise-figure-person exercise-cat-cow-pose" filter={`url(#${shadowId})`}>
            <rect x="40" y="152" width="160" height="16" rx="8" fill={`url(#${matId})`} />
            {limb(92, 126, 76, 152, secondaryColor, 12)}
            {limb(150, 126, 166, 152, secondaryColor, 12)}
            {limb(104, 98, 90, 126, primaryColor, 12)}
            {limb(146, 100, 158, 126, primaryColor, 12)}
            <path
              d="M96 100 C116 72 152 72 158 100 C144 114 112 114 96 100Z"
              fill={primaryColor}
            />
            <circle cx="174" cy="95" r="13" fill={skinColor} stroke={secondaryColor} strokeWidth="4" />
            {joint(96, 100)}
            {joint(158, 100)}
          </g>
        )
      case 'supineTwist':
        return (
          <g className="exercise-figure-person" filter={`url(#${shadowId})`}>
            <rect x="36" y="152" width="168" height="16" rx="8" fill={`url(#${matId})`} />
            {limb(72, 112, 128, 112, secondaryColor, 14)}
            {limb(128, 112, 160, 126, primaryColor, 12)}
            {limb(160, 126, 180, 142, primaryColor, 12)}
            {limb(128, 112, 156, 96, primaryColor, 12)}
            {limb(88, 108, 62, 96, secondaryColor, 10)}
            {limb(88, 116, 60, 132, secondaryColor, 10)}
            <rect x="80" y="96" width="54" height="24" rx="12" fill={primaryColor} />
            <circle cx="60" cy="112" r="14" fill={skinColor} stroke={secondaryColor} strokeWidth="4" />
          </g>
        )
      case 'bridgePose':
        return (
          <g className="exercise-figure-person" filter={`url(#${shadowId})`}>
            <rect x="34" y="152" width="172" height="16" rx="8" fill={`url(#${matId})`} />
            {limb(76, 136, 98, 110, secondaryColor, 14)}
            {limb(98, 110, 136, 104, primaryColor, 16)}
            {limb(136, 104, 166, 126, primaryColor, 14)}
            {limb(166, 126, 182, 152, secondaryColor, 12)}
            {limb(74, 136, 56, 152, secondaryColor, 10)}
            <circle cx="56" cy="138" r="13" fill={skinColor} stroke={secondaryColor} strokeWidth="4" />
          </g>
        )
      case 'legsUpWall':
        return (
          <g className="exercise-figure-person" filter={`url(#${shadowId})`}>
            <rect x="40" y="152" width="160" height="16" rx="8" fill={`url(#${matId})`} />
            <rect x="176" y="44" width="10" height="110" rx="5" fill="rgba(107, 58, 94, 0.18)" />
            {limb(86, 138, 122, 138, secondaryColor, 14)}
            {limb(122, 138, 154, 138, primaryColor, 14)}
            {limb(154, 138, 154, 82, primaryColor, 12)}
            {limb(166, 138, 166, 78, primaryColor, 12)}
            {limb(102, 136, 86, 124, secondaryColor, 10)}
            <circle cx="72" cy="138" r="13" fill={skinColor} stroke={secondaryColor} strokeWidth="4" />
            {joint(154, 138)}
            {joint(166, 138)}
          </g>
        )
      case 'happyBaby':
        return (
          <g className="exercise-figure-person" filter={`url(#${shadowId})`}>
            <rect x="38" y="152" width="164" height="16" rx="8" fill={`url(#${matId})`} />
            <rect x="98" y="110" width="46" height="28" rx="14" fill={primaryColor} />
            {limb(106, 114, 86, 84, primaryColor, 12)}
            {limb(136, 114, 156, 84, primaryColor, 12)}
            {limb(106, 126, 84, 92, secondaryColor, 12)}
            {limb(136, 126, 158, 92, secondaryColor, 12)}
            {limb(98, 118, 82, 90, secondaryColor, 9)}
            {limb(144, 118, 160, 90, secondaryColor, 9)}
            <circle cx="121" cy="144" r="14" fill={skinColor} stroke={secondaryColor} strokeWidth="4" />
            {joint(84, 92, 6)}
            {joint(158, 92, 6)}
          </g>
        )
      case 'seatedForwardFold':
        return (
          <g className="exercise-figure-person" filter={`url(#${shadowId})`}>
            <rect x="38" y="152" width="164" height="16" rx="8" fill={`url(#${matId})`} />
            {limb(88, 128, 148, 128, secondaryColor, 12)}
            {limb(88, 112, 122, 128, primaryColor, 16)}
            {limb(88, 110, 72, 100, secondaryColor, 10)}
            <circle cx="64" cy="96" r="12" fill={skinColor} stroke={secondaryColor} strokeWidth="4" />
          </g>
        )
      case 'walking':
      default:
        return (
          <g className="exercise-figure-person" filter={`url(#${shadowId})`}>
            <rect x="44" y="152" width="152" height="16" rx="8" fill={`url(#${matId})`} opacity="0.55" />
            <circle cx="120" cy="60" r="16" fill={skinColor} stroke={secondaryColor} strokeWidth="4" />
            <path d="M106 78 C112 70 128 70 134 78 L140 116 L104 116 Z" fill={primaryColor} />
            {limb(112, 88, 90, 112, secondaryColor, 10)}
            {limb(128, 88, 148, 108, secondaryColor, 10)}
            {limb(114, 116, 100, 152, secondaryColor, 12)}
            {limb(132, 116, 144, 152, primaryColor, 12)}
          </g>
        )
    }
  }

  return (
    <svg
      className={`exercise-figure-svg motion-${motion} tone-${tone}`}
      viewBox="0 0 240 200"
      role="img"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={matId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#d8c5ff" />
          <stop offset="100%" stopColor="#b79adf" />
        </linearGradient>
        <filter id={shadowId} x="-20%" y="-20%" width="140%" height="160%">
          <feDropShadow dx="0" dy="10" stdDeviation="10" floodColor="rgba(43, 27, 47, 0.18)" />
        </filter>
      </defs>
      {renderPose()}
    </svg>
  )
}

const EXERCISE_BY_PHASE = {
  menstrual: [
    {
      name: "Child's Pose",
      duration: 5,
      difficulty: 'Easy',
      description: 'A grounding forward fold that softens the belly, lower back, and hips.',
      illustrationTone: 'rose',
      motion: 'float',
      pose: 'childsPose',
      instructions: [
        'Knees wide, big toes together, and hips melting back toward your heels.',
        'Reach both arms long over the mat and let your shoulders soften away from your ears.',
        'Breathe slowly into your back body and relax your jaw with every exhale.',
      ],
    },
    {
      name: 'Cat-Cow Pose',
      duration: 4,
      difficulty: 'Easy',
      description: 'A gentle spinal wave to release cramps, stiffness, and stress through the torso.',
      illustrationTone: 'lavender',
      motion: 'sway',
      pose: 'catCow',
      instructions: [
        'Stack shoulders over wrists and hips over knees to find a stable tabletop.',
        'Inhale to broaden your chest and tip your tailbone up into Cow.',
        'Exhale to round your spine gently and draw your navel inward for Cat.',
      ],
    },
    {
      name: 'Supine Twist',
      duration: 6,
      difficulty: 'Easy',
      description: 'A restful floor twist that eases tension across the low back and outer hips.',
      illustrationTone: 'lavender',
      motion: 'float',
      pose: 'supineTwist',
      instructions: [
        'Lie back with your arms wide and draw one knee softly across your body.',
        'Keep both shoulders heavy on the floor while your breath smooths out.',
        'Let your belly soften and hold only as far as the twist feels nourishing.',
      ],
    },
    {
      name: 'Bridge Pose',
      duration: 4,
      difficulty: 'Easy',
      description: 'A supported back-body lift that gently awakens glutes, hamstrings, and the pelvis.',
      illustrationTone: 'rose',
      motion: 'pulse',
      pose: 'bridgePose',
      instructions: [
        'Plant your feet hip-width apart and rest your arms long beside you.',
        'Press through your heels to lift your hips slowly, keeping your neck relaxed.',
        'Lower down with control and pause for a full breath before repeating.',
      ],
    },
    {
      name: 'Legs Up The Wall',
      duration: 8,
      difficulty: 'Easy',
      description: 'A soothing inversion that calms the nervous system and relieves heavy legs.',
      illustrationTone: 'peach',
      motion: 'float',
      pose: 'legsUpWall',
      instructions: [
        'Scoot one hip close to the wall and swing your legs up with minimal effort.',
        'Rest your arms softly by your sides and let your belly rise with each inhale.',
        'Stay passive and allow gravity to drain tension from your feet and calves.',
      ],
    },
    {
      name: 'Happy Baby Pose',
      duration: 5,
      difficulty: 'Easy',
      description: 'A playful hip opener that releases pelvic tension without forcing the stretch.',
      illustrationTone: 'rose',
      motion: 'bounce',
      pose: 'happyBaby',
      instructions: [
        'Lie on your back and hold the outsides of your feet or ankles.',
        'Let your knees open wider than your ribs while keeping your tailbone grounded.',
        'Rock gently side to side if it feels good and keep the breath soft and even.',
      ],
    },
  ],
  follicular: [
    {
      name: 'Light Cardio Boost',
      duration: 20,
      difficulty: 'Moderate',
      description: 'A smooth cardio session to match the rise in energy after your period.',
      illustrationTone: 'peach',
      motion: 'walk',
      pose: 'walking',
      instructions: [
        'Warm up with gentle marching in place.',
        'Raise your pace into light jogging or brisk movement.',
        'Stay tall through your torso and keep breathing steady.',
        'Ease back down with a slower pace to recover.',
      ],
    },
    {
      name: 'Strength Foundations',
      duration: 18,
      difficulty: 'Moderate',
      description: 'Bodyweight strength work to build momentum while your energy is climbing.',
      illustrationTone: 'lavender',
      motion: 'pulse',
      pose: 'seatedForwardFold',
      instructions: [
        'Start with bodyweight squats and controlled tempo.',
        'Move into incline pushups or wall pushups.',
        'Add reverse lunges with balance and focus.',
        'Finish with a plank hold and steady breathing.',
      ],
    },
    {
      name: 'Dance Cardio Flow',
      duration: 16,
      difficulty: 'Moderate',
      description: 'Fun, uplifting movement that helps you use the fresh energy of this phase.',
      illustrationTone: 'rose',
      motion: 'bounce',
      pose: 'catCow',
      instructions: [
        'Step side to side and let your arms move freely.',
        'Add a little bounce and gentle turns.',
        'Keep the rhythm lively but still comfortable.',
        'Slow the music in your head and recover with deep breaths.',
      ],
    },
    {
      name: 'Core and Glutes',
      duration: 14,
      difficulty: 'Moderate',
      description: 'A focused workout for stability and strength with a feel-good pace.',
      illustrationTone: 'mint',
      motion: 'pulse',
      pose: 'supineTwist',
      instructions: [
        'Activate your core with slow dead bugs or toe taps.',
        'Move into glute bridges with a pause at the top.',
        'Add side leg lifts with control on both sides.',
        'Finish with a low plank and long exhale.',
      ],
    },
  ],
  ovulation: [
    {
      name: 'HIIT Power Set',
      duration: 18,
      difficulty: 'High',
      description: 'Short powerful intervals for the phase where many people feel strongest.',
      illustrationTone: 'peach',
      motion: 'bounce',
      pose: 'walking',
      instructions: [
        'Start with high knees or fast marches to warm up.',
        'Push into quick bursts of squats and jacks.',
        'Recover with slower steps and steady breathing.',
        'Repeat strong efforts while keeping good form.',
      ],
    },
    {
      name: 'Run and Recharge',
      duration: 20,
      difficulty: 'High',
      description: 'A brisk run or jog session for days when stamina and confidence feel higher.',
      illustrationTone: 'mint',
      motion: 'walk',
      pose: 'walking',
      instructions: [
        'Begin with a brisk walk and relaxed shoulders.',
        'Build into a faster run while staying tall.',
        'Let your breathing settle into a steady rhythm.',
        'Cool down gradually to lower your heart rate.',
      ],
    },
    {
      name: 'Group Class Energy',
      duration: 25,
      difficulty: 'High',
      description: 'An upbeat routine inspired by dance or studio classes to channel peak energy.',
      illustrationTone: 'rose',
      motion: 'bounce',
      pose: 'catCow',
      instructions: [
        'Find the beat and start with wide side steps.',
        'Add arm reaches and quick foot changes.',
        'Keep your chest lifted and your energy bright.',
        'Finish with a strong final set and easy cooldown.',
      ],
    },
    {
      name: 'Athletic Circuit',
      duration: 15,
      difficulty: 'High',
      description: 'Quick, strong movement patterns with squats, lunges, and cardio intervals.',
      illustrationTone: 'lavender',
      motion: 'pulse',
      pose: 'seatedForwardFold',
      instructions: [
        'Set up your stance and begin with strong squats.',
        'Move into alternating lunges with control.',
        'Add cardio bursts like skaters or fast feet.',
        'Recover for a moment and repeat with power.',
      ],
    },
  ],
  luteal: [
    {
      name: 'Pilates Reset',
      duration: 16,
      difficulty: 'Moderate',
      description: 'Low-impact core and posture work for steady energy and gentle strength.',
      illustrationTone: 'lavender',
      motion: 'float',
      pose: 'supineTwist',
      instructions: [
        'Start with a neutral spine and soft abdominal engagement.',
        'Move through slow tabletop leg taps.',
        'Add controlled side lying leg work.',
        'Finish with a long stretch and steady exhale.',
      ],
    },
    {
      name: 'Light Weights Session',
      duration: 18,
      difficulty: 'Moderate',
      description: 'Supportive resistance training without pushing too hard late in the cycle.',
      illustrationTone: 'peach',
      motion: 'pulse',
      pose: 'seatedForwardFold',
      instructions: [
        'Choose light weights and stand tall.',
        'Lift with control through shoulders and arms.',
        'Pause between reps and keep your breath smooth.',
        'Finish with a slow full body stretch.',
      ],
    },
    {
      name: 'Easy Swim Routine',
      duration: 20,
      difficulty: 'Moderate',
      description: 'Smooth, supportive movement that feels kind on the body in the pre-period days.',
      illustrationTone: 'mint',
      motion: 'float',
      pose: 'supineTwist',
      instructions: [
        'Begin with easy laps and long strokes.',
        'Focus on smooth breathing and relaxed shoulders.',
        'Maintain an even pace without pushing intensity.',
        'Cool down with a final slow lap and stretch.',
      ],
    },
    {
      name: 'Slow Strength Flow',
      duration: 14,
      difficulty: 'Easy',
      description: 'Steady movement with longer rests for days when your body wants gentler pacing.',
      illustrationTone: 'rose',
      motion: 'pulse',
      pose: 'childsPose',
      instructions: [
        'Move through squats and reaches at a calm pace.',
        'Rest generously and reset your breath.',
        'Add gentle core work or supported lunges.',
        'Finish with mobility and a long calming exhale.',
      ],
    },
  ],
}

const PERIOD_PAIN_TRACKS = [
  {
    name: 'Healing Rose',
    artist: 'Veluna Frequencies',
    tag: '432Hz',
    duration: 300,
    type: 'tone',
    frequency: 432,
    tagTone: 'rose',
  },
  {
    name: 'Womb Healing',
    artist: 'Veluna Frequencies',
    tag: '528Hz',
    duration: 360,
    type: 'tone',
    frequency: 528,
    reverb: true,
    tagTone: 'mint',
  },
  {
    name: 'Cramp Relief Flow',
    artist: 'Veluna Sound Lab',
    tag: 'Binaural',
    duration: 240,
    type: 'binaural',
    baseFrequency: 200,
    beatFrequency: 10,
    tagTone: 'lavender',
  },
  {
    name: 'Deep Body Rest',
    artist: 'Veluna Frequencies',
    tag: '396Hz',
    duration: 420,
    type: 'tone',
    frequency: 396,
    tagTone: 'amber',
  },
]

const STRESS_RELIEF_TRACKS = [
  {
    name: 'Calm Mind',
    artist: 'Veluna Frequencies',
    tag: '528Hz',
    duration: 300,
    type: 'tone',
    frequency: 528,
    tagTone: 'mint',
  },
  {
    name: 'Anxiety Release',
    artist: 'Veluna Sound Lab',
    tag: 'Theta',
    duration: 360,
    type: 'binaural',
    baseFrequency: 200,
    beatFrequency: 6,
    tagTone: 'lavender',
  },
  {
    name: 'Purple Rain Meditation',
    artist: 'Veluna Frequencies',
    tag: '417Hz',
    duration: 240,
    type: 'tone',
    frequency: 417,
    tagTone: 'plum',
  },
  {
    name: 'Float Away',
    artist: 'Veluna Sound Lab',
    tag: 'Delta',
    duration: 480,
    type: 'binaural',
    baseFrequency: 200,
    beatFrequency: 2,
    tagTone: 'sky',
  },
]

const SLEEP_BETTER_TRACKS = [
  {
    name: 'Night Sky',
    artist: 'Veluna Frequencies',
    tag: '432Hz',
    duration: 600,
    type: 'tone',
    frequency: 432,
    tagTone: 'rose',
  },
  {
    name: 'Deep Sleep Delta',
    artist: 'Veluna Sound Lab',
    tag: '2Hz',
    duration: 480,
    type: 'binaural',
    baseFrequency: 200,
    beatFrequency: 2,
    tagTone: 'sky',
  },
  {
    name: 'Moonlight Rest',
    artist: 'Veluna Frequencies',
    tag: '396Hz',
    duration: 420,
    type: 'tone',
    frequency: 396,
    tagTone: 'amber',
  },
  {
    name: 'Dream State',
    artist: 'Veluna Sound Lab',
    tag: 'Theta',
    duration: 540,
    type: 'binaural',
    baseFrequency: 200,
    beatFrequency: 6,
    tagTone: 'lavender',
  },
]

const HORMONAL_BALANCE_TRACKS = [
  {
    name: 'Green Harmony',
    artist: 'Veluna Frequencies',
    tag: '528Hz',
    duration: 360,
    type: 'tone',
    frequency: 528,
    tagTone: 'mint',
  },
  {
    name: 'Cycle Sync',
    artist: 'Veluna Frequencies',
    tag: '432Hz',
    duration: 300,
    type: 'tone',
    frequency: 432,
    tagTone: 'rose',
  },
  {
    name: 'Hormone Flow',
    artist: 'Veluna Sound Lab',
    tag: 'Binaural',
    duration: 420,
    type: 'binaural',
    baseFrequency: 200,
    beatFrequency: 7,
    tagTone: 'lavender',
  },
  {
    name: 'Inner Balance',
    artist: 'Veluna Frequencies',
    tag: '396Hz',
    duration: 240,
    type: 'tone',
    frequency: 396,
    tagTone: 'amber',
  },
]

const MEDITATION_SESSIONS = [
  {
    key: 'period-pain-relief',
    title: 'Period Pain Relief',
    label: 'Guided session',
    duration: 10,
    description: 'A calming breathing practice for softening body tension and easing cramps.',
    bannerVariant: 'period',
    tracks: PERIOD_PAIN_TRACKS,
  },
  {
    key: 'stress-relief',
    title: 'Stress Relief',
    label: 'Guided session',
    duration: 15,
    description: 'Grounding breathwork to slow racing thoughts and settle your nervous system.',
    bannerVariant: 'stress',
    tracks: STRESS_RELIEF_TRACKS,
  },
  {
    key: 'sleep-better',
    title: 'Sleep Better',
    label: 'Guided session',
    duration: 20,
    description: 'A slow evening meditation to help your body unwind and prepare for deep rest.',
    bannerVariant: 'sleep',
    tracks: SLEEP_BETTER_TRACKS,
  },
  {
    key: 'hormonal-balance',
    title: 'Hormonal Balance',
    label: 'Guided session',
    duration: 8,
    description: 'A short reset for days when you want calm, focus, and steadier energy.',
    bannerVariant: 'hormonal',
    tracks: HORMONAL_BALANCE_TRACKS,
  },
]

const MENOPAUSE_MEDITATION_SESSION = {
  key: 'menopause-relief',
  title: 'Menopause Relief Breathing',
  label: 'Guided session',
  duration: 12,
  description: 'A calming breathing exercise to reduce hot flashes and hormonal anxiety.',
  bannerVariant: 'hormonal',
  tracks: HORMONAL_BALANCE_TRACKS,
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
  return Math.round((laterDate - earlierDate) / DAY_IN_MS)
}

function formatDuration(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function getDifficultyTone(level) {
  if (level === 'High') {
    return 'high'
  }

  if (level === 'Moderate') {
    return 'moderate'
  }

  return 'easy'
}

function getCurrentPhase(cycleLogs) {
  const startDates = cycleLogs.map((log) => normalizeDate(log.start_date)).filter(Boolean)

  if (startDates.length === 0) {
    return 'luteal'
  }

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

  const latestStartDate = startDates[0]
  const today = new Date()
  const normalizedToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const cycleDay =
    ((diffInDays(normalizedToday, latestStartDate) % averageCycleLength) + averageCycleLength) %
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

function buildExerciseSequence(items, startIndex) {
  return [...items.slice(startIndex), ...items.slice(0, startIndex)]
}

function playPromptChime() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext

  if (!AudioContextClass) {
    return
  }

  const audioContext = new AudioContextClass()
  const oscillator = audioContext.createOscillator()
  const gainNode = audioContext.createGain()
  const secondOscillator = audioContext.createOscillator()
  const secondGain = audioContext.createGain()
  const now = audioContext.currentTime

  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(660, now)
  gainNode.gain.setValueAtTime(0.0001, now)
  gainNode.gain.exponentialRampToValueAtTime(0.08, now + 0.03)
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.28)

  secondOscillator.type = 'sine'
  secondOscillator.frequency.setValueAtTime(880, now + 0.08)
  secondGain.gain.setValueAtTime(0.0001, now + 0.08)
  secondGain.gain.exponentialRampToValueAtTime(0.06, now + 0.12)
  secondGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.34)

  oscillator.connect(gainNode)
  secondOscillator.connect(secondGain)
  gainNode.connect(audioContext.destination)
  secondGain.connect(audioContext.destination)

  oscillator.start(now)
  secondOscillator.start(now + 0.08)
  oscillator.stop(now + 0.3)
  secondOscillator.stop(now + 0.36)

  window.setTimeout(() => {
    void audioContext.close().catch(() => {})
  }, 500)
}

function createImpulseResponse(audioContext, duration = 3.8, decay = 2.6) {
  const sampleRate = audioContext.sampleRate
  const length = sampleRate * duration
  const impulse = audioContext.createBuffer(2, length, sampleRate)

  for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
    const channelData = impulse.getChannelData(channel)
    for (let index = 0; index < length; index += 1) {
      const envelope = (1 - index / length) ** decay
      channelData[index] = (Math.random() * 2 - 1) * envelope
    }
  }

  return impulse
}

function MeditationBannerCanvas({ variant, isPlaying }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return undefined
    }

    const context = canvas.getContext('2d')
    if (!context) {
      return undefined
    }

    let frameId = 0
    let startTime = 0

    const particles = Array.from({ length: 18 }, (_, index) => ({
      angle: (Math.PI * 2 * index) / 18,
      radius: 20 + (index % 6) * 10,
      speed: 0.2 + (index % 5) * 0.03,
      size: 2 + (index % 3),
      drift: 10 + (index % 4) * 8,
      twinkle: 0.4 + (index % 5) * 0.12,
    }))

    const stars = Array.from({ length: 18 }, (_, index) => ({
      x: 12 + (index * 31) % 320,
      y: 10 + (index * 17) % 90,
      size: 1.4 + (index % 3) * 0.8,
      phase: index * 0.6,
    }))

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect()
      const ratio = window.devicePixelRatio || 1
      canvas.width = rect.width * ratio
      canvas.height = rect.height * ratio
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
    }

    const drawPeriodBanner = (time, width, height) => {
      const cx = width / 2
      const cy = height / 2 + 2
      const pulse = isPlaying ? 1 + Math.sin(time * 2.8) * 0.08 : 1

      for (let ring = 0; ring < 3; ring += 1) {
        context.beginPath()
        context.strokeStyle = `rgba(255,255,255,${0.38 - ring * 0.09})`
        context.lineWidth = 1.5
        context.arc(cx, cy, (18 + ring * 17) * pulse, 0, Math.PI * 2)
        context.stroke()
      }

      context.save()
      context.translate(cx, cy)
      context.rotate(time * (isPlaying ? 0.75 : 0.28))
      for (let petal = 0; petal < 8; petal += 1) {
        context.rotate((Math.PI * 2) / 8)
        context.beginPath()
        context.fillStyle = 'rgba(201, 107, 138, 0.22)'
        context.ellipse(0, -22, 9, 24, 0, 0, Math.PI * 2)
        context.fill()
      }
      context.restore()
    }

    const drawStressBanner = (time, width) => {
      const speed = isPlaying ? 1.65 : 0.8
      for (let row = 0; row < 3; row += 1) {
        context.beginPath()
        context.lineWidth = 2
        context.strokeStyle = `rgba(255,255,255,${0.45 - row * 0.08})`
        for (let x = 0; x <= width; x += 4) {
          const y =
            32 +
            row * 18 +
            Math.sin(x * 0.04 + time * speed + row * 0.8) * (isPlaying ? 7 : 4)
          if (x === 0) {
            context.moveTo(x, y)
          } else {
            context.lineTo(x, y)
          }
        }
        context.stroke()
      }

      particles.forEach((particle, index) => {
        const x = (index * 23 + time * particle.speed * 26) % (width + 40) - 20
        const y =
          22 +
          Math.sin(time * particle.speed + particle.angle) * particle.drift +
          (index % 4) * 16
        context.beginPath()
        context.fillStyle = 'rgba(255,255,255,0.48)'
        context.arc(x, y, particle.size, 0, Math.PI * 2)
        context.fill()
      })
    }

    const drawSleepBanner = (time, width) => {
      const moonRadius = isPlaying ? 19 : 16
      context.beginPath()
      context.fillStyle = 'rgba(255, 245, 225, 0.98)'
      context.shadowColor = 'rgba(255, 234, 190, 0.42)'
      context.shadowBlur = isPlaying ? 22 : 12
      context.arc(width - 46, 30, moonRadius, 0, Math.PI * 2)
      context.fill()
      context.shadowBlur = 0

      stars.forEach((star) => {
        const alpha = 0.35 + ((Math.sin(time * 2.4 + star.phase) + 1) / 2) * 0.65
        context.beginPath()
        context.fillStyle = `rgba(255,255,255,${alpha})`
        context.arc(star.x, star.y, star.size, 0, Math.PI * 2)
        context.fill()
      })
    }

    const drawHormonalBanner = (time, width, height) => {
      const cx = width / 2
      const cy = height / 2
      context.save()
      context.translate(cx, cy)
      context.rotate(time * (isPlaying ? 1.2 : 0.45))
      for (let arm = 0; arm < 42; arm += 1) {
        const progress = arm / 42
        context.rotate(0.22)
        context.beginPath()
        context.strokeStyle = `rgba(255,255,255,${0.14 + progress * 0.45})`
        context.lineWidth = 1.4
        context.moveTo(0, 0)
        context.lineTo(progress * 46, 0)
        context.stroke()
      }
      context.restore()

      particles.slice(0, 8).forEach((particle, index) => {
        const orbit = 18 + index * 5
        const angle = time * (isPlaying ? 1.5 : 0.7) + particle.angle
        const x = cx + Math.cos(angle) * orbit
        const y = cy + Math.sin(angle) * orbit * 0.55
        context.beginPath()
        context.fillStyle = index % 2 === 0 ? 'rgba(255,255,255,0.85)' : 'rgba(201,107,138,0.75)'
        context.arc(x, y, 3.2, 0, Math.PI * 2)
        context.fill()
      })
    }

    const render = (timestamp) => {
      if (!startTime) {
        startTime = timestamp
      }

      const time = (timestamp - startTime) / 1000
      const width = canvas.clientWidth
      const height = canvas.clientHeight

      context.clearRect(0, 0, width, height)

      const gradient = context.createLinearGradient(0, 0, width, height)
      gradient.addColorStop(0, '#f9d9e4')
      gradient.addColorStop(0.52, '#f4dff2')
      gradient.addColorStop(1, '#eef5ff')
      context.fillStyle = gradient
      context.fillRect(0, 0, width, height)

      context.fillStyle = 'rgba(255,255,255,0.18)'
      context.beginPath()
      context.ellipse(width * 0.18, height * 0.28, 42, 22, -0.4, 0, Math.PI * 2)
      context.fill()

      context.beginPath()
      context.ellipse(width * 0.84, height * 0.74, 54, 26, 0.3, 0, Math.PI * 2)
      context.fill()

      if (variant === 'period') {
        drawPeriodBanner(time, width, height)
      } else if (variant === 'stress') {
        drawStressBanner(time, width)
      } else if (variant === 'sleep') {
        drawSleepBanner(time, width)
      } else {
        drawHormonalBanner(time, width, height)
      }

      frameId = window.requestAnimationFrame(render)
    }

    resizeCanvas()
    frameId = window.requestAnimationFrame(render)
    window.addEventListener('resize', resizeCanvas)

    return () => {
      window.cancelAnimationFrame(frameId)
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [isPlaying, variant])

  return <canvas ref={canvasRef} className="meditation-banner-canvas" aria-hidden="true"></canvas>
}

function ExerciseAbstractBanner({ title, variant }) {
  return (
    <div className={`exercise-card-illustration exercise-banner-${variant}`}>
      <div className="exercise-banner-shapes" aria-hidden="true">
        {variant === 'pulse' ? (
          <>
            <span className="exercise-pulse-circle pulse-circle-1"></span>
            <span className="exercise-pulse-circle pulse-circle-2"></span>
            <span className="exercise-pulse-circle pulse-circle-3"></span>
          </>
        ) : null}

        {variant === 'wave' ? <span className="exercise-wave-line"></span> : null}

        {variant === 'orbit' ? (
          <>
            <span className="exercise-orbit-circle orbit-circle-1"></span>
            <span className="exercise-orbit-circle orbit-circle-2"></span>
          </>
        ) : null}

        {variant === 'bars' ? (
          <span className="exercise-equalizer">
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
          </span>
        ) : null}
      </div>
      <div className="exercise-banner-title" aria-hidden="true">
        {title}
      </div>
    </div>
  )
}

export default function Wellness() {
  const [cycleLogs, setCycleLogs] = useState([])
  const [profileAge, setProfileAge] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [phaseOverride, setPhaseOverride] = useState(null)
  const [activeExerciseSession, setActiveExerciseSession] = useState(null)
  const [exerciseStepIndex, setExerciseStepIndex] = useState(0)
  const [exerciseElapsed, setExerciseElapsed] = useState(0)
  const [exercisePaused, setExercisePaused] = useState(false)
  const [exerciseMuted, setExerciseMuted] = useState(false)
  const [activeMeditation, setActiveMeditation] = useState(null)
  const [meditationElapsed, setMeditationElapsed] = useState(0)
  const exerciseAudioRef = useRef(null)

  useEffect(() => {
    let active = true

    async function loadCycleLogs() {
      setLoading(true)
      setError('')

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (!active) {
          return
        }

        if (userError || !user) {
          throw new Error(userError?.message || 'Could not load wellness recommendations.')
        }

        const [logsResult, profileResult] = await Promise.all([
          supabase
            .from('cycle_logs')
            .select('*')
            .eq('profile_id', user.id)
            .order('start_date', { ascending: false })
            .limit(6),
          supabase.from('profiles').select('age').eq('id', user.id).maybeSingle(),
        ])

        if (!active) {
          return
        }

        if (logsResult.error) {
          throw new Error(logsResult.error.message || 'Could not load your cycle data.')
        }

        setCycleLogs(logsResult.data ?? [])
        setProfileAge(profileResult.error ? null : Number(profileResult.data?.age) || null)
        setPhaseOverride(null)
      } catch (loadError) {
        if (!active) {
          return
        }

        setCycleLogs([])
        setProfileAge(null)
        setPhaseOverride('luteal')
        setError(
          loadError.message ||
            'Could not load wellness recommendations right now. Showing luteal phase guidance instead.',
        )
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadCycleLogs()

    return () => {
      active = false
    }
  }, [])

  const currentPhase = useMemo(
    () => phaseOverride ?? getCurrentPhase(cycleLogs),
    [cycleLogs, phaseOverride],
  )
  const exercises = EXERCISE_BY_PHASE[currentPhase] ?? EXERCISE_BY_PHASE.luteal
  const meditationSessions = useMemo(
    () =>
      profileAge !== null && profileAge >= 37
        ? [...MEDITATION_SESSIONS, MENOPAUSE_MEDITATION_SESSION]
        : MEDITATION_SESSIONS,
    [profileAge],
  )
  const activeExercise = activeExerciseSession
    ? activeExerciseSession.sequence[exerciseStepIndex] ?? null
    : null

  useEffect(() => {
    if (!activeExercise || exercisePaused) {
      return undefined
    }

    const intervalId = window.setInterval(() => {
      setExerciseElapsed((current) => current + 1)
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [activeExercise, exercisePaused])

  useEffect(() => {
    if (!activeExerciseSession || !activeExercise) {
      return
    }

    const poseDurationSeconds = activeExercise.duration * 60
    if (exerciseElapsed < poseDurationSeconds) {
      return
    }

    if (exerciseStepIndex < activeExerciseSession.sequence.length - 1) {
      setExerciseStepIndex((current) => current + 1)
      setExerciseElapsed(0)
      playPromptChime()
      return
    }

    setActiveExerciseSession(null)
    setExerciseStepIndex(0)
    setExerciseElapsed(0)
    setExercisePaused(false)
  }, [activeExercise, activeExerciseSession, exerciseElapsed, exerciseStepIndex])

  useEffect(() => {
    const currentAudio = exerciseAudioRef.current
    if (!activeExerciseSession) {
      if (currentAudio) {
        const now = currentAudio.context.currentTime
        currentAudio.masterGain.gain.cancelScheduledValues(now)
        currentAudio.masterGain.gain.setValueAtTime(
          Math.max(currentAudio.masterGain.gain.value, 0.0001),
          now,
        )
        currentAudio.masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6)
        window.setTimeout(() => {
          try {
            currentAudio.oscillator.stop()
          } catch {
            // ignore oscillator teardown issues
          }
          void currentAudio.context.close().catch(() => {})
        }, 700)
        exerciseAudioRef.current = null
      }
      return undefined
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass || currentAudio) {
      return undefined
    }

    let cancelled = false

    const startAmbientAudio = async () => {
      const context = new AudioContextClass()
      await context.resume().catch(() => {})
      if (cancelled) {
        void context.close().catch(() => {})
        return
      }

      const oscillator = context.createOscillator()
      const convolver = context.createConvolver()
      const dryGain = context.createGain()
      const wetGain = context.createGain()
      const masterGain = context.createGain()
      const lowPass = context.createBiquadFilter()

      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(432, context.currentTime)
      convolver.buffer = createImpulseResponse(context)
      dryGain.gain.value = 0.55
      wetGain.gain.value = 0.42
      masterGain.gain.setValueAtTime(0.0001, context.currentTime)
      lowPass.type = 'lowpass'
      lowPass.frequency.setValueAtTime(980, context.currentTime)

      oscillator.connect(dryGain)
      oscillator.connect(convolver)
      convolver.connect(wetGain)
      dryGain.connect(lowPass)
      wetGain.connect(lowPass)
      lowPass.connect(masterGain)
      masterGain.connect(context.destination)

      oscillator.start()

      exerciseAudioRef.current = {
        context,
        oscillator,
        masterGain,
      }
    }

    void startAmbientAudio()

    return () => {
      cancelled = true
    }
  }, [activeExerciseSession])

  useEffect(() => {
    const currentAudio = exerciseAudioRef.current
    if (!currentAudio) {
      return
    }

    const now = currentAudio.context.currentTime
    const shouldPlay = activeExerciseSession && !exercisePaused && !exerciseMuted
    currentAudio.masterGain.gain.cancelScheduledValues(now)
    currentAudio.masterGain.gain.setValueAtTime(
      Math.max(currentAudio.masterGain.gain.value, 0.0001),
      now,
    )
    currentAudio.masterGain.gain.exponentialRampToValueAtTime(
      shouldPlay ? 0.028 : 0.0001,
      now + (shouldPlay ? 3 : 0.45),
    )
  }, [activeExerciseSession, exerciseMuted, exercisePaused])

  useEffect(() => {
    if (!activeMeditation) {
      return undefined
    }

    const intervalId = window.setInterval(() => {
      setMeditationElapsed((current) => current + 1)
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [activeMeditation])

  const exerciseRemaining = activeExercise ? Math.max(activeExercise.duration * 60 - exerciseElapsed, 0) : 0
  const exerciseProgress = activeExercise
    ? Math.min(exerciseElapsed / (activeExercise.duration * 60), 1)
    : 0
  const exerciseRingOffset = RING_CIRCUMFERENCE * (1 - exerciseProgress)
  const exerciseSequenceProgress = activeExerciseSession
    ? (exerciseStepIndex + exerciseProgress) / activeExerciseSession.sequence.length
    : 0

  const meditationTotalSeconds = activeMeditation ? activeMeditation.duration * 60 : 0
  const meditationProgress = activeMeditation
    ? Math.min(meditationElapsed / meditationTotalSeconds, 1)
    : 0
  const meditationRingOffset = RING_CIRCUMFERENCE * (1 - meditationProgress)

  const breathingState = useMemo(() => {
    if (!activeMeditation) {
      return BREATHING_PATTERN[0]
    }

    const cycleLength = BREATHING_PATTERN.reduce((sum, step) => sum + step.seconds, 0)
    const position = meditationElapsed % cycleLength
    let cursor = 0

    for (const step of BREATHING_PATTERN) {
      cursor += step.seconds
      if (position < cursor) {
        return step
      }
    }

    return BREATHING_PATTERN[0]
  }, [activeMeditation, meditationElapsed])

  const handleStartExercise = (exerciseIndex) => {
    const sequence = buildExerciseSequence(exercises, exerciseIndex)
    setActiveExerciseSession({
      title: `${currentPhase.charAt(0).toUpperCase()}${currentPhase.slice(1)} movement flow`,
      sequence,
    })
    setExerciseStepIndex(0)
    setExerciseElapsed(0)
    setExercisePaused(false)
    setExerciseMuted(false)
  }

  const handleRestartExercise = () => {
    setExerciseStepIndex(0)
    setExerciseElapsed(0)
    setExercisePaused(false)
  }

  const handleStopExercise = () => {
    setActiveExerciseSession(null)
    setExerciseStepIndex(0)
    setExerciseElapsed(0)
    setExercisePaused(false)
  }

  const handleStartMeditation = (session) => {
    setActiveMeditation(session)
    setMeditationElapsed(0)
  }

  const handleEndMeditation = () => {
    setActiveMeditation(null)
    setMeditationElapsed(0)
  }

  return (
    <div className="wellness-page page-stack">
      <header className="section-title">
        <p className="eyebrow">Daily wellness</p>
        <h1 className="page-title">
          <span className="page-title-icon" aria-hidden="true">
            <Heart size={22} strokeWidth={1.8} />
          </span>
          <span>Wellness</span>
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
          <span>Preparing your wellness space...</span>
        </div>
      ) : (
        <>
          <section className="page-stack">
            <div className="section-title">
              <p className="eyebrow">Exercise</p>
              <h2>Movement for your {currentPhase} phase</h2>
            </div>

            <div className="wellness-grid">
              {exercises.map((exercise, index) => (
                <article
                  key={exercise.name}
                  className={`card wellness-card exercise-card tone-${exercise.illustrationTone}`}
                >
                  <div className="exercise-card-illustration-shell">
                    <ExerciseAbstractBanner
                      title={exercise.name}
                      variant={['pulse', 'wave', 'orbit', 'bars'][index % 4]}
                    />
                  </div>
                  <div className="exercise-card-copy">
                    <div className="exercise-card-badges">
                      <span className="wellness-duration-badge">{exercise.duration} min</span>
                      <span className={`wellness-badge ${getDifficultyTone(exercise.difficulty)}`}>
                        {exercise.difficulty}
                      </span>
                    </div>
                    <h3>{exercise.name}</h3>
                    <p className="wellness-copy">{exercise.description}</p>
                  </div>
                  <button
                    type="button"
                    className="wellness-action exercise-start-button"
                    onClick={() => handleStartExercise(index)}
                  >
                    Start Exercise
                  </button>
                </article>
              ))}
            </div>
          </section>

          <section className="page-stack">
            <div className="section-title">
              <p className="eyebrow">Meditation</p>
              <h2>Breathing and calm</h2>
            </div>

            <div className="meditation-section-shell">
              <span className="wellness-blob wellness-blob-large" aria-hidden="true"></span>
              <span className="wellness-blob wellness-blob-small" aria-hidden="true"></span>
              <div className="meditation-grid">
                {meditationSessions.map((session, index) => (
                  <article
                    key={session.title}
                    className="meditation-card"
                    style={{ '--card-delay': `${index * 0.12}s` }}
                  >
                    <div className="meditation-banner">
                      <MeditationBannerCanvas variant={session.bannerVariant} isPlaying={false} />
                    </div>
                    <div className="meditation-card-copy">
                      <p className="meditation-session-label">{session.label}</p>
                      <h3>{session.title}</h3>
                      <p className="meditation-card-description">{session.description}</p>
                    </div>
                    <button
                      type="button"
                      className="meditation-session-button"
                      onClick={() => handleStartMeditation(session)}
                    >
                      Begin Session
                    </button>
                  </article>
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      {activeExercise ? (
        <div className="wellness-overlay fitness-overlay" role="dialog" aria-modal="true">
          <div className="wellness-overlay-card fitness-overlay-card yoga-overlay-card">
            <div className="fitness-audio-hud">
              <span className="fitness-audio-indicator">
                <Music2 size={15} />
                Calming 432Hz
              </span>
              <button
                type="button"
                className="fitness-audio-toggle"
                onClick={() => setExerciseMuted((current) => !current)}
                aria-label={exerciseMuted ? 'Unmute calming music' : 'Mute calming music'}
              >
                {exerciseMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
            </div>
            <p className="card-label overlay-label">Exercise session</p>
            <h2>{activeExerciseSession?.title}</h2>
            <p className="fitness-sequence-kicker">
              Pose {exerciseStepIndex + 1} of {activeExerciseSession?.sequence.length}
            </p>

            <div className="fitness-overlay-center fitness-overlay-center--yoga">
              <div className="fitness-exercise-stage">
                <div
                  className={`fitness-exercise-figure motion-${activeExercise.motion} tone-${activeExercise.illustrationTone}`}
                  aria-hidden="true"
                >
                  <ExerciseFigure
                    pose={activeExercise.pose}
                    motion={activeExercise.motion}
                    tone={activeExercise.illustrationTone}
                  />
                </div>
              </div>

              <div className="fitness-overlay-copy">
                <h3 className="fitness-pose-title">{activeExercise.name}</h3>
                <ul className="fitness-instruction-list">
                  {activeExercise.instructions.map((instruction) => (
                    <li key={instruction}>{instruction}</li>
                  ))}
                </ul>
              </div>

              <div className="fitness-timer-panel">
                <div className="wellness-ring">
                  <svg viewBox="0 0 160 160" className="wellness-ring-svg" aria-hidden="true">
                    <circle className="wellness-ring-track" cx="80" cy="80" r={RING_RADIUS}></circle>
                    <circle
                      className="wellness-ring-progress"
                      cx="80"
                      cy="80"
                      r={RING_RADIUS}
                      style={{ strokeDasharray: RING_CIRCUMFERENCE, strokeDashoffset: exerciseRingOffset }}
                    ></circle>
                  </svg>
                  <div className="wellness-ring-content">
                    <span className="wellness-ring-label">Pose timer</span>
                    <strong>{formatDuration(exerciseRemaining)}</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="fitness-progress-bar" aria-hidden="true">
              <span style={{ width: `${exerciseSequenceProgress * 100}%` }}></span>
            </div>

            <div className="wellness-overlay-actions">
              <button
                type="button"
                className="pill-button"
                onClick={() => setExercisePaused((current) => !current)}
              >
                {exercisePaused ? <Play size={16} /> : <Pause size={16} />}
                {exercisePaused ? 'Resume' : 'Pause'}
              </button>
              <button type="button" className="onboarding-secondary-button" onClick={handleRestartExercise}>
                <RotateCcw size={16} />
                Restart
              </button>
              <button type="button" className="onboarding-secondary-button" onClick={handleStopExercise}>
                <Square size={16} />
                End Session
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {activeMeditation ? (
        <div className="wellness-overlay meditation-overlay" role="dialog" aria-modal="true">
          <div className="wellness-overlay-card meditation-overlay-card premium-meditation-card">
            <p className="card-label overlay-label">Meditation session</p>
            <h2>{activeMeditation.title}</h2>
            <div className="wellness-ring meditation-ring">
              <svg viewBox="0 0 160 160" className="wellness-ring-svg" aria-hidden="true">
                <circle className="wellness-ring-track light" cx="80" cy="80" r={RING_RADIUS}></circle>
                <circle
                  className="wellness-ring-progress light"
                  cx="80"
                  cy="80"
                  r={RING_RADIUS}
                  style={{ strokeDasharray: RING_CIRCUMFERENCE, strokeDashoffset: meditationRingOffset }}
                ></circle>
              </svg>
              <div className={`breathing-circle phase-${breathingState.label.toLowerCase()}`}>
                <div className="breathing-circle-inner">
                  <span>{breathingState.label}</span>
                </div>
              </div>
            </div>
            <p className="breathing-instruction">
              {breathingState.label} {breathingState.seconds} seconds
            </p>
            <p className="meditation-elapsed">{formatDuration(meditationElapsed)}</p>
            <button
              type="button"
              className="onboarding-secondary-button end-session-button white-end-button"
              onClick={handleEndMeditation}
            >
              End Session
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
