/**
 * The feedback inbox. Only reachable by an account listed in the Worker's
 * ADMIN_SUBS; everyone else gets a 403 from the API and this says so.
 */
import { useCallback, useEffect, useState } from 'react'
import * as fb from '../lib/feedback'

type Show = 'open' | 'done' | 'all'

function when(ts: number): string {
  return new Date(ts * 1000).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

export function Inbox() {
  const [items, setItems] = useState<fb.FeedbackItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [show, setShow] = useState<Show>('open')

  const load = useCallback(() => {
    setError(null)
    fb.list().then(setItems).catch((e: Error) => setError(e.message))
  }, [])
  useEffect(load, [load])

  async function act(fn: () => Promise<void>) {
    try { await fn(); load() } catch (e) { setError((e as Error).message) }
  }

  const shown = (items ?? []).filter((i) => show === 'all' || i.status === show)
  const openCount = (items ?? []).filter((i) => i.status === 'open').length

  return (
    <div className="inbox">
      <div className="inbox-head">
        <h1 className="about-h1">Feedback inbox</h1>
        <button className="btn" onClick={load}>Refresh</button>
      </div>
      <p className="qsub">{openCount} open · {(items ?? []).length} total</p>

      <div className="seg sm inbox-seg" role="radiogroup" aria-label="Show">
        {(['open', 'done', 'all'] as const).map((s) => (
          <button key={s} role="radio" aria-checked={show === s}
                  className={show === s ? 'seg-b on' : 'seg-b'} onClick={() => setShow(s)}>
            {s === 'open' ? 'Open' : s === 'done' ? 'Done' : 'All'}
          </button>
        ))}
      </div>

      {error ? (
        <p className="fb-err">
          {error === 'not allowed' ? 'This inbox is only for the site owner. Sign in with the owner account.' : error}
        </p>
      ) : null}
      {items === null && !error ? <p className="qsub">Loading…</p> : null}
      {items && !shown.length ? <p className="qsub">Nothing here.</p> : null}

      <ul className="inbox-list">
        {shown.map((i) => (
          <li key={i.id} className={`inbox-item is-${i.status}`}>
            <div className="inbox-meta">
              <span className={`inbox-kind k-${i.kind}`}>{i.kind === 'bug' ? 'Bug' : 'Comment'}</span>
              <span>{when(i.created_at)}</span>
              {i.cb_id ? <code className="qid">{i.cb_id}</code> : null}
              {i.context ? <span className="inbox-ctx">from {i.context}</span> : null}
            </div>
            <p className="inbox-msg">{i.message}</p>
            <div className="inbox-actions">
              <button className="btn"
                      onClick={() => act(() => fb.setStatus(i.id, i.status === 'open' ? 'done' : 'open'))}>
                {i.status === 'open' ? 'Mark done' : 'Reopen'}
              </button>
              <button className="btn inbox-del"
                      onClick={() => { if (confirm('Delete this message for good?')) act(() => fb.remove(i.id)) }}>
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
