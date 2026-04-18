import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { api } from '../../api/client'

export default function StudentCourse() {
  const { courseId } = useParams()
  const { user } = useAuth()
  const [content, setContent]         = useState([])
  const [assignments, setAssignments] = useState([])
  const [events, setEvents]           = useState([])
  const [forums, setForums]           = useState([])
  const [error, setError]             = useState('')
  const [ok, setOk]                   = useState('')
  const [filePath, setFilePath]       = useState({})

  const load = async () => {
    try {
      const [c, a, e, f] = await Promise.allSettled([
        api.courseContent(courseId),
        api.courseAssignments(courseId),
        api.courseEvents(courseId),
        api.courseForums(courseId)
      ])
      if (c.status === 'fulfilled') setContent(c.value)
      if (a.status === 'fulfilled') setAssignments(a.value)
      if (e.status === 'fulfilled') setEvents(e.value)
      if (f.status === 'fulfilled') setForums(f.value)
    } catch (err) { setError(err.message) }
  }
  useEffect(() => { load() }, [courseId])

  const submit = async (assignmentId) => {
    const path = filePath[assignmentId]
    if (!path) return setError('Enter a file path first.')
    setError(''); setOk('')
    try {
      await api.submit(assignmentId, { file_path: path })
      setOk('Submitted!')
      setFilePath(s => ({ ...s, [assignmentId]: '' }))
    } catch (err) { setError(err.message) }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-head-eyebrow">
            <Link to="/student/overview" className="mono-label"
                  style={{ borderBottom: 'none', color: 'var(--muted)' }}>
              ← BACK TO OVERVIEW
            </Link>
          </div>
          <h1>{courseId}</h1>
          <div className="mono-label" style={{ marginTop: 6 }}>
            {content.length} sections · {assignments.length} assignments · {events.length} events
          </div>
        </div>
      </div>

      {error && <div className="err" style={{ marginBottom: 16 }}>{error}</div>}
      {ok    && <div className="info" style={{ marginBottom: 16 }}>{ok}</div>}

      <div className="split-2">
        {/* MAIN */}
        <div className="stack gap-32">
          {/* Content */}
          <section>
            <div className="sec-head">
              <h2>Content</h2>
              <span className="mono-label">{content.length} SECTIONS</span>
            </div>
            {content.length === 0 ? (
              <div className="empty"><span className="empty-mark">◆</span><h3>No materials posted yet.</h3></div>
            ) : (
              <div className="stack gap-16">
                {content.map((s) => (
                  <div key={s.section_id} className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                      <h3>{s.section_title}</h3>
                      <span className="mono-label">§{s.display_order}</span>
                    </div>
                    {s.items?.length ? (
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {s.items.map((it) => (
                          <li key={it.content_id} style={{ padding: '10px 0', borderTop: '1px solid var(--paper-3)' }}>
                            <span className="chip" style={{ marginRight: 10 }}>{it.content_type}</span>
                            <strong style={{ fontFamily: 'var(--font-display)', fontSize: 15 }}>
                              {it.content_type === 'link' ? (
                                <a href={it.content} target="_blank" rel="noreferrer">{it.title || it.content}</a>
                              ) : (it.title || it.content)}
                            </strong>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="mono-label" style={{ color: 'var(--muted)' }}>No items.</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Assignments */}
          <section>
            <div className="sec-head">
              <h2>Assignments</h2>
              <span className="mono-label">{assignments.length} POSTED</span>
            </div>
            {assignments.length === 0 ? (
              <div className="empty"><span className="empty-mark">◆</span><h3>No assignments yet.</h3></div>
            ) : (
              <div className="stack gap-12">
                {assignments.map((a) => (
                  <div key={a.assignment_id} className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10, gap: 12 }}>
                      <h3>{a.title}</h3>
                      <span className="chip">DUE · {a.due_date}</span>
                    </div>
                    {a.description && (
                      <p style={{ color: 'var(--muted)', margin: '0 0 14px' }}>{a.description}</p>
                    )}
                    <div className="row gap-8" style={{ alignItems: 'center' }}>
                      <input
                        className="input"
                        placeholder="/uploads/my_submission.pdf"
                        value={filePath[a.assignment_id] || ''}
                        onChange={(e) => setFilePath(s => ({ ...s, [a.assignment_id]: e.target.value }))}
                      />
                      <button className="btn btn-spark" onClick={() => submit(a.assignment_id)}>
                        Submit →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* SIDE */}
        <aside className="stack gap-24">
          <section>
            <div className="sec-head">
              <h2>Upcoming</h2>
              <span className="mono-label">{events.length}</span>
            </div>
            {events.length === 0 ? (
              <div className="empty"><span className="empty-mark">◦</span><h3>Nothing scheduled.</h3></div>
            ) : (
              <div className="ed-list">
                {events.slice(0, 5).map((ev, i) => (
                  <div key={ev.event_id} className="ed-list-item" style={{ cursor: 'default' }}>
                    <span className="ed-list-num">{String(i + 1).padStart(2, '0')}</span>
                    <div>
                      <div className="ed-list-title" style={{ fontSize: 17 }}>{ev.title}</div>
                      <div className="ed-list-sub">{ev.event_date}</div>
                    </div>
                    <div className="mono-label" style={{ fontSize: 10 }}>
                      {new Date(ev.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="sec-head">
              <h2>Forums</h2>
              <span className="mono-label">{forums.length}</span>
            </div>
            {forums.length === 0 ? (
              <div className="empty"><span className="empty-mark">◦</span><h3>No forums yet.</h3></div>
            ) : (
              <div className="stack gap-8">
                {forums.map((f) => (
                  <div key={f.forum_id} className="card card-tight">
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 500 }}>
                      {f.title}
                    </div>
                    <div className="mono-label" style={{ fontSize: 10, marginTop: 2 }}>
                      FORUM #{f.forum_id}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>
    </>
  )
}
