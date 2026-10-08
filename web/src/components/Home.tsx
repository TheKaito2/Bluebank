import { useMemo, useState } from 'react'
import { BookmarkFilled, Icon } from './Icon'
import { cellState } from './Navigator'
import { FeedbackLink } from './Feedback'
import { SPEEDS, setSeconds, formatClock } from '../lib/pacing'
import { describeSet } from '../lib/setlabel'
import type { Order } from '../lib/order'
import type {
  Difficulty, Filters, PracticeSet, Section, SetItem, Stats, Status, TaxonomyRow,
} from '../types'

interface Props {
  taxonomy: TaxonomyRow[]
  stats: Stats | null
  value: Filters
  /** The filtered pool, in the order the list shows and practice walks. */
  items: SetItem[]
  loading: boolean
  onChange: (next: Filters) => void
  /** Open the list at one question; Back and Next then walk the same list. */
  onOpen: (index: number) => void
  /** Draw and start a fixed-size set from the pool. */
  onStart: () => void
  order: Order
  onOrder: (next: Order) => void
  /** Sets still being worked through, oldest first. */
  activeSets: PracticeSet[]
  onResume: (id: string) => void
  onAbandon: (id: string) => void
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

const STATUSES: { key: Status; label: string }[] = [
  { key: 'unseen', label: 'Not done' },
  { key: 'wrong', label: 'Incorrect' },
  { key: 'correct', label: 'Correct' },
  { key: 'flagged', label: 'Marked' },
]

const ORDERS: { key: Order; label: string }[] = [
  { key: 'mixed', label: 'Mixed' },
  { key: 'topic', label: 'By topic' },
  { key: 'random', label: 'Random' },
]

/** Offered set sizes. 0 is "no set": practise the whole list, open-ended. */
const SIZES = [0, 10, 20, 30, 50]

const STATE_LABEL = {
  unanswered: 'New', answered: 'Answered', first: 'Correct', retry: 'Correct', wrong: 'Incorrect',
} as const

interface SkillRow { code: string; name: string; n: number; seen: number }
interface DomainRow {
  code: string; name: string; section: Section; n: number; seen: number; skills: SkillRow[]
}

/** "3d ago", for the last-answered column. Seconds in, like the API. */
function ago(ts: number | null): string {
  if (!ts) return ''
  const s = Math.max(0, Date.now() / 1000 - ts)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`
  return new Date(ts * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function Home({
  taxonomy, stats, value, items, loading, onChange, onOpen, onStart,
  order, onOrder, activeSets, onResume, onAbandon,
}: Props) {
  const [open, setOpen] = useState<Set<string>>(new Set())
  /** Phone only: the sidebar folds away behind a Filters button. */
  const [showFilters, setShowFilters] = useState(false)
  /** Question ID search. Filters the list on screen; numbers keep their place. */
  const [query, setQuery] = useState('')
  const count = items.length

  const needle = query.trim().toLowerCase()
  const rows = useMemo(() => {
    const all = items.map((q, i) => [q, i] as const)
    if (!needle) return all
    return all.filter(([q]) => (q.cb_id ?? '').toLowerCase().includes(needle)
      || q.id.toLowerCase().startsWith(needle))
  }, [items, needle])

  const plannedSeconds = useMemo(() => {
    if (!value.size || !value.speed) return 0
    const n = Math.min(value.size, count)
    const mix: Section[] = value.section
      ? Array.from({ length: n }, () => value.section as Section)
      // Both sections: near enough half and half, it only decides the clock.
      : Array.from({ length: n }, (_, i) => (i % 2 ? 'MATH' : 'RW'))
    return setSeconds(mix, value.speed)
  }, [value.size, value.speed, value.section, count])

  /** Domains with their skills nested, for the topic tree. */
  const domains = useMemo(() => {
    const map = new Map<string, DomainRow>()
    for (const row of taxonomy) {
      if (value.section && row.section !== value.section) continue
      const d = map.get(row.domain) ?? {
        code: row.domain, name: row.domain_name, section: row.section, n: 0, seen: 0, skills: [],
      }
      d.n += row.n
      d.seen += row.seen
      let s = d.skills.find((x) => x.code === row.skill)
      if (!s) { s = { code: row.skill, name: row.skill_name, n: 0, seen: 0 }; d.skills.push(s) }
      s.n += row.n
      s.seen += row.seen
      map.set(row.domain, d)
    }
    const order: Record<Section, number> = { RW: 0, MATH: 1 }
    const out = [...map.values()].sort(
      (a, b) => order[a.section] - order[b.section] || a.name.localeCompare(b.name))
    for (const d of out) d.skills.sort((a, b) => a.name.localeCompare(b.name))
    return out
  }, [taxonomy, value.section])

  const totals = useMemo(() => {
    const out = { all: 0, seen: 0, live: 0, RW: 0, MATH: 0 }
    for (const row of taxonomy) {
      out.all += row.n
      out.seen += row.seen
      out.live += row.live_n ?? 0
      out[row.section] += row.n
    }
    return out
  }, [taxonomy])

  /** Done and right within the current list, for the header line. */
  const listStats = useMemo(() => {
    let done = 0, right = 0, firstNew = -1
    items.forEach((q, i) => {
      if (q.answered_at) { done++; if (q.last_correct === 1) right++ }
      else if (firstNew < 0) firstNew = i
    })
    return { done, right, firstNew }
  }, [items])

  function set(patch: Partial<Filters>) { onChange({ ...value, ...patch }) }

  /** Add or remove one value; undefined when empty, because empty means "no filter". */
  function toggle<T>(list: T[] | undefined, item: T): T[] | undefined {
    const next = list?.includes(item) ? list.filter((x) => x !== item) : [...(list ?? []), item]
    return next.length ? next : undefined
  }

  /**
   * The tree is a set of ticked skills. Filters AND domain with skill, so a
   * domain ticked whole is written out as all of its skills: that way ticking
   * one skill in Algebra does not quietly empty a whole-ticked Geometry.
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

  function expand(code: string) {
    const next = new Set(open)
    if (next.has(code)) next.delete(code); else next.add(code)
    setOpen(next)
  }

  const hideDone = value.statuses?.length === 1 && value.statuses[0] === 'unseen'
  const activeFilters = (value.skills?.length ? 1 : value.domains?.length ? 1 : 0)
    + (value.difficulties?.length ? 1 : 0) + (value.statuses?.length ? 1 : 0)
    + (value.excludeLive ? 1 : 0)

  function start() {
    if (value.size) { onStart(); return }
    // Open practice picks up at the first question you have not done.
    onOpen(listStats.firstNew < 0 ? 0 : listStats.firstNew)
  }

  const tabs: { key: Section | undefined; label: string; n: number }[] = [
    { key: undefined, label: 'All', n: totals.all },
    { key: 'RW', label: 'Reading & Writing', n: totals.RW },
    { key: 'MATH', label: 'Math', n: totals.MATH },
  ]

  return (
    <div className="home">
      <div className="home-grid">
        {showFilters ? (
          <div className="sheet-scrim" onClick={() => setShowFilters(false)} />
        ) : null}
        <aside id="filters" className={showFilters ? 'side open' : 'side'} aria-label="Filters">
          <div className="sheet-head">
            <span className="sheet-t">Filters</span>
            {activeFilters ? (
              <button className="link" onClick={() => onChange({ section: value.section })}>
                Reset
              </button>
            ) : null}
            <button className="sheet-x" onClick={() => setShowFilters(false)} aria-label="Close filters">
              <Icon name="close" size={18} />
            </button>
          </div>
          <div className="seg" role="group" aria-label="Section">
            {tabs.map((t) => (
              <button key={t.label}
                      aria-pressed={value.section === t.key}
                      className={value.section === t.key ? 'seg-b on' : 'seg-b'}
                      onClick={() => onChange({
                        ...value, section: t.key, domains: undefined, skills: undefined,
                      })}>
                {t.label}
                <span className="seg-n">{t.n.toLocaleString()}</span>
              </button>
            ))}
          </div>

          {stats && stats.attempts > 0 ? (
            <div className="cover">
              <div className="cover-head">
                <span>Bank covered</span>
                <span className="cover-n">
                  {totals.seen.toLocaleString()}
                  <span className="dim"> / {totals.all.toLocaleString()}</span>
                  {stats.accuracy !== null ? ` · ${Math.round(stats.accuracy * 100)}%` : ''}
                </span>
              </div>
              <span className="meter">
                <span className="meter-fill"
                      style={{ width: `${Math.max(totals.all ? (totals.seen / totals.all) * 100 : 0, 0.4)}%` }} />
              </span>
            </div>
          ) : null}

          <div className="side-block">
            <div className="side-head">
              <h2 className="side-t">Topics</h2>
              {ticked.size ? (
                <button className="link" onClick={() => commit(new Set())}>Clear</button>
              ) : null}
            </div>
            {SECTIONS.filter((s) => !value.section || s.key === value.section).map((sec) => (
              <div key={sec.key} className="tree">
                {!value.section ? <span className="tree-cap">{sec.label}</span> : null}
                {domains.filter((d) => d.section === sec.key).map((d) => {
                  const on = d.skills.filter((s) => ticked.has(s.code)).length
                  const state = on === 0 ? 'off' : on === d.skills.length ? 'on' : 'mixed'
                  const isOpen = open.has(d.code)
                  return (
                    <div key={d.code} className="tree-d">
                      <div className="tree-row">
                        <button className={`box is-${state}`} role="checkbox"
                                aria-checked={state === 'mixed' ? 'mixed' : state === 'on'}
                                aria-label={d.name}
                                onClick={() => tickDomain(d)}>
                          <Icon name="check" size={12} strokeWidth={3} />
                        </button>
                        <button className="tree-name" onClick={() => expand(d.code)}
                                aria-expanded={isOpen}>
                          <span className="tree-label">{d.name}</span>
                          <span className="tree-n">{d.n}</span>
                          <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} size={15} />
                        </button>
                      </div>
                      <span className="tree-meter"
                            title={`${d.seen} of ${d.n} done`}>
                        <span style={{ transform: `scaleX(${d.n ? d.seen / d.n : 0})` }} />
                      </span>
                      {isOpen ? (
                        <div className="tree-skills">
                          {d.skills.map((s) => (
                            <button key={s.code}
                                    className={ticked.has(s.code) ? 'skill on' : 'skill'}
                                    role="checkbox" aria-checked={ticked.has(s.code)}
                                    onClick={() => tickSkill(s.code)}>
                              <span className={`box sm is-${ticked.has(s.code) ? 'on' : 'off'}`}>
                                <Icon name="check" size={10} strokeWidth={3.2} />
                              </span>
                              <span className="tree-label">{s.name}</span>
                              <span className="tree-n">{s.seen}/{s.n}</span>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>

          <div className="side-block">
            <h2 className="side-t">Difficulty</h2>
            <div className="chips">
              {DIFFICULTIES.map((d) => (
                <button key={d.key}
                        className={value.difficulties?.includes(d.key) ? `chip on d-${d.key}` : `chip d-${d.key}`}
                        aria-pressed={value.difficulties?.includes(d.key) ?? false}
                        onClick={() => set({ difficulties: toggle(value.difficulties, d.key) })}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div className="side-block">
            <h2 className="side-t">Status</h2>
            <div className="chips">
              {STATUSES.map((st) => (
                <button key={st.key}
                        className={value.statuses?.includes(st.key) ? 'chip on' : 'chip'}
                        aria-pressed={value.statuses?.includes(st.key) ?? false}
                        onClick={() => set({ statuses: toggle(value.statuses, st.key) })}>
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {totals.live ? (
            <label className="excl side-block">
              <input type="checkbox"
                     checked={value.excludeLive ?? false}
                     onChange={(e) => set({ excludeLive: e.target.checked || undefined })} />
              Skip questions from official practice tests
            </label>
          ) : null}

          <div className="side-block side-fb">
            <FeedbackLink label="Found a bug? Send feedback" ctx={{ context: 'home' }} />
          </div>

          <div className="side-block phone-only">
            <h2 className="side-t">Practice mode</h2>
            <div className="chips">
              {SIZES.map((n) => (
                <button key={n}
                        className={(value.size ?? 0) === n ? 'chip on' : 'chip'}
                        aria-pressed={(value.size ?? 0) === n}
                        onClick={() => set({ size: n || undefined })}>
                  {n ? `Set of ${n}` : 'Open'}
                </button>
              ))}
            </div>
            {value.size ? (
              <div className="chips pace-chips">
                <button className={!value.speed ? 'chip on' : 'chip'}
                        onClick={() => set({ speed: undefined })}>Untimed</button>
                {SPEEDS.map((x) => (
                  <button key={x} className={value.speed === x ? 'chip on' : 'chip'}
                          onClick={() => set({ speed: x })}>{x}x</button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="sheet-foot">
            <button className="btn primary sheet-go" onClick={() => setShowFilters(false)}>
              {loading ? 'Counting…' : `Show ${count.toLocaleString()} question${count === 1 ? '' : 's'}`}
            </button>
          </div>
        </aside>

        <main className="qmain">
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
                        <span className="meter">
                          <span className="meter-fill"
                                style={{ width: `${Math.max((s.answered / Math.max(s.total, 1)) * 100, 0.4)}%` }} />
                        </span>
                      </span>
                      <span className="setcard-go">Resume</span>
                    </button>
                    <span className="setcard-side">
                      <button className="setcard-drop" onClick={() => onAbandon(s.id)}
                              title="Discard this set">
                        <Icon name="trash" size={15} strokeWidth={2} />
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <header className="qhead">
            <div>
              <h1 className="qtitle">Question bank</h1>
              <p className="qsub">
                {loading ? 'Counting…' : (
                  <>
                    <strong>{count.toLocaleString()}</strong> question{count === 1 ? '' : 's'}
                    {listStats.done ? (
                      <> · {listStats.done.toLocaleString()} done
                        · {Math.round((listStats.right / listStats.done) * 100)}% correct</>
                    ) : null}
                  </>
                )}
              </p>
            </div>
            <label className="qsearch">
              <Icon name="search" size={16} />
              <input type="search" value={query} placeholder="Find by question ID"
                     aria-label="Find a question by its College Board ID"
                     autoCapitalize="off" autoCorrect="off" spellCheck={false}
                     onChange={(e) => setQuery(e.target.value)} />
            </label>
            <button className="btn filters-btn" onClick={() => setShowFilters((x) => !x)}
                    aria-expanded={showFilters} aria-controls="filters">
              <Icon name="sliders" size={16} />
              Filters{activeFilters ? ` · ${activeFilters}` : ''}
            </button>
          </header>

          <div className="qbar">
            <button className={hideDone ? 'toggle on' : 'toggle'} role="switch"
                    aria-checked={hideDone}
                    onClick={() => set({ statuses: hideDone ? undefined : ['unseen'] })}>
              <span className="toggle-track"><span className="toggle-dot" /></span>
              Hide done
            </button>

            <select className="sel order-sel" aria-label="Order" value={order}
                    onChange={(e) => onOrder(e.target.value as Order)}>
              {ORDERS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>

            <div className="seg sm" role="group" aria-label="Order">
              {ORDERS.map((o) => (
                <button key={o.key} aria-pressed={order === o.key}
                        className={order === o.key ? 'seg-b on' : 'seg-b'}
                        // Random again reshuffles, so it doubles as a shuffle button.
                        onClick={() => onOrder(o.key)}>
                  {o.label}
                </button>
              ))}
            </div>

            <div className="qbar-go">
              <select className="sel desk-only" aria-label="Set size" value={value.size ?? 0}
                      onChange={(e) => set({ size: Number(e.target.value) || undefined })}>
                {SIZES.map((n) => (
                  <option key={n} value={n}>{n ? `Set of ${n}` : 'Open practice'}</option>
                ))}
              </select>
              {value.size ? (
                <select className="sel desk-only" aria-label="Pace" value={value.speed ?? 0}
                        onChange={(e) => set({ speed: Number(e.target.value) || undefined })}>
                  <option value={0}>Untimed</option>
                  {SPEEDS.map((x) => <option key={x} value={x}>{x}x time</option>)}
                </select>
              ) : null}
              <button className="btn primary" disabled={!count || loading} onClick={start}>
                {value.size
                  ? `Start ${Math.min(value.size, count)}${value.speed ? ` · ${formatClock(plannedSeconds)}` : ''}`
                  : listStats.done && listStats.firstNew > 0 ? 'Continue' : 'Start'}
                <Icon name="arrow-right" size={16} strokeWidth={2.2} />
              </button>
            </div>
          </div>

          {needle && !loading ? (
            <p className="qfound">
              {rows.length
                ? `${rows.length} match${rows.length === 1 ? '' : 'es'} for "${query.trim()}"`
                : `No question with ID "${query.trim()}"${activeFilters || value.section ? ' in these filters' : ''}.`}
              {!rows.length && (activeFilters || value.section) ? (
                <button className="link" onClick={() => onChange({})}>Search all questions</button>
              ) : null}
              <button className="link" onClick={() => setQuery('')}>Clear search</button>
            </p>
          ) : null}

          {rows.length ? (
            <div className="qlist">
              <div className="qrow qrow-head" aria-hidden="true">
                <span>#</span><span>Skill</span><span>Level</span><span>Status</span>
                <span className="qrow-when">Last</span>
              </div>
              {rows.map(([q, i]) => {
                const st = cellState(q)
                return (
                  <button key={q.id} className="qrow" onClick={() => onOpen(i)}>
                    <span className="qrow-n">{i + 1}</span>
                    <span className="qrow-skill">
                      <span className="qrow-s">{q.skill_name}</span>
                      <span className="qrow-d">
                        {q.domain_name}
                        {q.cb_id ? <span className="qid">{q.cb_id}</span> : null}
                      </span>
                    </span>
                    <span><span className={`lvl d-${q.difficulty}`}>
                      {DIFFICULTIES.find((d) => d.key === q.difficulty)?.label}
                    </span></span>
                    <span className={`qstat is-${st}`}>
                      <i className="qdot" />
                      {STATE_LABEL[st]}{st === 'retry' ? ' · retry' : ''}
                      {q.flagged ? <BookmarkFilled size={14} className="qflag" /> : null}
                    </span>
                    <span className="qrow-when">{ago(q.answered_at)}</span>
                  </button>
                )
              })}
            </div>
          ) : !loading && !needle ? (
            <div className="qempty">
              <p>No questions match these filters.</p>
              <button className="btn" onClick={() => onChange({ section: value.section })}>
                Clear filters
              </button>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  )
}
