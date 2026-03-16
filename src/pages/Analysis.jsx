import { useEffect, useMemo, useState } from 'react'
import { Activity } from 'lucide-react'
import supabase, { GROQ_KEY } from '../lib/supabase.js'

const initialFormState = {
  age: '',
  heightCm: '',
  weightKg: '',
  hemoglobin: '',
  bloodSugar: '',
  tshLevel: '',
  familyHistoryPcos: 'not sure',
  familyHistoryThyroid: 'not sure',
  stressLevel: 'moderate',
  sleepHours: '7-8',
  dietQuality: 'average',
  exerciseFrequency: '1-2 times a week',
  concerns: '',
}

const optionalFieldConfig = [
  { key: 'tshLevel', label: 'TSH level', improvement: 15 },
  { key: 'bloodSugar', label: 'blood sugar', improvement: 14 },
  { key: 'hemoglobin', label: 'hemoglobin', improvement: 12 },
]

function parseBulletSection(text, heading) {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = new RegExp(
    `${escapedHeading}\\s*:?\\s*([\\s\\S]*?)(?:\\n\\s*[A-Za-z][^\\n]*:|$)`,
    'i',
  )
  const match = text.match(pattern)

  if (!match) {
    return []
  }

  return match[1]
    .split('\n')
    .map((line) => line.replace(/^\s*[-*Ã¢â‚¬Â¢]\s*/, '').trim())
    .filter(Boolean)
}

function parseSingleValue(text, label, fallback = 'Unavailable') {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = new RegExp(`${escapedLabel}\\s*:?\\s*(.+)`, 'i')
  const match = text.match(pattern)
  return match ? match[1].split('\n')[0].trim() : fallback
}

function parseRiskPercent(text) {
  const line = parseSingleValue(text, 'PCOS risk', '')
  const percentMatch = line.match(/(\d{1,3}(?:\.\d+)?)/)

  if (!percentMatch) {
    return 0
  }

  return Math.max(0, Math.min(100, Math.round(Number(percentMatch[1]))))
}

function normalizeExplainableFactors(factors) {
  const cleanFactors = factors.filter((factor) => factor.factor)

  if (!cleanFactors.length) {
    return []
  }

  const explicitTotal = cleanFactors.reduce(
    (total, factor) => total + (Number.isFinite(factor.contribution) ? factor.contribution : 0),
    0,
  )
  const missingContributions = cleanFactors.filter(
    (factor) => !Number.isFinite(factor.contribution),
  ).length
  const remainingShare = Math.max(0, 100 - explicitTotal)
  const fallbackContribution =
    missingContributions > 0 ? Math.max(1, Math.round(remainingShare / missingContributions)) : 0

  return cleanFactors.map((factor, index) => ({
    id: `${factor.factor}-${index}`,
    factor: factor.factor,
    impact: factor.impact ?? 'medium',
    contribution: Number.isFinite(factor.contribution)
      ? Math.max(0, Math.min(100, Math.round(factor.contribution)))
      : fallbackContribution,
  }))
}

function parseExplainableFactors(text) {
  const factorLines = parseBulletSection(text, 'Key Risk Factors')

  return normalizeExplainableFactors(
    factorLines.map((line) => {
      const segments = line
        .split('|')
        .map((segment) => segment.trim())
        .filter(Boolean)
      const percentMatch = line.match(/(\d{1,3})(?:\s*%|\spercent)/i)
      const rawImpact = segments.find((segment) =>
        /^(high|medium|low)(\s+impact)?$/i.test(segment.replace(/impact:?/i, '').trim()),
      )

      let impact = 'medium'
      if (/high/i.test(rawImpact ?? line)) {
        impact = 'high'
      } else if (/low/i.test(rawImpact ?? line)) {
        impact = 'low'
      }

      const factor =
        segments.find((segment) => !/impact/i.test(segment) && !/%/.test(segment)) ??
        line.replace(/\bhigh\b|\bmedium\b|\blow\b/gi, '').replace(/\d{1,3}\s*%/g, '').trim()

      return {
        factor,
        impact,
        contribution: percentMatch ? Number(percentMatch[1]) : NaN,
      }
    }),
  )
}

function getStatusTone(value) {
  const normalized = value.toLowerCase()

  if (normalized.includes('high') || normalized.includes('imbalanced')) {
    return 'danger'
  }

  if (normalized.includes('moderate') || normalized.includes('mildly')) {
    return 'warning'
  }

  return 'success'
}

function getImpactTone(impact) {
  if (impact === 'high') {
    return 'high'
  }

  if (impact === 'low') {
    return 'low'
  }

  return 'medium'
}

function formatShortDate(dateString) {
  if (!dateString) {
    return 'Unknown'
  }

  const date = new Date(dateString)

  if (Number.isNaN(date.getTime())) {
    return 'Unknown'
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date)
}

export default function Analysis() {
  const [form, setForm] = useState(initialFormState)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [aiReport, setAiReport] = useState(null)
  const [profileId, setProfileId] = useState(null)
  const [recentReports, setRecentReports] = useState([])
  const [analysisId, setAnalysisId] = useState(null)
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false)
  const [feedbackError, setFeedbackError] = useState('')

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

      const [profileResult, reportsResult] = await Promise.all([
        supabase
          .from('profiles')
          .select(
            'age, height_cm, weight_kg, family_history_pcos, family_history_thyroid',
          )
          .eq('id', user.id)
          .maybeSingle(),
        supabase
          .from('health_reports')
          .select('id, risk_score, created_at')
          .eq('profile_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5),
      ])

      if (!active) {
        return
      }

      if (!profileResult.error && profileResult.data) {
        const profile = profileResult.data

        setForm((current) => ({
          ...current,
          age: profile.age?.toString() ?? '',
          heightCm: profile.height_cm?.toString() ?? '',
          weightKg: profile.weight_kg?.toString() ?? '',
          familyHistoryPcos: profile.family_history_pcos ?? 'not sure',
          familyHistoryThyroid: profile.family_history_thyroid ?? 'not sure',
        }))
      }

      if (!reportsResult.error) {
        setRecentReports((reportsResult.data ?? []).slice().reverse())
      }
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

      setForm((current) => ({
        ...current,
        concerns: current.concerns.trim()
          ? `${current.concerns.trim()} ${transcript}`
          : transcript,
      }))
    }

    window.addEventListener('voiceInput', handleVoiceInput)
    return () => window.removeEventListener('voiceInput', handleVoiceInput)
  }, [])

  const bmi = useMemo(() => {
    const height = Number(form.heightCm)
    const weight = Number(form.weightKg)

    if (!height || !weight) {
      return null
    }

    const meters = height / 100
    return weight / (meters * meters)
  }, [form.heightCm, form.weightKg])

  const confidenceScore = useMemo(() => {
    const filledOptionalFields = [
      form.hemoglobin,
      form.bloodSugar,
      form.tshLevel,
      form.concerns.trim(),
      form.familyHistoryPcos !== 'not sure' ? form.familyHistoryPcos : '',
      form.familyHistoryThyroid !== 'not sure' ? form.familyHistoryThyroid : '',
      form.stressLevel !== initialFormState.stressLevel ? form.stressLevel : '',
      form.sleepHours !== initialFormState.sleepHours ? form.sleepHours : '',
      form.dietQuality !== initialFormState.dietQuality ? form.dietQuality : '',
      form.exerciseFrequency !== initialFormState.exerciseFrequency
        ? form.exerciseFrequency
        : '',
    ].filter(Boolean).length

    return Math.min(95, 60 + filledOptionalFields * 5)
  }, [form])

  const missingFieldTip = useMemo(() => {
    return optionalFieldConfig.find((field) => !String(form[field.key] ?? '').trim()) ?? null
  }, [form])

  const trendSummary = useMemo(() => {
    if (recentReports.length <= 1) {
      return null
    }

    const latestReport = recentReports[recentReports.length - 1]
    const previousReport = recentReports[recentReports.length - 2]
    const change = Number(latestReport?.risk_score ?? 0) - Number(previousReport?.risk_score ?? 0)

    if (change === 0) {
      return {
        tone: 'neutral',
        message: 'Your risk score is unchanged since your last analysis.',
      }
    }

    if (change < 0) {
      return {
        tone: 'down',
        message: `Your risk score has decreased by ${Math.abs(change)} points since your last analysis.`,
      }
    }

    return {
      tone: 'up',
      message: `Your risk score has increased by ${change} points since your last analysis.`,
    }
  }, [recentReports])

  const trendChartData = useMemo(() => {
    const maxScore =
      recentReports.reduce((max, report) => Math.max(max, Number(report.risk_score) || 0), 0) || 1

    return recentReports.map((report) => {
      const score = Number(report.risk_score) || 0

      return {
        ...report,
        score,
        heightPercent: Math.max(14, Math.round((score / maxScore) * 100)),
        label: formatShortDate(report.created_at),
      }
    })
  }, [recentReports])

  const updateField = (key) => (event) => {
    setForm((current) => ({
      ...current,
      [key]: event.target.value,
    }))
  }

  const loadRecentReports = async (currentProfileId) => {
    const { data, error: reportsError } = await supabase
      .from('health_reports')
      .select('id, risk_score, created_at')
      .eq('profile_id', currentProfileId)
      .order('created_at', { ascending: false })
      .limit(5)

    if (!reportsError) {
      setRecentReports((data ?? []).slice().reverse())
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    setFeedbackSubmitted(false)
    setFeedbackError('')
    setAnalysisId(null)

    if (!profileId) {
      setError('Please wait for your account to finish loading and try again.')
      setLoading(false)
      return
    }

    if (!GROQ_KEY) {
      setError('Missing Groq API key. Add VITE_GROQ_KEY to your environment first.')
      setLoading(false)
      return
    }

    const ageNumber = Number(form.age) || null
    const lifeStageContext =
      ageNumber === null
        ? 'Use the available data only and avoid assuming menopause stage without age context.'
        : ageNumber >= 52
          ? 'Analyze the profile in the context of post menopause, and note if symptoms or risks may relate to life after menopause.'
          : ageNumber >= 40
            ? 'Analyze the profile in the context of perimenopause and menopause, considering that cycle changes and hormone shifts may influence symptoms.'
            : ageNumber >= 37
              ? 'Mention that early menopause or perimenopause is possible in this age range when relevant, without overstating it.'
              : 'Focus on menstrual and hormonal health in the reproductive years.'

    const prompt = `
You are a health analysis assistant for a menstrual wellness app.

Review this health profile and respond in plain text using exactly these sections:
Cycle Risk Status:
PCOS Risk:
Hormonal Balance:
Key Risk Factors:
- Factor Name | High impact | 25%
Recommendations:
- bullet
When To See A Doctor:

Rules:
- Cycle Risk Status must be one of: Normal, Moderate Risk, High Risk
- PCOS Risk must be a percentage number only
- Hormonal Balance must be one of: Balanced, Mildly Imbalanced, Imbalanced
- Give exactly 3 bullet points for Key Risk Factors
- Each Key Risk Factors bullet must follow this exact pattern: Factor Name | High, Medium, or Low impact | Contribution %
- Give exactly 5 bullet points for Recommendations
- Give one sentence for When To See A Doctor
- Consider age-related hormonal stage carefully: ${lifeStageContext}

Patient data:
- Age: ${form.age}
- Height (cm): ${form.heightCm}
- Weight (kg): ${form.weightKg}
- BMI: ${bmi ? bmi.toFixed(1) : 'Unavailable'}
- Hemoglobin (g/dL): ${form.hemoglobin}
- Blood Sugar (mg/dL): ${form.bloodSugar}
- TSH Level (mIU/L): ${form.tshLevel}
- Family history of PCOS: ${form.familyHistoryPcos}
- Family history of thyroid disorder: ${form.familyHistoryThyroid}
- Stress level: ${form.stressLevel}
- Sleep hours per night: ${form.sleepHours}
- Diet quality: ${form.dietQuality}
- Exercise frequency: ${form.exerciseFrequency}
- Current concerns: ${form.concerns || 'None provided'}
`.trim()

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${GROQ_KEY}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: 1000,
          temperature: 0.7,
        }),
      })

      if (!response.ok) {
        const errorBody = await response.json()
        throw new Error(errorBody.error?.message || 'Groq API error')
      }

      const result = await response.json()
      const text = result.choices[0].message.content
      const analysisText = text?.trim() ?? ''

      if (!analysisText) {
        throw new Error('No analysis text was returned by Veluna AI.')
      }

      const parsedReport = {
        rawText: analysisText,
        cycleRiskStatus: parseSingleValue(analysisText, 'Cycle Risk Status'),
        pcosRisk: parseRiskPercent(analysisText),
        hormonalBalance: parseSingleValue(analysisText, 'Hormonal Balance'),
        keyRiskFactors: parseBulletSection(analysisText, 'Key Risk Factors'),
        explainableFactors: parseExplainableFactors(analysisText),
        recommendations: parseBulletSection(analysisText, 'Recommendations'),
        whenToSeeDoctor: parseSingleValue(analysisText, 'When To See A Doctor'),
      }

      setAiReport(parsedReport)

      const { data: savedReport, error: saveError } = await supabase
        .from('health_reports')
        .insert({
          profile_id: profileId,
          ai_analysis: analysisText,
          risk_score: parsedReport.pcosRisk,
        })
        .select('id, risk_score, created_at')
        .single()

      if (saveError) {
        throw new Error(saveError.message || 'The analysis was generated, but it could not be saved.')
      }

      setAnalysisId(savedReport.id)
      await loadRecentReports(profileId)
    } catch (requestError) {
      setError(requestError.message || 'Something went wrong while analyzing your health data.')
    } finally {
      setLoading(false)
    }
  }

  const handleFeedback = async (wasHelpful) => {
    if (!profileId || !analysisId || feedbackLoading || feedbackSubmitted) {
      return
    }

    setFeedbackLoading(true)
    setFeedbackError('')

    const { error: saveFeedbackError } = await supabase.from('analysis_feedback').insert({
      profile_id: profileId,
      analysis_id: analysisId,
      was_helpful: wasHelpful,
    })

    if (saveFeedbackError) {
      setFeedbackError(saveFeedbackError.message || 'Feedback could not be saved right now.')
      setFeedbackLoading(false)
      return
    }

    setFeedbackSubmitted(true)
    setFeedbackLoading(false)
  }

  const explainableFactors =
    aiReport?.explainableFactors?.length > 0
      ? aiReport.explainableFactors
      : normalizeExplainableFactors(
          (aiReport?.keyRiskFactors ?? []).map((factor) => ({
            factor,
            impact: 'medium',
          })),
        )

  return (
    <div className="analysis-page page-stack">
      <header className="section-title">
        <p className="eyebrow">Veluna AI</p>
        <h1 className="page-title">
          <span className="page-title-icon" aria-hidden="true">
            <Activity size={22} strokeWidth={1.8} />
          </span>
          <span>Health Analysis</span>
        </h1>
      </header>

      {error ? (
        <div className="status-card status-card-error" role="alert">
          {error}
        </div>
      ) : null}

      <form className="page-stack" onSubmit={handleSubmit}>
        {trendSummary ? (
          <section className="card analysis-section-card analysis-trend-card">
            <p className="card-label">Analysis trend</p>
            <p className={`analysis-trend-message ${trendSummary.tone}`}>{trendSummary.message}</p>
            <div className="analysis-trend-chart" aria-label="Recent risk score trend">
              {trendChartData.map((report) => (
                <div className="analysis-trend-bar-group" key={report.id}>
                  <div
                    className="analysis-trend-bar"
                    style={{ height: `${report.heightPercent}%` }}
                    title={`Risk score ${report.score} on ${report.label}`}
                  >
                    <span>{report.score}</span>
                  </div>
                  <span className="analysis-trend-date">{report.label}</span>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="card analysis-section-card">
          <p className="card-label">Included automatically</p>
          <p className="helper-text">Your profile details are automatically included in the analysis.</p>
        </section>

        <section className="card analysis-section-card">
          <p className="card-label">Blood report</p>
          <div className="field-grid">
            <label className="field">
              <span>Hemoglobin g/dL</span>
              <input
                type="number"
                step="0.1"
                value={form.hemoglobin}
                onChange={updateField('hemoglobin')}
              />
            </label>
            <label className="field">
              <span>Blood Sugar mg/dL</span>
              <input
                type="number"
                step="0.1"
                value={form.bloodSugar}
                onChange={updateField('bloodSugar')}
              />
            </label>
            <label className="field">
              <span>TSH Level mIU/L</span>
              <input
                type="number"
                step="0.1"
                value={form.tshLevel}
                onChange={updateField('tshLevel')}
              />
            </label>
          </div>
        </section>

        <section className="card analysis-section-card">
          <p className="card-label">Lifestyle</p>
          <div className="field-grid">
            <label className="field">
              <span>Stress level</span>
              <select value={form.stressLevel} onChange={updateField('stressLevel')}>
                <option value="low">Low</option>
                <option value="moderate">Moderate</option>
                <option value="high">High</option>
                <option value="very high">Very high</option>
              </select>
            </label>
            <label className="field">
              <span>Sleep hours per night</span>
              <select value={form.sleepHours} onChange={updateField('sleepHours')}>
                <option value="less than 5">Less than 5</option>
                <option value="5-6">5-6</option>
                <option value="7-8">7-8</option>
                <option value="more than 8">More than 8</option>
              </select>
            </label>
            <label className="field">
              <span>Diet quality</span>
              <select value={form.dietQuality} onChange={updateField('dietQuality')}>
                <option value="healthy">Healthy</option>
                <option value="average">Average</option>
                <option value="unhealthy">Unhealthy</option>
              </select>
            </label>
            <label className="field">
              <span>Exercise frequency</span>
              <select
                value={form.exerciseFrequency}
                onChange={updateField('exerciseFrequency')}
              >
                <option value="daily">Daily</option>
                <option value="3-4 times a week">3-4 times a week</option>
                <option value="1-2 times a week">1-2 times a week</option>
                <option value="rarely">Rarely</option>
                <option value="never">Never</option>
              </select>
            </label>
          </div>
        </section>

        <section className="card analysis-section-card">
          <p className="card-label">Concerns</p>
          <label className="field full-width">
            <span>Describe any current concerns or symptoms in your own words</span>
            <textarea
              rows="5"
              value={form.concerns}
              onChange={updateField('concerns')}
              placeholder="Share anything about irregular cycles, fatigue, acne, pain, mood, or other symptoms."
            />
          </label>
        </section>

        {missingFieldTip ? (
          <section className="card analysis-tip-card" role="status">
            <p className="card-label">Accuracy tip</p>
            <p className="analysis-tip-text">
              Adding your {missingFieldTip.label} would improve accuracy by{' '}
              {missingFieldTip.improvement}%.
            </p>
          </section>
        ) : null}

        <button type="submit" className="pill-button submit-button" disabled={loading}>
          {loading ? 'Veluna AI is analyzing your health data...' : 'Analyze My Health'}
        </button>

        {loading ? (
          <div className="analysis-loading">
            <span className="analysis-spinner" aria-hidden="true"></span>
            <span>Veluna AI is analyzing your health data...</span>
          </div>
        ) : null}
      </form>

      {aiReport ? (
        <section className="page-stack">
          <section className="card analysis-report-card">
            <p className="card-label">Risk overview</p>
            <div className="status-grid">
              <article className="mini-status-card">
                <div className="mini-status-head">
                  <span className="mini-status-label">Cycle Risk</span>
                  <span className="confidence-badge">Confidence: {confidenceScore}%</span>
                </div>
                <strong className={`status-pill ${getStatusTone(aiReport.cycleRiskStatus)}`}>
                  {aiReport.cycleRiskStatus}
                </strong>
              </article>
              <article className="mini-status-card">
                <div className="mini-status-head">
                  <span className="mini-status-label">PCOS Risk</span>
                  <span className="confidence-badge">Confidence: {confidenceScore}%</span>
                </div>
                <strong className="status-pill neutral">{aiReport.pcosRisk}%</strong>
              </article>
              <article className="mini-status-card">
                <div className="mini-status-head">
                  <span className="mini-status-label">Hormonal Balance</span>
                  <span className="confidence-badge">Confidence: {confidenceScore}%</span>
                </div>
                <strong className={`status-pill ${getStatusTone(aiReport.hormonalBalance)}`}>
                  {aiReport.hormonalBalance}
                </strong>
              </article>
            </div>

            <div className="risk-gauge">
              <div className="risk-gauge-head">
                <span>Risk gauge</span>
                <strong>{aiReport.pcosRisk}%</strong>
              </div>
              <div className="risk-gauge-track">
                <div
                  className="risk-gauge-fill"
                  style={{ width: `${aiReport.pcosRisk}%` }}
                ></div>
              </div>
            </div>
          </section>

          <section className="card analysis-report-card">
            <p className="card-label">Key risk factors</p>
            <ul className="analysis-list">
              {(aiReport.keyRiskFactors.length > 0
                ? aiReport.keyRiskFactors
                : ['No clear risk factors were returned.']).map((item, index) => (
                <li key={`${item}-${index}`}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="card analysis-report-card explainable-ai-card">
            <p className="card-label">Explainable AI</p>
            <h3 className="explainable-ai-heading">Why We Flagged This</h3>
            <div className="explainable-factor-list">
              {(explainableFactors.length > 0
                ? explainableFactors
                : [
                    {
                      id: 'fallback-factor',
                      factor: 'No detailed factor breakdown was returned.',
                      impact: 'low',
                      contribution: 0,
                    },
                  ]
              ).map((factor) => (
                <article className="explainable-factor-row" key={factor.id}>
                  <span
                    className={`explainable-factor-dot ${getImpactTone(factor.impact)}`}
                    aria-hidden="true"
                  ></span>
                  <div className="explainable-factor-copy">
                    <p className="explainable-factor-title">{factor.factor}</p>
                    <p className="explainable-factor-summary">
                      {factor.factor} - contributed {factor.contribution}% to your risk score
                    </p>
                    <div
                      className="explainable-factor-bar"
                      role="img"
                      aria-label={`${factor.factor} contributed ${factor.contribution}%`}
                    >
                      <span style={{ width: `${factor.contribution}%` }}></span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="card analysis-report-card">
            <p className="card-label">Recommendations</p>
            <ul className="analysis-list">
              {(aiReport.recommendations.length > 0
                ? aiReport.recommendations
                : ['No recommendations were returned.']).map((item, index) => (
                <li key={`${item}-${index}`}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="card analysis-report-card">
            <p className="card-label">When To See A Doctor</p>
            <p className="analysis-doctor-note">{aiReport.whenToSeeDoctor}</p>
          </section>

          <section className="card analysis-report-card feedback-card">
            <p className="card-label">Feedback</p>
            <h3>Was this analysis helpful?</h3>
            {feedbackSubmitted ? (
              <p className="feedback-thanks">Thank you. Your feedback helps us improve future analyses.</p>
            ) : (
              <div className="feedback-actions">
                <button
                  type="button"
                  className="feedback-button"
                  onClick={() => handleFeedback(true)}
                  disabled={feedbackLoading || !analysisId}
                  aria-label="Mark analysis as helpful"
                >
                  👍
                </button>
                <button
                  type="button"
                  className="feedback-button"
                  onClick={() => handleFeedback(false)}
                  disabled={feedbackLoading || !analysisId}
                  aria-label="Mark analysis as not helpful"
                >
                  👎
                </button>
              </div>
            )}
            {feedbackError ? <p className="feedback-error">{feedbackError}</p> : null}
          </section>
        </section>
      ) : null}
    </div>
  )
}
