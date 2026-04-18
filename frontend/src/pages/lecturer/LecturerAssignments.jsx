import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { api } from '../../api/client'

export default function LecturerAssignments() {
  const { user } = useAuth()
  const [courses, setCourses]     = useState([])
  const [allAssign, setAllAssign] = useState([])
  const [error, setError]         = useState('')
  const [ok, setOk]               = useState('')
  const [selected, setSelected]   = useState('')
  const [form, setForm]           = useState({ title: '', due_date: '', max_score: 100, description: '' })

  const load = async () => {
    if (!user) return
    try {
      const cs = await api.lecturerCourses(user.user_id)
      setCourses(cs)
      const results = await Promise.allSettled(
        cs.map(c => api.courseAssignments(c.course_id)
          .then(list => list.map(a => ({ ...a, course_title: c.title }))))
      )
      const flat = results
        .filter(r => r.status === 'fulfilled')
        .flatMap(r => r.value)
      setAllAssign(flat)
    } catch (e) { setError(e.message) }
  }
  useEffect(() => { load() }, [user])

  const onCreate = async (e) => {
    e.preventDefault()
    if (!selected) return setError('Pick a course first.')
    setError(''); setOk('')
    try {
      await api.createAssignment(selected, form)
      setOk('Assignment posted.')
      setForm({ title: '', due_date: '', max_score: 100, description: '' })
      await load()
    } catch (err) { setError(err.message) }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-head-eyebrow">
            <span className="mono-label">§ LECTURER · ASSIGNMENTS</span>
            <span className="spark-dot" />
          </div>
          <h1>Set the <em className="page-head-italic">work.</em></h1>
        </div>
      </div>

      {error && <div className="err" style={{ marginBottom: 16 }}>{error}</div>}
      {ok    && <div className="info" style={{ marginBottom: 16 }}>{ok}</div>}

      <div className="split-2">
        {/* Existing */}
        <section>
          <div className="sec-head">
            <h2>Posted assignments</h2>
            <span className="mono-label">{allAssign.length} across your courses</span>
          </div>

          {allAssign.length === 0 ? (
            <div className="empty"><span className="empty-mark">◆</span><h3>Nothing posted yet.</h3></div>
          ) : (
            <div className="ed-list">
              {allAssign.map((a, i) => (
                <div key={a.assignment_id} className="ed-list-item" style={{ cursor: 'default' }}>
                  <span className="ed-list-num">{String(i + 1).padStart(2, '0')}</span>
                  <div>
                    <div className="ed-list-title">{a.title}</div>
                    <div className="ed-list-sub">{a.course_title}</div>
                  </div>
                  <div className="ed-list-meta">
                    <div className="mono" style={{ fontWeight: 600 }}>{a.due_date}</div>
                    <div className="mono-label" style={{ fontSize: 10 }}>due</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Create form */}
        <aside>
          <div className="card-stamp" style={{ padding: 24 }}>
            <div className="sec-head">
              <h3>New assignment</h3>
              <span className="mono-label">FORM</span>
            </div>
            <form onSubmit={onCreate} className="stack gap-12">
              <div>
                <label className="field-label">Course</label>
                <select className="input" value={selected} onChange={(e) => setSelected(e.target.value)} required>
                  <option value="">— Pick course —</option>
                  {courses.map(c => <option key={c.course_id} value={c.course_id}>{c.course_id} · {c.title}</option>)}
                </select>
              </div>
              <div>
                <label className="field-label">Title</label>
                <input className="input" value={form.title}
                       onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} required />
              </div>
              <div>
                <label className="field-label">Due date</label>
                <input className="input" type="date" value={form.due_date}
                       onChange={(e) => setForm(f => ({ ...f, due_date: e.target.value }))} required />
              </div>
              <div>
                <label className="field-label">Max score</label>
                <input className="input" type="number" min="1" max="100" value={form.max_score}
                       onChange={(e) => setForm(f => ({ ...f, max_score: +e.target.value }))} />
              </div>
              <div>
                <label className="field-label">Description</label>
                <textarea className="input" rows="3" value={form.description}
                          onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <button type="submit" className="btn btn-spark">Post assignment →</button>
            </form>
          </div>
        </aside>
      </div>
    </>
  )
}
