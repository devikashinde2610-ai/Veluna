import { useEffect, useState } from 'react'
import {
  Activity,
  BookOpen,
  Heart,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  Salad,
  Stethoscope,
  User,
} from 'lucide-react'
import {
  BrowserRouter,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'
import './App.css'
import supabase from './lib/supabase.js'
import VoiceInput from './components/VoiceInput.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Analysis from './pages/Analysis.jsx'
import Diet from './pages/Diet.jsx'
import Symptoms from './pages/Symptoms.jsx'
import Login from './pages/Login.jsx'
import Profile from './pages/Profile.jsx'
import Onboarding from './pages/Onboarding.jsx'
import Learn from './pages/Learn.jsx'
import Wellness from './pages/Wellness.jsx'
import Doctors from './pages/Doctors.jsx'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/learn', label: 'Learn', icon: BookOpen },
  { to: '/wellness', label: 'Wellness', icon: Heart },
  { to: '/doctors', label: 'Doctors', icon: Stethoscope },
  { to: '/analysis', label: 'Analysis', icon: Activity },
  { to: '/diet', label: 'Diet', icon: Salad },
  { to: '/symptoms', label: 'Symptoms', icon: HeartPulse },
  { to: '/profile', label: 'Profile', icon: User },
]

function getUserDisplayName(user) {
  return (
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'Veluna User'
  )
}

function getUserInitials(user) {
  const displayName = getUserDisplayName(user).trim()
  const parts = displayName.split(/\s+/).filter(Boolean)

  if (parts.length === 0) {
    return 'VU'
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }

  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase()
}

function truncateEmail(email, maxLength = 20) {
  if (email.length <= maxLength) {
    return email
  }

  return `${email.slice(0, Math.max(0, maxLength - 3))}...`
}

function RouteTransition({ children }) {
  const location = useLocation()
  const [displayLocation, setDisplayLocation] = useState(location)
  const [transitionStage, setTransitionStage] = useState('page-enter')

  useEffect(() => {
    if (location.pathname !== displayLocation.pathname) {
      setTransitionStage('page-exit')
      const timeoutId = window.setTimeout(() => {
        setDisplayLocation(location)
        setTransitionStage('page-enter')
      }, 300)

      return () => window.clearTimeout(timeoutId)
    }

    return undefined
  }, [location, displayLocation])

  return (
    <div className={`page-transition-frame ${transitionStage}`}>
      <Routes location={displayLocation}>{children}</Routes>
    </div>
  )
}

function Sidebar({ user, mobileOpen, onClose }) {
  const displayName = getUserInitials(user)
  const email = user?.email || ''
  const truncatedEmail = truncateEmail(email)

  return (
    <>
      <button
        type="button"
        className={`sidebar-backdrop${mobileOpen ? ' is-open' : ''}`}
        aria-label="Close menu"
        onClick={onClose}
      ></button>

      <aside className={`app-sidebar${mobileOpen ? ' is-open' : ''}`}>
        <div className="sidebar-brand">
          <p className="sidebar-logo">Veluna <span className="sidebar-logo-flower">🌸</span></p>
        </div>

        <div className="sidebar-user">
          <div className="sidebar-user-avatar" aria-hidden="true">
            {displayName}
          </div>
          <div className="sidebar-user-copy">
            <span title={email}>{truncatedEmail}</span>
          </div>
        </div>

        <div className="sidebar-profile-divider" aria-hidden="true"></div>

        <nav className="sidebar-nav" aria-label="Primary">
          {navItems.map((item) => {
            const Icon = item.icon

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => `sidebar-link${isActive ? ' is-active' : ''}`}
                onClick={onClose}
              >
                <span className="sidebar-link-icon" aria-hidden="true">
                  <Icon size={20} strokeWidth={1.8} />
                </span>
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-divider" aria-hidden="true"></div>
          <button
            type="button"
            className="sidebar-signout"
            onClick={() => supabase.auth.signOut()}
          >
            <LogOut size={18} strokeWidth={1.8} aria-hidden="true" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  )
}

function AppShell({ session }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  const user = session?.user ?? null

  return (
    <div className="app-layout-shell">
      <Sidebar user={user} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="app-layout-main">
        <header className="mobile-topbar">
          <button
            type="button"
            className="mobile-menu-button"
            aria-label="Open navigation"
            onClick={() => setMobileOpen(true)}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
          <p className="mobile-topbar-logo">Veluna <span className="sidebar-logo-flower">🌸</span></p>
        </header>

        <main className="app-layout-content">
          <RouteTransition>
            <Route path="/" element={<Dashboard userId={session.user.id} />} />
            <Route path="/learn" element={<Learn userId={session.user.id} />} />
            <Route path="/wellness" element={<Wellness />} />
          <Route path="/doctors" element={<Doctors />} />
            <Route path="/analysis" element={<Analysis />} />
            <Route path="/diet" element={<Diet />} />
            <Route path="/symptoms" element={<Symptoms />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/onboarding" element={<Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </RouteTransition>
          <VoiceInput />
        </main>
      </div>
    </div>
  )
}

function AppRoutes({ session, hasProfile, setHasProfile }) {
  if (!session) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    )
  }

  if (!hasProfile) {
    return (
      <Routes>
        <Route
          path="/onboarding"
          element={<Onboarding onComplete={() => setHasProfile(true)} />}
        />
        <Route path="*" element={<Navigate to="/onboarding" replace />} />
      </Routes>
    )
  }

  return <AppShell session={session} />
}

function App() {
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)
  const [hasProfile, setHasProfile] = useState(null)

  useEffect(() => {
    let mounted = true
    const timeout = setTimeout(() => {
      if (mounted) {
        setProfileLoading(false)
        setAuthLoading(false)
      }
    }, 3000)

    const clearLoadingTimeout = () => clearTimeout(timeout)

    async function resolveSessionAndProfile(nextSession = null) {
      console.log('Checking session...')

      try {
        const activeSession =
          nextSession ?? (await supabase.auth.getSession()).data.session ?? null

        if (!mounted) {
          return
        }

        console.log('Session found:', activeSession?.user?.email)

        if (!activeSession) {
          console.log('Redirecting to:', '/login')
          setSession(null)
          setHasProfile(null)
          setProfileLoading(false)
          setAuthLoading(false)
          clearLoadingTimeout()
          return
        }

        setSession(activeSession)
        setProfileLoading(true)

        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name')
          .eq('id', activeSession.user.id)
          .maybeSingle()

        if (!mounted) {
          return
        }

        console.log('Profile check result:', data)

        const hasCompletedProfile =
          !error && Boolean(data?.id) && typeof data?.full_name === 'string' && data.full_name.trim() !== ''

        console.log('Redirecting to:', hasCompletedProfile ? '/' : '/onboarding')

        setHasProfile(hasCompletedProfile)
        setProfileLoading(false)
        setAuthLoading(false)
        clearLoadingTimeout()
      } catch (error) {
        if (!mounted) {
          return
        }

        console.error('Auth bootstrap failed:', error)
        console.log('Redirecting to:', '/login')
        setSession(null)
        setHasProfile(null)
        setProfileLoading(false)
        setAuthLoading(false)
        clearLoadingTimeout()
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) {
        return
      }

      if (event === 'SIGNED_IN') {
        console.log('SIGNED_IN event received after auth redirect')
      }

      void resolveSessionAndProfile(nextSession ?? null)
    })

    void resolveSessionAndProfile()

    return () => {
      mounted = false
      clearLoadingTimeout()
      subscription.unsubscribe()
    }
  }, [])

  if (authLoading || (session && profileLoading)) {
    return (
      <div className="auth-loading-screen">
        <div className="analysis-loading auth-loading-card">
          <span className="analysis-spinner" aria-hidden="true"></span>
          <span>
            {authLoading ? 'Checking your Veluna session...' : 'Preparing your Veluna space...'}
          </span>
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <AppRoutes session={session} hasProfile={hasProfile} setHasProfile={setHasProfile} />
    </BrowserRouter>
  )
}

export default App
