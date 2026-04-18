import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import './Auth.css'

const API_FLAVOR = import.meta.env.VITE_API_FLAVOR || 'spark'

const redirectFor = (role) => ({
  admin:    '/admin/overview',
  lecturer: '/lecturer/overview',
  student:  '/student/overview'
}[role] || '/login')

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [identifier, setIdentifier] = useState('')   // username (spark) or user_id (mysql)
  const [password, setPassword]     = useState('')
  const [error, setError]           = useState('')
  const [busy, setBusy]             = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const payload = API_FLAVOR === 'mysql'
        ? { user_id: identifier, password }
        : { username: identifier, password }
      const data = await login(payload)
      navigate(redirectFor(data.role))
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-screen">
      {/* ---------- LEFT — editorial hero ---------- */}
      <section className="auth-hero">
        <div className="auth-hero-head">
          <div className="row gap-12" style={{ alignItems: 'center' }}>
            <span style={{ color: 'var(--spark)', fontSize: 22 }}>◆</span>
            <span className="upper" style={{ color: 'var(--paper-2)' }}>Spark</span>
          </div>
          <div className="mono-label" style={{ color: 'var(--muted-soft)' }}>ISSUE 01 · 2026</div>
        </div>

        <div className="auth-hero-mid">
          <div className="auth-kicker mono-label reveal">
            COURSE MANAGEMENT / LEARNING PLATFORM
          </div>

          <h1 className="auth-title">
            <span className="reveal d-1">A platform</span><br/>
            <span className="reveal d-2">for <em className="auth-title-em">serious</em></span><br/>
            <span className="reveal d-3">study.</span>
          </h1>

          <div className="auth-hero-divider" />

          <p className="auth-hero-lede reveal d-4">
            Register for courses, follow discussion forums, submit work, and
            track your grades &mdash; all in one place, on the record.
          </p>
        </div>

        <div className="auth-hero-foot">
          <div className="auth-ticker">
            <span>STUDENTS · 100,000+</span>
            <span className="auth-ticker-dot">◆</span>
            <span>COURSES · 200+</span>
            <span className="auth-ticker-dot">◆</span>
            <span>LECTURERS · 50</span>
            <span className="auth-ticker-dot">◆</span>
            <span>POSTGRES · FLASK · NO ORM</span>
          </div>
        </div>
      </section>

      {/* ---------- RIGHT — form ---------- */}
      <section className="auth-form-wrap">
        <div className="auth-form reveal d-2">
          <div className="auth-form-eyebrow">
            <span className="mono-label">§ 01 · SIGN IN</span>
            <span className="mono-label" style={{ color: 'var(--muted-soft)' }}>
              {API_FLAVOR === 'mysql' ? 'MySQL' : 'Postgres'} backend
            </span>
          </div>

          <h2 className="auth-form-title">
            Welcome <em className="display-ital" style={{ color: 'var(--spark)' }}>back.</em>
          </h2>

          <form onSubmit={onSubmit} className="stack gap-16">
            <div>
              <label className="field-label">
                {API_FLAVOR === 'mysql' ? 'User ID' : 'Username'}
              </label>
              <input
                className="input"
                autoFocus
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={API_FLAVOR === 'mysql' ? 'e.g. 2026001' : 'e.g. j_green'}
                required
              />
            </div>

            <div>
              <label className="field-label">Password</label>
              <input
                className="input"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            {error && <div className="err">{error}</div>}

            <button type="submit" className="btn btn-spark" disabled={busy}>
              {busy ? 'Authenticating…' : 'Sign in →'}
            </button>
          </form>

          <div className="auth-switch">
            <span className="mono-label">New to Spark?</span>
            <Link to="/register" className="auth-switch-link">Create an account</Link>
          </div>
        </div>

        <div className="auth-form-foot">
          <span className="mono-label">COMP3161 — DATABASE MANAGEMENT</span>
          <span className="mono-label">UWI MONA · 2025/26</span>
        </div>
      </section>
    </div>
  )
}
