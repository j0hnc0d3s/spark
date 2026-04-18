import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { api } from '../../api/client'

const today = () => new Date().toISOString().slice(0, 10)

export default function StudentCalendar() {
  const { user } = useAuth()
  const [date, setDate]     = useState(today())
  const [events, setEvents] = useState([])
  const [error, setError]   = useState('')
  const [busy, setBusy]     = useState(false)

  useEffect(() => {
    if (!user) return
    setBusy(true); setError('')
    api.studentEvents(user.user_id, date)
      .then(setEvents)
      .catch((e) => setError(e.message))
      .finally(() => setBusy(false))
  }, [user, date])

  // Generate a little 7-day strip around the selected date
  const strip = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(date)
    d.setDate(d.getDate() - 3 + i)
    return d.toISOString().slice(0, 10)
  })

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-head-eyebrow">
            <span className="mono-label">§ STUDENT · CALENDAR</span>
            <span className="spark-dot" />
          </div>
          <h1>Your <em className="page-head-italic">schedule.</em></h1>
        </div>
        <div className="page-head-side">
          <input className="input" type="date" value={date}
                 onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>

      {/* 7-day strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        border: '2px solid var(--ink)',
        marginBottom: 32
      }}>
        {strip.map((d, i) => {
          const dObj = new Date(d)
          const isActive = d === date
          return (
            <button key={d}
                    onClick={() => setDate(d)}
                    style={{
                      padding: '14px 10px',
                      border: 'none',
                      borderRight: i < 6 ? '1px solid var(--ink)' : 'none',
                      background: isActive ? 'var(--ink)' : 'var(--paper)',
                      color: isActive ? 'var(--paper)' : 'var(--ink)',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-mono)',
                      textAlign: 'left',
                      position: 'relative'
                    }}>
              {isActive && (
                <span style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'var(--spark)' }} />
              )}
              <div style={{ fontSize: 10, letterSpacing: '0.08em', color: isActive ? 'var(--spark)' : 'var(--muted)', marginBottom: 4 }}>
                {dObj.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 500 }}>
                {dObj.getDate()}
              </div>
              <div style={{ fontSize: 10, color: isActive ? 'var(--paper-2)' : 'var(--muted)', marginTop: 2 }}>
                {dObj.toLocaleDateString('en-US', { month: 'short' })}
              </div>
            </button>
          )
        })}
      </div>

      {error && <div className="err" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="sec-head">
        <h2>{new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h2>
        <span className="mono-label">{events.length} events</span>
      </div>

      {busy ? (
        <div className="empty"><span className="empty-mark">◦</span><h3>Loading…</h3></div>
      ) : events.length === 0 ? (
        <div className="empty">
          <span className="empty-mark">◆</span>
          <h3>Nothing scheduled for this day.</h3>
        </div>
      ) : (
        <div className="ed-list">
          {events.map((ev, i) => (
            <div key={ev.event_id} className="ed-list-item" style={{ cursor: 'default' }}>
              <span className="ed-list-num">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <div className="ed-list-title">{ev.title}</div>
                <div className="ed-list-sub">{ev.course_title || ev.course_id}</div>
                {ev.description && (
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--muted)', marginTop: 6 }}>
                    {ev.description}
                  </div>
                )}
              </div>
              <div className="ed-list-meta">
                <span className="chip">{ev.event_date}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
