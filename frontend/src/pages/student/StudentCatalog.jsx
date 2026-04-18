import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { api } from '../../api/client'

export default function StudentCatalog() {
  const { user } = useAuth()
  const [all, setAll]         = useState([])
  const [mine, setMine]       = useState([])
  const [q, setQ]             = useState('')
  const [error, setError]     = useState('')
  const [ok, setOk]           = useState('')
  const [busyId, setBusyId]   = useState(null)

  const load = async () => {
    try {
      const [a, m] = await Promise.all([
        api.courses(),
        api.studentCourses(user.user_id)
      ])
      setAll(a); setMine(m)
    } catch (e) { setError(e.message) }
  }
  useEffect(() => { if (user) load() }, [user])

  const enrolledIds = new Set(mine.map(c => c.course_id))
  const filtered = all.filter((c) =>
    !q ||
    c.title?.toLowerCase().includes(q.toLowerCase()) ||
    String(c.course_id).toLowerCase().includes(q.toLowerCase())
  )

  const enroll = async (courseId) => {
    setError(''); setOk(''); setBusyId(courseId)
    try {
      await api.registerForCourse(courseId, user.user_id)
      setOk(`Enrolled in ${courseId}.`)
      await load()
    } catch (e) { setError(e.message) }
    finally { setBusyId(null) }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-head-eyebrow">
            <span className="mono-label">§ STUDENT · CATALOG</span>
            <span className="spark-dot" />
          </div>
          <h1>Browse the <em className="page-head-italic">catalog.</em></h1>
        </div>
        <div className="page-head-side">
          <input className="input" style={{ minWidth: 240 }}
                 placeholder="Search courses…"
                 value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      {error && <div className="err" style={{ marginBottom: 16 }}>{error}</div>}
      {ok    && <div className="info" style={{ marginBottom: 16 }}>{ok}</div>}

      <div className="sec-head">
        <h2>All courses</h2>
        <span className="mono-label">{filtered.length} shown · {mine.length}/6 enrolled</span>
      </div>

      {filtered.length === 0 ? (
        <div className="empty"><span className="empty-mark">◆</span><h3>No matches.</h3></div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="ed-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Lecturer</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const enrolled = enrolledIds.has(c.course_id)
                return (
                  <tr key={c.course_id}>
                    <td className="mono">{c.course_id}</td>
                    <td>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 500 }}>
                        {c.title}
                      </div>
                    </td>
                    <td className="mono" style={{ fontSize: 12 }}>
                      {c.lecturer_name || c.lecturer_id || '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {enrolled ? (
                        <span className="chip chip-lime">ENROLLED</span>
                      ) : (
                        <button
                          className="btn btn-sm btn-spark"
                          disabled={busyId === c.course_id || mine.length >= 6}
                          onClick={() => enroll(c.course_id)}
                        >
                          {busyId === c.course_id ? '…' : 'Enroll'}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
