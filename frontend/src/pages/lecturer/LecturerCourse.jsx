import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../../api/client'

export default function LecturerCourse() {
  const { courseId } = useParams()
  const [members, setMembers]     = useState(null)
  const [content, setContent]     = useState([])
  const [events, setEvents]       = useState([])
  const [error, setError]         = useState('')

  // New section form
  const [newSection, setNewSection] = useState('')
  const [newEvent, setNewEvent]     = useState({ title: '', event_date: '', description: '' })

  const load = async () => {
    try {
      const [m, c, e] = await Promise.allSettled([
        api.courseMembers(courseId),
        api.courseContent(courseId),
        api.courseEvents(courseId)
      ])
      if (m.status === 'fulfilled') setMembers(m.value)
      if (c.status === 'fulfilled') setContent(c.value)
      if (e.status === 'fulfilled') setEvents(e.value)
    } catch (err) { setError(err.message) }
  }
  useEffect(() => { load() }, [courseId])

  const addSection = async (e) => {
    e.preventDefault()
    try {
      await api.createSection(courseId, { title: newSection })
      setNewSection('')
      await load()
    } catch (err) { setError(err.message) }
  }
  const addEvent = async (e) => {
    e.preventDefault()
    try {
      await api.createEvent(courseId, newEvent)
      setNewEvent({ title: '', event_date: '', description: '' })
      await load()
    } catch (err) { setError(err.message) }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-head-eyebrow">
            <Link to="/lecturer/overview" className="mono-label"
                  style={{ borderBottom: 'none', color: 'var(--muted)' }}>
              ← BACK TO OVERVIEW
            </Link>
          </div>
          <h1>
            {members?.lecturer ? (
              <>{members?.title || courseId}</>
            ) : courseId}
          </h1>
          <div className="mono-label" style={{ marginTop: 6 }}>
            {courseId} · {members?.students?.length || 0} students
          </div>
        </div>
      </div>

      {error && <div className="err" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="split-2">
        {/* ---------- LEFT: content + events ---------- */}
        <div className="stack gap-32">
          {/* Sections / content */}
          <section>
            <div className="sec-head">
              <h2>Course content</h2>
              <span className="mono-label">{content.length} sections</span>
            </div>

            {content.length === 0 ? (
              <div className="empty"><span className="empty-mark">◆</span><h3>No sections yet.</h3></div>
            ) : (
              <div className="stack gap-16">
                {content.map((s) => (
                  <div key={s.section_id} className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                      <h3>{s.section_title}</h3>
                      <span className="mono-label">§{s.display_order}</span>
                    </div>
                    {s.items?.length > 0 ? (
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {s.items.map((it) => (
                          <li key={it.content_id} style={{ padding: '8px 0', borderTop: '1px solid var(--paper-3)' }}>
                            <span className="chip" style={{ marginRight: 10 }}>{it.content_type}</span>
                            <strong style={{ fontFamily: 'var(--font-display)', fontSize: 15 }}>{it.title}</strong>
                            <div className="mono-label" style={{ fontSize: 10, marginTop: 2 }}>{it.content}</div>
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

            <form onSubmit={addSection} className="row gap-12" style={{ marginTop: 18, alignItems: 'flex-end' }}>
              <div className="grow">
                <label className="field-label">Add section</label>
                <input className="input" value={newSection}
                       onChange={(e) => setNewSection(e.target.value)}
                       placeholder="e.g. Week 3: Normalization" required />
              </div>
              <button className="btn btn-primary" type="submit">Add →</button>
            </form>
          </section>

          {/* Events */}
          <section>
            <div className="sec-head">
              <h2>Calendar</h2>
              <span className="mono-label">{events.length} events</span>
            </div>
            {events.length === 0 ? (
              <div className="empty"><span className="empty-mark">◆</span><h3>No events scheduled.</h3></div>
            ) : (
              <div className="ed-list">
                {events.map((ev, i) => (
                  <div key={ev.event_id} className="ed-list-item" style={{ cursor: 'default' }}>
                    <span className="ed-list-num">{String(i + 1).padStart(2, '0')}</span>
                    <div>
                      <div className="ed-list-title">{ev.title}</div>
                      <div className="ed-list-sub">{new Date(ev.event_date).toLocaleDateString()}</div>
                    </div>
                    <div className="ed-list-meta mono-label">{ev.event_date}</div>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={addEvent} className="card" style={{ marginTop: 20 }}>
              <div className="sec-head">
                <h3>New event</h3>
                <span className="mono-label">LECTURER</span>
              </div>
              <div className="stack gap-12">
                <div>
                  <label className="field-label">Title</label>
                  <input className="input" value={newEvent.title}
                         onChange={(e) => setNewEvent(s => ({ ...s, title: e.target.value }))} required />
                </div>
                <div>
                  <label className="field-label">Date</label>
                  <input className="input" type="date" value={newEvent.event_date}
                         onChange={(e) => setNewEvent(s => ({ ...s, event_date: e.target.value }))} required />
                </div>
                <div>
                  <label className="field-label">Description</label>
                  <input className="input" value={newEvent.description}
                         onChange={(e) => setNewEvent(s => ({ ...s, description: e.target.value }))} />
                </div>
                <button className="btn btn-spark" type="submit">Publish event →</button>
              </div>
            </form>
          </section>
        </div>

        {/* ---------- RIGHT: members ---------- */}
        <aside>
          <div className="sec-head">
            <h2>Roster</h2>
            <span className="mono-label">{members?.count || 0} total</span>
          </div>

          {!members ? (
            <div className="empty"><span className="empty-mark">◦</span><h3>Loading…</h3></div>
          ) : (
            <>
              {members.lecturer && (
                <div className="card-stamp-spark" style={{ padding: 16, marginBottom: 16 }}>
                  <div className="mono-label">LEAD LECTURER</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, marginTop: 4 }}>
                    {members.lecturer.first_name} {members.lecturer.last_name}
                  </div>
                  <div className="mono-label" style={{ fontSize: 11 }}>{members.lecturer.user_id}</div>
                </div>
              )}

              <div className="card" style={{ padding: 0, maxHeight: 460, overflowY: 'auto' }}>
                <table className="ed-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Student</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.students?.map((s) => (
                      <tr key={s.user_id}>
                        <td className="mono" style={{ fontSize: 11 }}>{s.user_id}</td>
                        <td>{s.first_name} {s.last_name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </aside>
      </div>
    </>
  )
}
