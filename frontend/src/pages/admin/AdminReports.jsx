import { useEffect, useState } from 'react'
import { api } from '../../api/client'

const TABS = [
  { key: '50',    label: 'Courses · 50+ students',  fetch: () => api.report50() },
  { key: '5',     label: 'Students · 5+ courses',   fetch: () => api.report5() },
  { key: '3',     label: 'Lecturers · 3+ courses',  fetch: () => api.report3() },
  { key: 'top10c',label: 'Top 10 enrolled',         fetch: () => api.reportTop10Courses() },
  { key: 'top10s',label: 'Top 10 by average',       fetch: () => api.reportTop10Students() },
]

export default function AdminReports() {
  const [active, setActive] = useState('50')
  const [rows, setRows]     = useState([])
  const [error, setError]   = useState('')
  const [busy, setBusy]     = useState(false)

  useEffect(() => {
    const tab = TABS.find(t => t.key === active)
    if (!tab) return
    setBusy(true); setError('')
    tab.fetch()
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .catch((e) => setError(e.message))
      .finally(() => setBusy(false))
  }, [active])

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-head-eyebrow">
            <span className="mono-label">§ ADMIN · REPORTS</span>
            <span className="spark-dot" />
          </div>
          <h1>Five <em className="page-head-italic">views</em>.</h1>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 0, marginBottom: 28, borderTop: '2px solid var(--ink)', borderBottom: '2px solid var(--ink)' }}>
        {TABS.map((t, i) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className="report-tab"
            style={{
              flex: '1 1 180px',
              padding: '16px 18px',
              background: active === t.key ? 'var(--ink)' : 'var(--paper)',
              color: active === t.key ? 'var(--paper)' : 'var(--ink)',
              border: 'none',
              borderRight: i < TABS.length - 1 ? '2px solid var(--ink)' : 'none',
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              cursor: 'pointer',
              textAlign: 'left',
              position: 'relative'
            }}
          >
            {active === t.key && (
              <span style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 4,
                background: 'var(--spark)'
              }} />
            )}
            <span style={{ color: active === t.key ? 'var(--spark)' : 'var(--muted)', marginRight: 6 }}>0{i + 1}</span>
            {t.label}
          </button>
        ))}
      </div>

      {error && <div className="err" style={{ marginBottom: 16 }}>{error}</div>}

      {busy ? (
        <div className="empty"><span className="empty-mark">◦</span><h3>Loading report…</h3></div>
      ) : rows.length === 0 ? (
        <div className="empty"><span className="empty-mark">◆</span><h3>No records match this view yet.</h3></div>
      ) : (
        <div className="card-stamp" style={{ padding: 0 }}>
          <table className="ed-table">
            <thead>
              <tr>
                {Object.keys(rows[0]).map((k) => (
                  <th key={k}>{k.replace(/_/g, ' ')}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  {Object.entries(r).map(([k, v]) => (
                    <td key={k} className={typeof v === 'number' ? 'mono' : ''}>
                      {v === null || v === undefined ? '—' : String(v)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
