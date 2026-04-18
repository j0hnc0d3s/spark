import { useEffect, useState } from 'react'
import { api } from '../../api/client'

export default function AdminOverview() {
  const [courses, setCourses]       = useState([])
  const [top10, setTop10]           = useState([])
  const [topStudents, setTopStud]   = useState([])
  const [report50, setReport50]     = useState([])
  const [report3,  setReport3]      = useState([])
  const [error, setError]           = useState('')
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const [c, t10c, t10s, r50, r3] = await Promise.allSettled([
          api.courses(),
          api.reportTop10Courses(),
          api.reportTop10Students(),
          api.report50(),
          api.report3()
        ])
        if (!alive) return
        if (c.status   === 'fulfilled') setCourses(c.value)
        if (t10c.status === 'fulfilled') setTop10(t10c.value)
        if (t10s.status === 'fulfilled') setTopStud(t10s.value)
        if (r50.status === 'fulfilled') setReport50(r50.value)
        if (r3.status  === 'fulfilled') setReport3(r3.value)
        setLoading(false)
      } catch (e) {
        if (alive) { setError(e.message); setLoading(false) }
      }
    }
    load()
    return () => { alive = false }
  }, [])

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-head-eyebrow">
            <span className="mono-label">§ ADMIN · OVERVIEW</span>
            <span className="spark-dot" />
          </div>
          <h1>
            State of the <em className="page-head-italic">system.</em>
          </h1>
        </div>
        <div className="page-head-side">
          <span className="chip">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        </div>
      </div>

      {error && <div className="err reveal">{error}</div>}

      {/* ---------- Stat grid ---------- */}
      <div className="stat-grid reveal d-1">
        <div className="stat-cell">
          <div className="stat-cell-label">Courses</div>
          <div className="stat-cell-value">{courses.length || '—'}</div>
          <div className="stat-cell-sub">total on platform</div>
        </div>
        <div className="stat-cell accent">
          <div className="stat-cell-label">Mass courses</div>
          <div className="stat-cell-value">{report50.length}</div>
          <div className="stat-cell-sub">50+ students each</div>
        </div>
        <div className="stat-cell">
          <div className="stat-cell-label">Loaded lecturers</div>
          <div className="stat-cell-value">{report3.length}</div>
          <div className="stat-cell-sub">teaching 3+ courses</div>
        </div>
        <div className="stat-cell">
          <div className="stat-cell-label">Top performers</div>
          <div className="stat-cell-value">{topStudents.length}</div>
          <div className="stat-cell-sub">reported</div>
        </div>
      </div>

      {/* ---------- Two-column: top courses + top students ---------- */}
      <div className="split-2">
        <section className="reveal d-2">
          <div className="sec-head">
            <h2>Most-enrolled courses</h2>
            <span className="mono-label">TOP 10 · LIVE</span>
          </div>

          {loading ? (
            <div className="empty"><span className="empty-mark">◦</span><h3>Loading…</h3></div>
          ) : top10.length === 0 ? (
            <div className="empty"><span className="empty-mark">◆</span><h3>No data yet</h3></div>
          ) : (
            <div className="ed-list">
              {top10.map((c, i) => (
                <div key={c.course_id} className="ed-list-item">
                  <span className="ed-list-num">{String(i + 1).padStart(2, '0')}</span>
                  <div>
                    <div className="ed-list-title">{c.title}</div>
                    <div className="ed-list-sub">{c.course_id}</div>
                  </div>
                  <div className="ed-list-meta">
                    <strong style={{ fontSize: 18, fontFamily: 'var(--font-display)' }}>
                      {c.enrollment_count}
                    </strong>
                    <div className="mono-label" style={{ fontSize: 10 }}>enrolled</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="reveal d-3">
          <div className="sec-head">
            <h2>Leaderboard</h2>
            <span className="mono-label">AVG &gt;</span>
          </div>

          {loading ? (
            <div className="empty"><span className="empty-mark">◦</span><h3>Loading…</h3></div>
          ) : topStudents.length === 0 ? (
            <div className="empty"><span className="empty-mark">◆</span><h3>No grades yet</h3></div>
          ) : (
            <div className="card-stamp-spark" style={{ padding: 0 }}>
              <table className="ed-table">
                <thead>
                  <tr>
                    <th style={{ width: 30 }}>#</th>
                    <th>Student</th>
                    <th style={{ textAlign: 'right' }}>Avg</th>
                  </tr>
                </thead>
                <tbody>
                  {topStudents.map((s, i) => (
                    <tr key={s.user_id}>
                      <td className="mono">{String(i + 1).padStart(2, '0')}</td>
                      <td>
                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 15 }}>
                          {s.first_name} {s.last_name}
                        </div>
                        <div className="mono-label" style={{ fontSize: 10 }}>{s.user_id}</div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span className="chip chip-spark">
                          {Number(s.overall_average).toFixed(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  )
}
