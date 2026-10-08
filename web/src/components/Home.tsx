import { useEffect, useMemo, useState } from 'react'
import { Icon } from './Icon'
import { FeedbackLink } from './Feedback'
import { ProgressStrip } from './ProgressStrip'
import { SPEEDS, setSeconds, formatClock } from '../lib/pacing'
import { describeSet } from '../lib/setlabel'
import type { Order } from '../lib/order'
import type { HistoryRow } from '../lib/progress'
import type {
  Difficulty, Filters, PracticeSet, Section, SetItem, Stats, Status, TaxonomyRow,
} from '../types'

interface Props {
  taxonomy: TaxonomyRow[]
  stats: Stats | null
  history: HistoryRow[]
  value: Filters
  /** The filtered pool, in the order practice walks it. */
  items: SetItem[]
  loading: boolean
  onChange: (next: Filters) => void
  /** Open practice at this index of `items`. */
  onOpen: (index: number) => void
  /** Draw and start a fixed-size set from the pool. */
  onStart: () => void
  order: Order
  onOrder: (next: Order) => void
  activeSets: PracticeSet[]
  onResume: (id: string) => void
  onAbandon: (id: string) => void
  /** Every question whose College Board ID matches, for the search box. */
  findIds: (needle: string) => Promise<SetItem[]>
  /** Open one question on its own. */
  onOpenId: (id: string) => void
}

const SECTIONS: { key: Section; label: string }[] = [
  { key: 'RW', label: 'Reading and Writing' },
  { key: 'MATH', label: 'Math' },
]

const DIFFICULTIES: { key: Difficulty; label: string }[] = [
  { key: 'E', label: 'Easy' },
  { key: 'M', label: 'Medium' },
  { key: 'H', label: 'Hard' },
]

/** Which questions inside the chosen topics. One choice, mapped onto `statuses`. */
const WHICH: { key: Status | 'all'; label: string }[] = [
  { key: 'all', label: 'All questions' },
  { key: 'unseen', label: 'Not done yet' },
  { key: 'wrong', label: 'Ones I got wrong' },
  { key: 'flagged', label: 'Marked for review' },
  { key: 'correct', label: 'Ones I got right' },
]

const ORDERS: { key: Order; label: string }[] = [
  { key: 'mixed', label: 'Mixed' },
  { key: 'topic', label: 'By topic' },
  { key: 'random', label: 'Random' },
]

/** 0 is "no set": practise the whole pool, open-ended. */
const SIZES = [0, 10, 20, 30, 50]

interface SkillRow { code: string; name: string; n: number; seen: number; correct: number }
interface DomainRow {
  code: string; name: string; section: Section
  n: number; seen: number; correct: number; skills: SkillRow[]
}

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0)
const accClass = (p: number) => (p >= 70 ? 'good' : p >= 50 ? 'mid' : 'poor')

export function Home({
  taxonomy, stats, history, value, items, loading, onChange, onOpen, onStart,
  order, onOrder, activeSets, onResume, onAbandon, findIds, onOpenId,
}: Props) {
  const [showOptions, setShowOptions] = useState(false)
  const [query, setQuery] = useState('')
  const [matches, setMatches] = useState<SetItem[] | null>(null)
  const count = items.length
  const needle = query.trim().toLowerCase()

  // ID search: look across the whole bank once the ID is long enough to mean something.
  useEffect(() => {
    if (needle.length < 3) return
    let stale = false
    findIds(needle).then((m) => { if (!stale) setMatches(m) }).catch(() => {})
    return () => { stale = true }
  }, [needle, findIds])

  const domains = useMemo(() => {
    const map = new Map<string, DomainRow>()
    for (const row of taxonomy) {
      if (value.section && row.section !== value.section) continue
      const d = map.get(row.domain) ?? {
        code: row.domain, name: row.domain_name, section: row.section,
        n: 0, seen: 0, correct: 0, skills: [],
      }
      d.n += row.n; d.seen += row.seen; d.correct += row.correct
      let s = d.skills.find((x) => x.code === row.skill)
      if (!s) { s = { code: row.skill, name: row.skill_name, n: 0, seen: 0, correct: 0 }; d.skills.push(s) }
      s.n += row.n; s.seen += row.seen; s.correct += row.correct
      map.set(row.domain, d)
    }
    const rank: Record<Section, number> = { RW: 0, MATH: 1 }
    const out = [...map.values()].sort(
      (a, b) => rank[a.section] - rank[b.section] || a.name.localeCompare(b.name))
    for (const d of out) d.skills.sort((a, b) => a.name.localeCompare(b.name))
    return out
  }, [taxonomy, value.section])

  const totals = useMemo(() => {
    const out = { all: 0, seen: 0, live: 0, RW: 0, MATH: 0 }
    for (const row of taxonomy) {
      out.all += row.n; out.seen += row.seen; out.live += row.live_n ?? 0; out[row.section] += row.n
    }
    return out
  }, [taxonomy])

  const pool = useMemo(() => {
    let done = 0, firstNew = -1
    items.forEach((q, i) => { if (q.answered_at) done++; else if (firstNew < 0) firstNew = i })
    return { done, firstNew }
  }, [items])

  const plannedSeconds = useMemo(() => {
    if (!value.size || !value.speed) return 0
    const n = Math.min(value.size, count)
    const mix: Section[] = value.section
      ? Array.from({ length: n }, () => value.section as Section)
      : Array.from({ length: n }, (_, i) => (i % 2 ? 'MATH' : 'RW'))
    return setSeconds(mix, value.speed)
  }, [value.size, value.speed, value.section, count])

  function set(patch: Partial<Filters>) { onChange({ ...value, ...patch }) }

  function toggle<T>(list: T[] | undefined, item: T): T[] | undefined {
    const next = list?.includes(item) ? list.filter((x) => x !== item) : [...(list ?? []), item]
    return next.length ? next : undefined
  }

  /**
   * The picker is a set of ticked skills. Filters AND domain with skill, so a
   * whole domain is written out as all of its skills: ticking one skill in
   * Algebra must not quietly empty a whole-ticked Geometry.
   */
  const ticked = useMemo(() => {
    if (value.skills?.length) return new Set(value.skills)
    const whole = domains.filter((d) => value.domains?.includes(d.code))
    return new Set(whole.flatMap((d) => d.skills.map((s) => s.code)))
  }, [value.skills, value.domains, domains])

  function commit(next: Set<string>) {
    const doms = domains.filter((d) => d.skills.some((s) => next.has(s.code))).map((d) => d.code)
    set(next.size ? { domains: doms, skills: [...next] } : { domains: undefined, skills: undefined })
  }

  function tickDomain(d: DomainRow) {
    const next = new Set(ticked)
    const all = d.skills.every((s) => next.has(s.code))
    for (const s of d.skills) { if (all) next.delete(s.code); else next.add(s.code) }
    commit(next)
  }

  function tickSkill(code: string) {
    const next = new Set(ticked)
    if (next.has(code)) next.delete(code); else next.add(code)
    commit(next)
  }

  const which: Status | 'all' = value.statuses?.length === 1 ? value.statuses[0] : 'all'
  const optionCount = (value.size ? 1 : 0) + (value.excludeLive ? 1 : 0) + (order !== 'mixed' ? 1 : 0)
    + (value.difficulties?.length ? 1 : 0) + (which !== 'all' ? 1 : 0)

  const pickedNames = domains.flatMap((d) => d.skills.filter((s) => ticked.has(s.code)).map((s) => s.name))
  const summary = pickedNames.length
    ? pickedNames.length === 1 ? pickedNames[0] : `${pickedNames[0]} + ${pickedNames.length - 1} more`
    : value.section ? `All ${value.section === 'RW' ? 'Reading and Writing' : 'Math'}` : 'All topics'

  function start() {
    if (value.size) { onStart(); return }
    onOpen(pool.firstNew < 0 ? 0 : pool.firstNew)
  }

  const tabs: { key: Section | undefined; label: string; n: number }[] = [
    { key: undefined, label: 'All', n: totals.all },
    { key: 'RW', label: 'Reading & Writing', n: totals.RW },
    { key: 'MATH', label: 'Math', n: totals.MATH },
  ]

  const difficultyChips = (
    <div className="chips" role="group" aria-label="Difficulty">
      {DIFFICULTIES.map((d) => (
        <button key={d.key} aria-pressed={value.difficulties?.includes(d.key) ?? false}
                className={value.difficulties?.includes(d.key) ? `chip on d-${d.key}` : `chip d-${d.key}`}
                onClick={() => set({ difficulties: toggle(value.difficulties, d.key) })}>
          {d.label}
        </button>
      ))}
    </div>
  )
  const whichSelect = (
    <select className="sel" aria-label="Which questions" value={which}
            onChange={(e) => set({ statuses: e.target.value === 'all' ? undefined : [e.target.value as Status] })}>
      {WHICH.map((w) => <option key={w.key} value={w.key}>{w.label}</option>)}
    </select>
  )

  return (
    <div className="home">
      <div className="hwrap">
        <header className="hhead">
          <div>
            <h1 className="qtitle">Practice</h1>
            <p className="qsub">Pick the topics you want to drill, then hit Start.</p>
          </div>
          <form className="qsearch" role="search"
                onSubmit={(e) => { e.preventDefault(); if (matches?.length === 1) onOpenId(matches[0].id) }}>
            <Icon name="search" size={16} />
            <input type="search" value={query} placeholder="Find by question ID"
                   aria-label="Find a question by its College Board ID"
                   autoCapitalize="off" autoCorrect="off" spellCheck={false}
                   onChange={(e) => setQuery(e.target.value)} />
          </form>
        </header>

        {matches && needle.length >= 3 ? (
          <div className="idres" aria-live="polite">
            {matches.length ? matches.slice(0, 5).map((q) => (
              <button key={q.id} className="idhit" onClick={() => onOpenId(q.id)}>
                <code className="qid">{q.cb_id}</code>
                <span className="idhit-s">{q.skill_name}</span>
                <span className={`lvl d-${q.difficulty}`}>
                  {DIFFICULTIES.find((d) => d.key === q.difficulty)?.label}
                </span>
                <Icon name="arrow-right" size={15} />
              </button>
            )) : <p className="idnone">No question with ID “{query.trim()}”.</p>}
          </div>
        ) : null}

        <ProgressStrip history={history} covered={totals.seen} total={totals.all}
                       accuracy={stats?.accuracy ?? null} />

        {activeSets.length ? (
          <section className="qsets">
            <h2 className="side-t">Sets in progress</h2>
            <ul className="setlist">
              {activeSets.map((s) => (
                <li key={s.id} className="setcard">
                  <button className="setcard-main" onClick={() => onResume(s.id)}>
                    <span className="setcard-text">
                      <span className="setcard-t">{describeSet(s)}</span>
                      <span className="setcard-b">{s.answered} of {s.total} answered</span>
                      <span className="meter"><span className="meter-fill"
                        style={{ width: `${Math.max((s.answered / Math.max(s.total, 1)) * 100, 0.4)}%` }} /></span>
                    </span>
                    <span className="setcard-go">Resume</span>
                  </button>
                  <span className="setcard-side">
                    <button className="setcard-drop" onClick={() => onAbandon(s.id)} title="Discard this set">
                      <Icon name="trash" size={15} strokeWidth={2} />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className="topics-head">
          <h2 className="topics-t">Topics</h2>
          <div className="seg sectabs" role="group" aria-label="Section">
            {tabs.map((t) => (
              <button key={t.label} aria-pressed={value.section === t.key}
                      className={value.section === t.key ? 'seg-b on' : 'seg-b'}
                      onClick={() => onChange({ ...value, section: t.key, domains: undefined, skills: undefined })}>
                {t.label}
              </button>
            ))}
          </div>
          {ticked.size ? <button className="link" onClick={() => commit(new Set())}>Clear selection</button> : null}
        </div>

        {!domains.length ? (
          <p className="topics-loading">Loading topics from College Board…</p>
        ) : null}

        {domains.length ? SECTIONS.filter((s) => !value.section || s.key === value.section).map((sec) => (
          <section key={sec.key} className="topics" aria-label={sec.label}>
            {!value.section ? <h3 className="topics-cap">{sec.label}</h3> : null}
            <div className="dgrid">
              {domains.filter((d) => d.section === sec.key).map((d) => {
                const on = d.skills.filter((s) => ticked.has(s.code)).length
                const state = on === 0 ? 'off' : on === d.skills.length ? 'on' : 'mixed'
                const acc = pct(d.correct, d.seen)
                return (
                  <article key={d.code} className={`dcard is-${state}`}>
                    <button className="dcard-h" onClick={() => tickDomain(d)}
                            role="checkbox" aria-checked={state === 'mixed' ? 'mixed' : state === 'on'}>
                      <span className={`box is-${state}`}><Icon name="check" size={12} strokeWidth={3} /></span>
                      <span className="dcard-t">{d.name}</span>
                      <span className="dcard-stat">
                        {d.seen}/{d.n}
                        {d.seen ? <span className={`acc ${accClass(acc)}`}>{acc}%</span> : null}
                      </span>
                    </button>
                    <span className="dmeter"><span style={{ transform: `scaleX(${d.n ? d.seen / d.n : 0})` }} /></span>
                    <ul className="sklist">
                      {d.skills.map((s) => {
                        const sOn = ticked.has(s.code)
                        const sAcc = pct(s.correct, s.seen)
                        return (
                          <li key={s.code}>
                            <button className={sOn ? 'skrow on' : 'skrow'} role="checkbox" aria-checked={sOn}
                                    onClick={() => tickSkill(s.code)}>
                              <span className={`box sm is-${sOn ? 'on' : 'off'}`}>
                                <Icon name="check" size={10} strokeWidth={3.2} />
                              </span>
                              <span className="skrow-name">{s.name}</span>
                              <span className="skrow-n">{s.seen}/{s.n}</span>
                              {s.seen ? <span className={`acc ${accClass(sAcc)}`}>{sAcc}%</span>
                                : <span className="acc none">new</span>}
                              <span className="skbar"><span style={{ transform: `scaleX(${s.n ? s.seen / s.n : 0})` }} /></span>
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </article>
                )
              })}
            </div>
          </section>
        )) : null}

        <div className="hfoot">
          <FeedbackLink label="Found a bug? Send feedback" ctx={{ context: 'home' }} />
        </div>
      </div>

      <div className="startbar2">
        <div className="startbar2-in">
          <div className="sb-sum">
            <strong>{summary}</strong>
            <span>
              {loading ? 'Counting…' : `${count.toLocaleString()} question${count === 1 ? '' : 's'}`}
              {!loading && pool.done ? ` · ${pool.done.toLocaleString()} done` : ''}
            </span>
          </div>
          <div className="sb-ctl desk-only">
            {difficultyChips}
            {whichSelect}
          </div>
          <button className="btn sb-opt" onClick={() => setShowOptions(true)} aria-haspopup="dialog">
            <Icon name="sliders" size={16} />
            Options{optionCount ? ` · ${optionCount}` : ''}
          </button>
          <button className="btn primary sb-go" disabled={!count || loading} onClick={start}>
            {value.size
              ? `Start ${Math.min(value.size, count)}${value.speed ? ` · ${formatClock(plannedSeconds)}` : ''}`
              : pool.done && pool.firstNew > 0 ? 'Continue' : 'Start'}
            <Icon name="arrow-right" size={16} strokeWidth={2.2} />
          </button>
        </div>
      </div>

      {showOptions ? (
        <>
          <div className="fb-scrim" onClick={() => setShowOptions(false)} />
          <div className="fb-dialog opt-dialog" role="dialog" aria-modal="true" aria-labelledby="opt-title">
            <div className="fb-head">
              <h2 id="opt-title" className="fb-title">Practice options</h2>
              <button className="sheet-x fb-x" onClick={() => setShowOptions(false)} aria-label="Close">
                <Icon name="close" size={18} />
              </button>
            </div>
            <div className="opt-body">
              <div className="opt-row"><span className="side-t">Difficulty</span>{difficultyChips}</div>
              <div className="opt-row"><span className="side-t">Questions</span>{whichSelect}</div>
              <div className="opt-row">
                <span className="side-t">Practice mode</span>
                <div className="chips">
                  {SIZES.map((n) => (
                    <button key={n} aria-pressed={(value.size ?? 0) === n}
                            className={(value.size ?? 0) === n ? 'chip on' : 'chip'}
                            onClick={() => set({ size: n || undefined })}>
                      {n ? `Set of ${n}` : 'Open'}
                    </button>
                  ))}
                </div>
              </div>
              {value.size ? (
                <div className="opt-row">
                  <span className="side-t">Timer</span>
                  <div className="chips">
                    <button aria-pressed={!value.speed} className={!value.speed ? 'chip on' : 'chip'}
                            onClick={() => set({ speed: undefined })}>Untimed</button>
                    {SPEEDS.map((x) => (
                      <button key={x} aria-pressed={value.speed === x}
                              className={value.speed === x ? 'chip on' : 'chip'}
                              onClick={() => set({ speed: x })}>{x}x time</button>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="opt-row">
                <span className="side-t">Order</span>
                <div className="chips">
                  {ORDERS.map((o) => (
                    <button key={o.key} aria-pressed={order === o.key}
                            className={order === o.key ? 'chip on' : 'chip'}
                            onClick={() => onOrder(o.key)}>{o.label}</button>
                  ))}
                </div>
              </div>
              {totals.live ? (
                <label className="excl opt-row">
                  <input type="checkbox" checked={value.excludeLive ?? false}
                         onChange={(e) => set({ excludeLive: e.target.checked || undefined })} />
                  Skip questions that appear on official practice tests
                </label>
              ) : null}
            </div>
            <button className="btn primary sheet-go" onClick={() => setShowOptions(false)}>
              {loading ? 'Counting…' : `Done · ${count.toLocaleString()} questions`}
            </button>
          </div>
        </>
      ) : null}
    </div>
  )
}
