import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './AppShell.css'

export default function AppShell({ role, nav }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="shell">
      {/* ---------- Vertical brand rail ---------- */}
      <aside className="shell-rail">
        <div className="rail-brand">
          <span className="rail-mark">◆</span>
          <span className="rail-wordmark">SPARK</span>
        </div>

        <div className="rail-vertical">
          COURSE&nbsp;&nbsp;MANAGEMENT&nbsp;&nbsp;·&nbsp;&nbsp;COMP3161
        </div>

        <div className="rail-foot mono-label">v0.1</div>
      </aside>

      {/* ---------- Main sidebar ---------- */}
      <aside className="shell-side">
        <div className="side-head">
          <div className="mono-label">Signed in as</div>
          <div className="side-user">
            <div className="side-user-name">{user?.user_id}</div>
            <span className="chip chip-spark">{role}</span>
          </div>
        </div>

        <div className="rule" />

        <nav className="side-nav">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `side-link ${isActive ? 'is-active' : ''}`}
            >
              <span className="side-link-num mono-label">{item.n}</span>
              <span className="side-link-label">{item.label}</span>
              <span className="side-link-arrow">→</span>
            </NavLink>
          ))}
        </nav>

        <div className="side-foot">
          <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </aside>

      {/* ---------- Main content ---------- */}
      <main className="shell-main">
        <Outlet />
      </main>
    </div>
  )
}
