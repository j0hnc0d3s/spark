import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { api } from '../../api/client'

export default function StudentOverview() {
  const { user } = useAuth()
  const [courses, setCourses] = useState([])
  const [avg, setAvg]         = useState(null)
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    Promise.allSettled([
      api.studentCourses(user.user_id),
      api.studentAverage(user.user_id)
    ]).then(([c, a]) => {
      if (c.status === 'fulfilled') setCourses(c.value)
      if (a.status === 'fulfilled') setAvg(a.value)
      setLoading(false)
    }).catch((e) => { setError(e.message); setLoading(false) })
  }, [user])

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-head-eyebrow">
            <span className="mono-label">§ STUDENT · OVERVIEW</span>
            <span className="spark-dot" />
          </div>
          <h1>Welcome <em className="page-head-italic">back.</em></h1>
          <div className="mono-label" style={{ marginTop: 8 }}>{user?.user_id}</div>
        </div>
      </div>

      {error && <div className="err">{error}</div>}

      <div className="stat-grid reveal d-1">
        <div className="stat-cell">
          <div className="stat-cell-label">Enrolled</div>
          <div className="stat-cell-value">{courses.length}</div>
          <div className="stat-cell-sub">courses this term</div>
        </div>
        <div className="stat-cell">
          <div className="stat-cell-label">Load</div>
          <div className="stat-cell-value">
            {courses.length}<span style={{ color: 'var(--muted)', fontSize: '1.2rem' }}>/6</span>
          </div>
          <div className="stat-cell-sub">max allowed</div>
        </div>
        <div className="stat-cell accent">
          <div className="stat-cell-label">Overall average</div>
          <div className="stat-cell-value">
            {avg?.overall_average != null ? Number(avg.overall_average).toFixed(1) : '—'}
          </div>
          <div className="stat-cell-sub">
            {avg?.graded_count ? `${avg.graded_count} graded` : 'no grades yet'}
          </div>
        </div>
      </div>

      <div className="sec-head">
        <h2>Your courses</h2>
        <Link to="/student/catalog" className="mono-label" style={{ borderBottom: 'none' }}>
          + ADD MORE
        </Link>
      </div>

      {loading ? (
        <div className="empty"><span className="empty-mark">◦</span><h3>Loading…</h3></div>
      ) : courses.length === 0 ? (
        <div className="empty">
          <span className="empty-mark">◆</span>
          <h3>You haven't registered for any courses.</h3>
          <Link to="/student/catalog" className="btn btn-spark" style={{ marginTop: 20 }}>Browse catalog →</Link>
        </div>
      ) : (
        <div className="ed-list">
          {courses.map((c, i) => (
            <Link key={c.course_id} to={`/student/courses/${c.course_id}`} className="ed-list-item">
              <span className="ed-list-num">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <div className="ed-list-title">{c.title}</div>
                <div className="ed-list-sub">{c.course_id}</div>
              </div>
              <div className="ed-list-meta">OPEN →</div>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
