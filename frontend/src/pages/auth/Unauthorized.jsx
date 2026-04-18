import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import './Auth.css'

export default function Unauthorized() {
  const { user, logout } = useAuth()
  return (
    <div className="unauth-screen">
      <div className="unauth-card">
        <div className="unauth-mark">◆</div>
        <div className="mono-label" style={{ marginBottom: 12 }}>ERROR · 403</div>
        <h1 style={{ fontSize: '2.4rem', marginBottom: 14 }}>
          You <em className="display-ital" style={{ color: 'var(--spark)' }}>don't</em> have access.
        </h1>
        <p style={{ color: 'var(--muted)', marginBottom: 28 }}>
          Your account doesn't have permission for this area of Spark.
          {user?.role && <> You're signed in as <strong>{user.role}</strong>.</>}
        </p>
        <div className="row gap-12 center">
          <Link to={`/${user?.role || ''}`} className="btn btn-primary">Go to your dashboard</Link>
          <button className="btn btn-ghost" onClick={() => { logout(); window.location.href = '/login' }}>Log out</button>
        </div>
      </div>
    </div>
  )
}
