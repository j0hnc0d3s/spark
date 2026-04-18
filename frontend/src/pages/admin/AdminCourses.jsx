import { useEffect, useState } from 'react'
import { api } from '../../api/client'

export default function AdminCourses() {
  const [courses, setCourses]   = useState([])
  const [error, setError]       = useState('')
  const [ok, setOk]             = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState({ course_id: '', title: '', lecturer_id: '' })
  const [busy, setBusy]         = useState(false)

  const load = async () => {
    try { setCourses(await api.courses()) }
    catch (e) { setError(e.message) }
  }
  useEffect(() => { load() }, [])

  const onCreate = async (e) => {
    e.preventDefault()
    setBusy(true); setError(''); setOk('')
    try {
      const body = { title: form.title, lecturer_id: form.lecturer_id || null }
      // Spark flavor wants course_id in body too
      if (import.meta.env.VITE_API_FLAVOR !== 'mysql') body.course_id = form.course_id
      await api.createCourse(body)
      setOk('Course created.')
      setForm({ course_id: '', title: '', lecturer_id: '' })
      setShowForm(false)
      await load()
    } catch (e) { setError(e.message) }
    finally { setBusy(false) }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-head-eyebrow">
            <span className="mono-label">§ ADMIN · COURSES</span>
            <span className="spark-dot" />
          </div>
          <h1>Course <em className="page-head-italic">registry.</em></h1>
        </div>
        <div className="page-head-side">
          <button className="btn btn-spark" onClick={() => setShowForm(v => !v)}>
            {showForm ? 'Cancel' : '+ New course'}
          </button>
        </div>
      </div>

      {error && <div className="err" style={{ marginBottom: 16 }}>{error}</div>}
      {ok    && <div className="info" style={{ marginBottom: 16 }}>{ok}</div>}

      {showForm && (
        <div className="card-stamp reveal" style={{ padding: 28, marginBottom: 32 }}>
          <div className="sec-head">
            <h2>New course</h2>
            <span className="mono-label">ADMIN ONLY</span>
          </div>
          <form onSubmit={onCreate} className="stack gap-16">
            {import.meta.env.VITE_API_FLAVOR !== 'mysql' && (
              <div>
                <label className="field-label">Course ID</label>
                <input className="input" value={form.course_id}
                       onChange={(e) => setForm(f => ({ ...f, course_id: e.target.value }))}
                       required placeholder="e.g. COMP3161" />
              </div>
            )}
            <div>
              <label className="field-label">Title</label>
              <input className="input" value={form.title}
                     onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                     required placeholder="Introduction to Database Management" />
            </div>
            <div>
              <label className="field-label">Lecturer ID (optional)</label>
              <input className="input" value={form.lecturer_id}
                     onChange={(e) => setForm(f => ({ ...f, lecturer_id: e.target.value }))}
                     placeholder="L001 or 2026001" />
            </div>
            <div className="row gap-12">
              <button type="submit" className="btn btn-spark" disabled={busy}>
                {busy ? 'Creating…' : 'Create course →'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="sec-head">
        <h2>All courses</h2>
        <span className="mono-label">{courses.length} total</span>
      </div>

      {courses.length === 0 ? (
        <div className="empty"><span className="empty-mark">◆</span><h3>No courses on file.</h3></div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="ed-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Lecturer</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((c) => (
                <tr key={c.course_id}>
                  <td className="mono">{c.course_id}</td>
                  <td>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 500 }}>
                      {c.title}
                    </div>
                  </td>
                  <td className="mono">
                    {c.lecturer_name || c.lecturer_id || <span style={{ color: 'var(--muted)' }}>— unassigned</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
