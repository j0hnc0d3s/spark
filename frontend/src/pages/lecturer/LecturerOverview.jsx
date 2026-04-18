import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { api } from '../../api/client'

export default function LecturerOverview() {
  const { user } = useAuth()
  const [courses, setCourses] = useState([])
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    api.lecturerCourses(user.user_id)
      .then(setCourses)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [user])

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-head-eyebrow">
            <span className="mono-label">§ LECTURER · OVERVIEW</span>
            <span className="spark-dot" />
          </div>
          <h1>Your <em className="page-head-italic">courses.</em></h1>
        </div>
        <div className="page-head-side">
          <span className="chip">{user?.user_id}</span>
        </div>
      </div>

      {error && <div className="err">{error}</div>}

      <div className="stat-grid reveal d-1">
        <div className="stat-cell">
          <div className="stat-cell-label">Active courses</div>
          <div className="stat-cell-value">{courses.length}</div>
          <div className="stat-cell-sub">under your name</div>
        </div>
        <div className="stat-cell accent">
          <div className="stat-cell-label">Teaching load</div>
          <div className="stat-cell-value">
            {courses.length}<span style={{ color: 'var(--muted)', fontSize: '1.2rem' }}>/5</span>
          </div>
          <div className="stat-cell-sub">max allowed</div>
        </div>
        <div className="stat-cell">
          <div className="stat-cell-label">Semester</div>
          <div className="stat-cell-value" style={{ fontSize: '1.6rem' }}>2025/26 · S2</div>
          <div className="stat-cell-sub">in progress</div>
        </div>
      </div>

      <div className="sec-head">
        <h2>Courses you lead</h2>
        <span className="mono-label">TAP TO OPEN →</span>
      </div>

      {loading ? (
        <div className="empty"><span className="empty-mark">◦</span><h3>Loading…</h3></div>
      ) : courses.length === 0 ? (
        <div className="empty">
          <span className="empty-mark">◆</span>
          <h3>No courses assigned yet.</h3>
          <p style={{ color: 'var(--muted)', marginTop: 10 }}>
            An administrator will assign courses to your account.
          </p>
        </div>
      ) : (
        <div className="ed-list">
          {courses.map((c, i) => (
            <Link key={c.course_id} to={`/lecturer/courses/${c.course_id}`} className="ed-list-item">
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
