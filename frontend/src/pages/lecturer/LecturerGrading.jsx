import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { api } from '../../api/client'

export default function LecturerGrading() {
  const { user } = useAuth()
  const [courses, setCourses]          = useState([])
  const [assignments, setAssignments]  = useState([])
  const [submissions, setSubmissions]  = useState([])
  const [picked, setPicked]            = useState({ course: '', assignment: '' })
  const [gradeDrafts, setGradeDrafts]  = useState({})
  const [error, setError]              = useState('')
  const [ok, setOk]                    = useState('')

  useEffect(() => {
    if (!user) return
    api.lecturerCourses(user.user_id).then(setCourses).catch(e => setError(e.message))
  }, [user])

  useEffect(() => {
    if (!picked.course) return setAssignments([])
    api.courseAssignments(picked.course)
      .then(setAssignments)
      .catch(e => setError(e.message))
  }, [picked.course])

  useEffect(() => {
    if (!picked.assignment) return setSubmissions([])
    api.submissions(picked.assignment)
      .then(setSubmissions)
      .catch(e => setError(e.message))
  }, [picked.assignment])

  const saveGrade = async (submissionId) => {
    const score = gradeDrafts[submissionId]
    if (score === undefined || score === '') return
    setError(''); setOk('')
    try {
      await api.grade(submissionId, { score: Number(score) })
      setOk(`Recorded: ${score}`)
      // Refetch
      const fresh = await api.submissions(picked.assignment)
      setSubmissions(fresh)
    } catch (e) { setError(e.message) }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-head-eyebrow">
            <span className="mono-label">§ LECTURER · GRADING</span>
            <span className="spark-dot" />
          </div>
          <h1>Mark the <em className="page-head-italic">work.</em></h1>
        </div>
      </div>

      <div className="card-stamp" style={{ padding: 20, marginBottom: 28 }}>
        <div className="row gap-16">
          <div className="grow">
            <label className="field-label">Course</label>
            <select className="input" value={picked.course}
                    onChange={(e) => setPicked({ course: e.target.value, assignment: '' })}>
              <option value="">— Pick course —</option>
              {courses.map(c => <option key={c.course_id} value={c.course_id}>{c.course_id} · {c.title}</option>)}
            </select>
          </div>
          <div className="grow">
            <label className="field-label">Assignment</label>
            <select className="input" value={picked.assignment}
                    onChange={(e) => setPicked(p => ({ ...p, assignment: e.target.value }))}
                    disabled={!picked.course}>
              <option value="">— Pick assignment —</option>
              {assignments.map(a => <option key={a.assignment_id} value={a.assignment_id}>{a.title}</option>)}
            </select>
          </div>
        </div>
      </div>

      {error && <div className="err" style={{ marginBottom: 16 }}>{error}</div>}
      {ok    && <div className="info" style={{ marginBottom: 16 }}>{ok}</div>}

      {picked.assignment && (
        <section>
          <div className="sec-head">
            <h2>Submissions</h2>
            <span className="mono-label">{submissions.length} received</span>
          </div>

          {submissions.length === 0 ? (
            <div className="empty"><span className="empty-mark">◆</span><h3>No submissions yet.</h3></div>
          ) : (
            <div className="card" style={{ padding: 0 }}>
              <table className="ed-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>File</th>
                    <th>Submitted</th>
                    <th>Current</th>
                    <th style={{ minWidth: 180 }}>Grade (0–100)</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((s) => (
                    <tr key={s.submission_id}>
                      <td>
                        <strong style={{ fontFamily: 'var(--font-display)', fontSize: 15 }}>
                          {s.student_name || s.student_id}
                        </strong>
                        <div className="mono-label" style={{ fontSize: 10 }}>{s.student_id}</div>
                      </td>
                      <td className="mono" style={{ fontSize: 11, wordBreak: 'break-all' }}>
                        {s.file_path}
                      </td>
                      <td className="mono" style={{ fontSize: 11 }}>
                        {s.submitted_at ? new Date(s.submitted_at).toLocaleDateString() : '—'}
                      </td>
                      <td>
                        {s.score != null
                          ? <span className="chip chip-spark">{Number(s.score).toFixed(1)}</span>
                          : <span className="mono-label">ungraded</span>}
                      </td>
                      <td>
                        <div className="row gap-8" style={{ alignItems: 'center' }}>
                          <input
                            className="input" type="number" min="0" max="100" step="0.5"
                            style={{ padding: '6px 10px', fontSize: 13 }}
                            defaultValue={s.score ?? ''}
                            onChange={(e) =>
                              setGradeDrafts(d => ({ ...d, [s.submission_id]: e.target.value }))
                            }
                          />
                          <button className="btn btn-sm btn-primary" onClick={() => saveGrade(s.submission_id)}>
                            Save
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </>
  )
}
