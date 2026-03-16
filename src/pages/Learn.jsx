import { useEffect, useMemo, useState } from 'react'
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react'
import supabase from '../lib/supabase.js'

const TEEN_FACTS = [
  {
    emoji: 'Pad',
    title: 'What a period is',
    description:
      'A period is bleeding from the vagina that happens as part of your monthly body cycle.',
    tone: 'pink',
  },
  {
    emoji: 'Moon',
    title: 'Why it happens',
    description:
      'Your body is practicing for the future, getting ready in case you grow up and choose to have a baby one day.',
    tone: 'lavender',
  },
  {
    emoji: 'Berry',
    title: 'How long it lasts',
    description:
      'Many periods last around 3 to 7 days, but every body can be a little different.',
    tone: 'peach',
  },
  {
    emoji: 'Leaf',
    title: 'What to expect',
    description:
      'You may notice cramps, tiredness, mood changes, or cravings. Some months feel easier than others.',
    tone: 'mint',
  },
]

const TEEN_HOW_TO_STEPS = [
  'Wash your hands, unwrap a fresh pad, and peel off the paper strip on the back.',
  'Place the sticky side onto the middle of your underwear and press it down so it stays in place.',
  'Change your pad every few hours, or sooner if it feels full or uncomfortable.',
  'Roll the used pad in toilet paper or its wrapper, put it in the trash, and wash your hands again.',
]

const TEEN_DOS = [
  'Carry an extra pad in your bag just in case your period starts early.',
  'Change pads regularly to stay dry, fresh, and comfortable.',
  'Take a bath or shower and wear clean underwear every day.',
]

const TEEN_DONTS = [
  'Do not flush pads down the toilet because they can block pipes.',
  'Do not keep the same pad on for too long if it feels damp or heavy.',
  'Do not feel embarrassed about asking a trusted adult for help or supplies.',
]

const ADULT_SECTIONS = [
  {
    title: 'Cycle phases explained',
    body: 'Your cycle moves through menstrual, follicular, ovulation, and luteal phases. Each phase can shift your energy, mood, appetite, and symptoms.',
  },
  {
    title: 'Hormonal health tips',
    body: 'Good sleep, stress support, steady movement, and regular meals all help support smoother hormone balance and more predictable cycles.',
  },
  {
    title: 'Nutrition for cycle health',
    body: 'Iron-rich foods, protein, healthy fats, fiber, hydration, and magnesium-rich choices can all support energy and menstrual wellbeing.',
  },
]

const MENOPAUSE_SECTIONS = [
  {
    title: 'What is perimenopause and menopause',
    body: 'Perimenopause is the transition before menopause, when hormones begin to fluctuate and cycles can become less predictable. Menopause is reached after 12 months without a period.',
  },
  {
    title: 'Common symptoms explained simply',
    body: 'Hot flashes, sleep changes, mood shifts, vaginal dryness, brain fog, and irregular bleeding are all common. Symptoms vary widely from person to person.',
  },
  {
    title: 'Lifestyle tips for managing symptoms',
    body: 'Strength training, protein, fiber, hydration, sleep routines, cooling strategies, and stress support can make daily symptoms feel more manageable.',
  },
  {
    title: 'When to see a doctor',
    body: 'It is worth checking in if bleeding becomes very heavy, symptoms feel disruptive, you have chest symptoms, or you want support for sleep, mood, bones, or hormone therapy questions.',
  },
]

const POST_MENOPAUSE_SECTIONS = [
  {
    title: 'What changes after menopause',
    body: 'After menopause, hormone levels stay lower long term. You may notice changes in bone health, cholesterol, body composition, skin, bladder comfort, and vaginal tissues.',
  },
  {
    title: 'Long-term health tips',
    body: 'Prioritize resistance training, protein, calcium, vitamin D, heart health habits, pelvic care, and regular medical follow-up to support healthy aging.',
  },
]

function getEducationConfig(age) {
  if (age >= 10 && age <= 16) {
    return {
      mode: 'teen',
      title: 'Understanding Your Period',
      eyebrow: 'Teen education',
      query: 'how to use a pad period education for girls',
      videoTitle: 'Helpful guides to watch',
      themeClass: 'learn-theme-teen',
    }
  }

  if (age >= 45) {
    return {
      mode: 'menopause',
      title: 'Menopause Education',
      eyebrow: 'Midlife health',
      query: 'menopause symptoms management tips for women',
      videoTitle: 'Helpful menopause videos',
      themeClass: 'learn-theme-menopause',
    }
  }

  return {
    mode: 'adult',
    title: 'Menstrual Health Education',
    eyebrow: 'Cycle education',
    query: 'menstrual wellness cycle phases hormonal health',
    videoTitle: 'Helpful menstrual wellness videos',
    themeClass: 'learn-theme-adult',
  }
}

function VideoSection({ title, videos, videosLoading }) {
  return (
    <section className="card teen-videos-card">
      <div className="teen-videos-heading">
        <p className="card-label">YouTube videos</p>
        <h3>{title}</h3>
      </div>

      {videosLoading ? <p className="muted">Loading videos...</p> : null}

      {!videosLoading ? (
        <div className="teen-videos-grid">
          {videos.map((video) => (
            <article key={video.id} className="teen-video-tile">
              <img src={video.thumbnail} alt={video.title} className="teen-video-thumb" />
              <div className="teen-video-copy">
                <p className="teen-video-title">{video.title}</p>
                <a
                  className="pill-button teen-video-button"
                  href={`https://www.youtube.com/watch?v=${video.id}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Watch Now
                </a>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  )
}

export default function Learn() {
  const [age, setAge] = useState(null)
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [videosLoading, setVideosLoading] = useState(false)
  const [error, setError] = useState('')
  const [showEarlyMenopauseInfo, setShowEarlyMenopauseInfo] = useState(false)

  const config = useMemo(() => getEducationConfig(age ?? 18), [age])
  const shouldShowEarlyMenopauseCard = age !== null && age >= 37 && age <= 44
  const shouldShowPostMenopauseSection = age !== null && age >= 52

  useEffect(() => {
    let active = true

    async function loadLearnPage() {
      setLoading(true)
      setError('')

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (!active || userError || !user) {
        setError(userError?.message || 'Could not load education content.')
        setLoading(false)
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('age')
        .eq('id', user.id)
        .maybeSingle()

      if (!active) {
        return
      }

      if (profileError) {
        setError(profileError.message || 'Could not load your profile age.')
        setLoading(false)
        return
      }

      const nextAge = typeof profile?.age === 'number' ? profile.age : Number(profile?.age) || 18
      setAge(nextAge)
      setLoading(false)
    }

    loadLearnPage()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true

    async function loadVideos() {
      if (!config.query || !import.meta.env.VITE_YOUTUBE_KEY) {
        setVideos([])
        return
      }

      setVideosLoading(true)

      try {
        const response = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(config.query)}&type=video&safeSearch=strict&maxResults=6&key=${import.meta.env.VITE_YOUTUBE_KEY}`,
        )

        if (!response.ok) {
          throw new Error('Could not load videos right now.')
        }

        const result = await response.json()
        const nextVideos = Array.isArray(result.items)
          ? result.items
              .map((item) => ({
                id: item.id?.videoId ?? '',
                title: item.snippet?.title ?? 'Video',
                thumbnail:
                  item.snippet?.thumbnails?.high?.url ||
                  item.snippet?.thumbnails?.medium?.url ||
                  item.snippet?.thumbnails?.default?.url ||
                  '',
              }))
              .filter((item) => item.id && item.thumbnail)
          : []

        if (active) {
          setVideos(nextVideos)
        }
      } catch (requestError) {
        if (active) {
          setError((current) => current || requestError.message || 'Could not load videos.')
          setVideos([])
        }
      } finally {
        if (active) {
          setVideosLoading(false)
        }
      }
    }

    loadVideos()

    return () => {
      active = false
    }
  }, [config.query])

  if (loading) {
    return (
      <div className="learn-page page-stack">
        <div className="analysis-loading">
          <span className="analysis-spinner" aria-hidden="true"></span>
          <span>Loading your learning space...</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`learn-page page-stack ${config.themeClass}`}>
      <header className="section-title">
        <p className="eyebrow">{config.eyebrow}</p>
        <h1 className="page-title">
          <span className="page-title-icon" aria-hidden="true">
            <BookOpen size={22} strokeWidth={1.8} />
          </span>
          <span>{config.title}</span>
        </h1>
      </header>

      {error ? (
        <div className="status-card status-card-error" role="alert">
          {error}
        </div>
      ) : null}

      {config.mode === 'teen' ? (
        <section className="teen-education-section page-stack">
          <div className="teen-banner">Hey girl! This section is just for you.</div>

          <div className="teen-education-header">
            <p className="eyebrow">Teen education</p>
            <h2>Understanding Your Period</h2>
            <span className="teen-education-line" aria-hidden="true"></span>
          </div>

          <section className="card teen-intro-card">
            <p className="card-label">A gentle guide</p>
            <h3>You are not doing anything wrong</h3>
            <p>
              A period is a normal part of growing up. It can feel new or confusing at first, but
              your body is simply changing in a healthy way. With the right care, products, and
              support, periods become much easier to manage.
            </p>
          </section>

          <section className="teen-facts-grid">
            {TEEN_FACTS.map((fact) => (
              <article key={fact.title} className={`card teen-fact-card teen-fact-${fact.tone}`}>
                <div className="teen-fact-emoji" aria-hidden="true">
                  {fact.emoji}
                </div>
                <p className="card-label">{fact.title}</p>
                <p>{fact.description}</p>
              </article>
            ))}
          </section>

          <section className="card teen-howto-card">
            <p className="card-label">How to use a pad</p>
            <h3>Simple steps</h3>
            <div className="teen-steps-list">
              {TEEN_HOW_TO_STEPS.map((step, index) => (
                <div key={step} className="teen-step-item">
                  <span className="teen-step-number">{index + 1}</span>
                  <p>{step}</p>
                </div>
              ))}
            </div>
          </section>

          <VideoSection title={config.videoTitle} videos={videos} videosLoading={videosLoading} />

          <section className="teen-dos-donts-grid">
            <article className="card teen-dos-card">
              <p className="card-label">Do&apos;s</p>
              <h3>Good Habits</h3>
              <div className="teen-tip-list">
                {TEEN_DOS.map((tip) => (
                  <div key={tip} className="teen-tip-item">
                    <span className="teen-tip-mark" aria-hidden="true">
                      {'\u2713'}
                    </span>
                    <p>{tip}</p>
                  </div>
                ))}
              </div>
            </article>

            <article className="card teen-donts-card">
              <p className="card-label">Don&apos;ts</p>
              <h3>Things to Avoid</h3>
              <div className="teen-tip-list">
                {TEEN_DONTS.map((tip) => (
                  <div key={tip} className="teen-tip-item">
                    <span className="teen-tip-mark" aria-hidden="true">
                      X
                    </span>
                    <p>{tip}</p>
                  </div>
                ))}
              </div>
            </article>
          </section>
        </section>
      ) : null}

      {config.mode === 'adult' ? (
        <>
          <section className="card learn-hero-card adult-hero-card">
            <p className="card-label">Cycle wellness</p>
            <h2>Understand your hormones, energy, and monthly rhythm</h2>
            <p className="learn-hero-copy">
              Learning what happens in each phase of your cycle can help you plan rest, exercise,
              nutrition, and symptom support more intentionally.
            </p>
          </section>

          <section className="learn-topic-grid">
            {ADULT_SECTIONS.map((section) => (
              <article key={section.title} className="card learn-topic-card adult-topic-card">
                <p className="card-label">{section.title}</p>
                <p>{section.body}</p>
              </article>
            ))}
          </section>

          {shouldShowEarlyMenopauseCard ? (
            <section className="card early-menopause-card">
              <button
                type="button"
                className="learn-collapsible-toggle"
                onClick={() => setShowEarlyMenopauseInfo((current) => !current)}
                aria-expanded={showEarlyMenopauseInfo}
              >
                <div>
                  <p className="card-label">Early menopause awareness</p>
                  <h3>Could this be early menopause?</h3>
                </div>
                <span aria-hidden="true">
                  {showEarlyMenopauseInfo ? (
                    <ChevronUp size={18} strokeWidth={1.9} />
                  ) : (
                    <ChevronDown size={18} strokeWidth={1.9} />
                  )}
                </span>
              </button>

              {showEarlyMenopauseInfo ? (
                <div className="learn-collapsible-body">
                  <p>
                    Premature ovarian insufficiency and early menopause can sometimes begin before
                    age 45. It does not always mean periods stop right away, but cycles may become
                    more irregular and symptoms may start to feel different.
                  </p>
                  <div className="learn-inline-grid">
                    <article className="early-menopause-note">
                      <p className="card-label">Signs to watch for</p>
                      <p>
                        Notice if cycles suddenly change, hot flashes begin, sleep is disrupted, or
                        mood changes feel new and persistent.
                      </p>
                    </article>
                    <article className="early-menopause-note">
                      <p className="card-label">When to see a doctor</p>
                      <p>
                        Check in if you skip periods often, bleeding patterns shift a lot, or
                        symptoms are affecting daily life and you want hormone guidance.
                      </p>
                    </article>
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}

          <VideoSection title={config.videoTitle} videos={videos} videosLoading={videosLoading} />
        </>
      ) : null}

      {config.mode === 'menopause' ? (
        <>
          <section className="card learn-hero-card menopause-hero-card">
            <p className="card-label">Menopause education</p>
            <h2>Support through perimenopause and menopause</h2>
            <p className="learn-hero-copy">
              Hormonal changes in midlife can feel unfamiliar. Clear education can help you
              recognize patterns, care for your body, and know when to seek support.
            </p>
          </section>

          <section className="page-stack menopause-education-shell">
            <div className="learn-section-header">
              <p className="eyebrow">Menopause</p>
              <h2>Perimenopause and menopause, explained simply</h2>
            </div>

            <section className="learn-topic-grid menopause-topic-grid">
              {MENOPAUSE_SECTIONS.map((section) => (
                <article key={section.title} className="card learn-topic-card menopause-topic-card">
                  <p className="card-label">{section.title}</p>
                  <p>{section.body}</p>
                </article>
              ))}
            </section>
          </section>

          <VideoSection title={config.videoTitle} videos={videos} videosLoading={videosLoading} />

          {shouldShowPostMenopauseSection ? (
            <section className="page-stack post-menopause-shell">
              <div className="learn-section-header">
                <p className="eyebrow">Post menopause</p>
                <h2>Looking after your long-term health after menopause</h2>
              </div>
              <section className="learn-topic-grid post-menopause-grid">
                {POST_MENOPAUSE_SECTIONS.map((section) => (
                  <article key={section.title} className="card learn-topic-card post-menopause-card">
                    <p className="card-label">{section.title}</p>
                    <p>{section.body}</p>
                  </article>
                ))}
              </section>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
