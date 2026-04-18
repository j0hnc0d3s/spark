import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../../api/client'
import './Auth.css'

const API_FLAVOR = import.meta.env.VITE_API_FLAVOR || 'spark'

export default function Register() {
  const navigate = useNavigate()
  const [busy, setBusy]   = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk]       = useState('')

  // Spark-flavor fields (has more)
  const [form, setForm] = useState({
    user_id:    '',
    username:   '',
    email:      '',
    password:   '',
    first_name: '',
    last_name:  '',
    role:       'student',
    gender:     'female'    // only sent to MySQL backend
  })

  const onChange = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const onSubmit = async (e) => {
    e.preventDefault()
    setError(''); setOk(''); setBusy(true)

    // The two backends want different payloads — shape by flavor.
    const payload = API_FLAVOR === 'mysql'
      ? {
          password:   form.password,
          role:       form.role,
          first_name: form.first_name,
          last_name:  form.last_name,
          gender:     form.gender
        }
      : {
          user_id:    form.user_id,
          username:   form.username,
          email:      form.email,
          password:   form.password,
          first_name: form.first_name,
          last_name:  form.last_name,
          role:       form.role
        }

    try {
      const result = await api.register(payload)
      setOk(`Account created${result.user_id ? ` (ID ${result.user_id})` : ''}. You can sign in now.`)
      setTimeout(() => navigate('/login'), 1200)
    } catch (err) {
      setError(err.message || 'Registration failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-screen">
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
            NEW ENROLLMENT / ADMISSIONS
          </div>

          <h1 className="auth-title">
            <span className="reveal d-1">Begin</span><br/>
            <span className="reveal d-2">your <em className="auth-title-em">record.</em></span>
          </h1>

          <div className="auth-hero-divider" />

          <p className="auth-hero-lede reveal d-4">
            Students and lecturers open accounts here. Admin accounts are
            created by system operators and cannot be self-registered.
          </p>
        </div>

        <div className="auth-hero-foot">
          <div className="auth-ticker">
            <span>THREE ROLES</span>
            <span className="auth-ticker-dot">◆</span>
            <span>ADMIN · LECTURER · STUDENT</span>
            <span className="auth-ticker-dot">◆</span>
            <span>JWT SESSION</span>
          </div>
        </div>
      </section>

      <section className="auth-form-wrap">
        <div className="auth-form reveal d-2">
          <div className="auth-form-eyebrow">
            <span className="mono-label">§ 02 · NEW ACCOUNT</span>
          </div>

          <h2 className="auth-form-title">
            Create your <em className="display-ital" style={{ color: 'var(--spark)' }}>account.</em>
          </h2>

          <form onSubmit={onSubmit} className="stack gap-16">
            {API_FLAVOR !== 'mysql' && (
              <>
                <div className="row gap-12">
                  <div className="grow">
                    <label className="field-label">User ID</label>
                    <input className="input" value={form.user_id} onChange={onChange('user_id')} required placeholder="e.g. 620149044" />
                  </div>
                  <div className="grow">
                    <label className="field-label">Username</label>
                    <input className="input" value={form.username} onChange={onChange('username')} required placeholder="e.g. j_green" />
                  </div>
                </div>
                <div>
                  <label className="field-label">Email</label>
                  <input className="input" type="email" value={form.email} onChange={onChange('email')} required placeholder="you@spark.edu" />
                </div>
              </>
            )}

            <div className="row gap-12">
              <div className="grow">
                <label className="field-label">First name</label>
                <input className="input" value={form.first_name} onChange={onChange('first_name')} required />
              </div>
              <div className="grow">
                <label className="field-label">Last name</label>
                <input className="input" value={form.last_name} onChange={onChange('last_name')} required />
              </div>
            </div>

            <div className="row gap-12">
              <div className="grow">
                <label className="field-label">Role</label>
                <select className="input" value={form.role} onChange={onChange('role')}>
                  <option value="student">Student</option>
                  <option value="lecturer">Lecturer</option>
                </select>
              </div>
              {API_FLAVOR === 'mysql' && (
                <div className="grow">
                  <label className="field-label">Gender</label>
                  <select className="input" value={form.gender} onChange={onChange('gender')}>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                  </select>
                </div>
              )}
            </div>

            <div>
              <label className="field-label">Password</label>
              <input className="input" type="password" value={form.password} onChange={onChange('password')} required placeholder="At least 6 characters" />
            </div>

            {error && <div className="err">{error}</div>}
            {ok    && <div className="info">{ok}</div>}

            <button type="submit" className="btn btn-spark" disabled={busy}>
              {busy ? 'Creating…' : 'Create account →'}
            </button>
          </form>

          <div className="auth-switch">
            <span className="mono-label">Already enrolled?</span>
            <Link to="/login" className="auth-switch-link">Sign in</Link>
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
