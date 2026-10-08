/**
 * Three cards across the top of Home: streak, estimated score, bank covered.
 * The numbers come from lib/progress.ts; this only draws them.
 */
import { score, streak, UNLOCK_AFTER, type HistoryRow } from '../lib/progress'

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

interface Props {
  history: HistoryRow[]
  covered: number
  total: number
  accuracy: number | null
}

/** Tiny line chart of the total over time. Inline SVG, no chart library. */
function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null
  const w = 220, h = 46, pad = 4
  const lo = Math.min(...values), hi = Math.max(...values)
  const span = Math.max(hi - lo, 40)
  const x = (i: number) => pad + (i * (w - 2 * pad)) / (values.length - 1)
  const y = (v: number) => h - pad - ((v - lo) / span) * (h - 2 * pad)
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const area = `${d} L${x(values.length - 1).toFixed(1)},${h} L${x(0).toFixed(1)},${h} Z`
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <path d={area} className="spark-area" />
      <path d={d} className="spark-line" />
      <circle cx={x(values.length - 1)} cy={y(values[values.length - 1])} r="3.2" className="spark-dot" />
    </svg>
  )
}

export function ProgressStrip({ history, covered, total, accuracy }: Props) {
  const now = new Date()
  // A few thousand rows at most: cheap enough to recompute every render.
  const st = streak(history, now)
  const sc = score(history, now)
  const trend = sc.series.filter((p) => p.total !== null).map((p) => p.total as number).slice(-30)

  const need = (n: number) => Math.max(0, UNLOCK_AFTER - n)

  return (
    <section className="pstrip" aria-label="Your progress">
      <div className="pcard pcard-streak">
        <span className="pcard-l">Streak</span>
        <div className="pcard-big">
          <span className={st.current ? 'flame on' : 'flame'} aria-hidden="true">🔥</span>
          {st.current}<span className="pcard-unit">day{st.current === 1 ? '' : 's'}</span>
        </div>
        <div className="days" aria-label="Last seven days">
          {st.last7.map((on, i) => {
            const d = new Date(now); d.setDate(d.getDate() - (6 - i))
            return (
              <span key={i} className={on ? 'day on' : i === 6 ? 'day today' : 'day'}
                    title={d.toLocaleDateString(undefined, { weekday: 'long' })}>
                {DAY_LETTERS[d.getDay()]}
              </span>
            )
          })}
        </div>
        <span className="pcard-sub">
          {st.today
            ? `${st.today} answered today`
            : st.atRisk ? 'Answer one today to keep it going' : 'Answer a question to start one'}
          {st.best > 1 ? ` · best ${st.best}` : ''}
        </span>
      </div>

      <div className="pcard pcard-score">
        <span className="pcard-l" title="Practice estimate from your first try at each question, weighted by difficulty. Not an official SAT score.">
          Estimated score
        </span>
        {sc.total !== null ? (
          <>
            <div className="pcard-big">
              {sc.total}
              {sc.delta7 ? (
                <span className={sc.delta7 > 0 ? 'delta up' : 'delta down'}>
                  {sc.delta7 > 0 ? '▲' : '▼'} {Math.abs(sc.delta7)} this week
                </span>
              ) : null}
            </div>
            {trend.length > 1 ? <Sparkline values={trend} />
              : <span className="pcard-sub">Your trend line starts after a second day of practice.</span>}
          </>
        ) : (
          <div className="pcard-big pcard-locked">—</div>
        )}
        <span className="pcard-sub">
          R&amp;W {sc.rw ?? `🔒 ${need(sc.counted.RW)} to go`} · Math {sc.math ?? `🔒 ${need(sc.counted.MATH)} to go`}
        </span>
      </div>

      <div className="pcard pcard-cover">
        <span className="pcard-l">Bank covered</span>
        <div className="pcard-big">
          {covered.toLocaleString()}<span className="pcard-unit">/ {total.toLocaleString()}</span>
        </div>
        <span className="meter"><span className="meter-fill"
          style={{ width: `${Math.max(total ? (covered / total) * 100 : 0, 0.4)}%` }} /></span>
        <span className="pcard-sub">
          {accuracy !== null ? `${Math.round(accuracy * 100)}% correct` : 'Nothing answered yet'}
        </span>
      </div>
    </section>
  )
}
