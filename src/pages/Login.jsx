import { useState } from 'react'
import supabase from '../lib/supabase.js'

export default function Login() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const isSignup = mode === 'signup'

  const handleGoogleSignIn = async () => {
    setError('')
    setSuccess('')
    setGoogleLoading(true)

    try {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            prompt: 'select_account',
            access_type: 'offline',
          },
        },
      })
    } catch (authError) {
      setError(authError.message || 'Could not start Google sign in.')
      setGoogleLoading(false)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      if (isSignup) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        })

        if (signUpError) {
          throw new Error(signUpError.message || 'Could not create your account.')
        }

        const user = data.user

        if (user) {
          const { error: profileError } = await supabase.from('profiles').upsert({
            id: user.id,
            email: user.email,
          })

          if (profileError) {
            throw new Error(profileError.message || 'Account created, but profile setup failed.')
          }
        }

        setSuccess('Account created successfully! Please check your email if confirmation is enabled.')
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (signInError) {
          throw new Error(signInError.message || 'Could not sign you in.')
        }

        setSuccess('Signed in successfully!')
      }
    } catch (authError) {
      setError(authError.message || 'Something went wrong during authentication.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-logo-mark" aria-hidden="true">
            <svg viewBox="0 0 64 64" role="presentation">
              <path d="M32 8c-7.2 7.5-13.2 17.1-13.2 27.5 0 8 5.9 14.5 13.2 14.5s13.2-6.5 13.2-14.5C45.2 25.1 39.2 15.5 32 8Z" />
              <path d="M32 18c-4.6 5.1-8.2 11.3-8.2 17.6 0 4.8 3.6 8.8 8.2 8.8s8.2-4 8.2-8.8C40.2 29.3 36.6 23.1 32 18Z" />
            </svg>
          </div>
          <p className="eyebrow">Welcome to</p>
          <h1>Veluna</h1>
          <p className="auth-tagline">A softer space for cycle care, insight, and support.</p>
        </div>

        <div className="auth-toggle">
          <button
            type="button"
            className={`auth-toggle-button${!isSignup ? ' is-active' : ''}`}
            onClick={() => setMode('login')}
          >
            Login
          </button>
          <button
            type="button"
            className={`auth-toggle-button${isSignup ? ' is-active' : ''}`}
            onClick={() => setMode('signup')}
          >
            Sign Up
          </button>
        </div>

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

        <button
          type="button"
          className="google-auth-button"
          onClick={handleGoogleSignIn}
          disabled={googleLoading || loading}
        >
          <span className="google-auth-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" role="presentation">
              <path
                fill="#EA4335"
                d="M12 10.2v3.9h5.4c-.2 1.3-.8 2.3-1.8 3l3 2.3c1.8-1.6 2.8-4 2.8-6.9 0-.7-.1-1.4-.2-2H12Z"
              />
              <path
                fill="#34A853"
                d="M12 21c2.6 0 4.8-.9 6.4-2.4l-3-2.3c-.8.6-1.9 1-3.4 1-2.6 0-4.8-1.8-5.5-4.2l-3.1 2.4C5 18.7 8.2 21 12 21Z"
              />
              <path
                fill="#FBBC05"
                d="M6.5 13.1c-.2-.6-.3-1.2-.3-1.9s.1-1.3.3-1.9l-3.1-2.4C2.8 8 2.5 9.1 2.5 11.2s.3 3.2.9 4.3l3.1-2.4Z"
              />
              <path
                fill="#4285F4"
                d="M12 5.1c1.4 0 2.6.5 3.6 1.4l2.7-2.7C16.8 2.4 14.6 1.5 12 1.5 8.2 1.5 5 3.8 3.4 7l3.1 2.4C7.2 6.9 9.4 5.1 12 5.1Z"
              />
            </svg>
          </span>
          <span>{googleLoading ? 'Redirecting...' : 'Continue with Google'}</span>
        </button>

        <div className="auth-divider" aria-hidden="true">
          <span></span>
          <p>or continue with email</p>
          <span></span>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          <button type="submit" className="pill-button submit-button" disabled={loading}>
            {loading ? 'Please wait...' : !isSignup ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  )
}
