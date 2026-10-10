/**
 * "Practise similar": questions solved the same way as this one.
 *
 * College Board's skills are too coarse for that, so every question carries a
 * finer process type from public/process-types.json (built by
 * scripts/process_types.py). The file holds only question ids and our own type
 * names, no question text.
 */
import type { SetItem } from '../types'

export interface ProcessType { label: string; how: string }
export interface ProcessTypes {
  /** skill code -> type key -> name and one-line method */
  types: Record<string, Record<string, ProcessType>>
  /** College Board question id -> "skill.key" */
  q: Record<string, string>
}

let loading: Promise<ProcessTypes | null> | null = null

/** One fetch per page load; null if the file is missing, so the UI just hides. */
export function loadProcessTypes(): Promise<ProcessTypes | null> {
  loading ??= fetch('/process-types.json')
    .then((r) => (r.ok ? r.json() as Promise<ProcessTypes> : null))
    .catch(() => null)
  return loading
}

export function typeOf(cbId: string | null | undefined, pt: ProcessTypes): ProcessType | null {
  const ref = cbId ? pt.q[cbId] : undefined
  if (!ref) return null
  const dot = ref.lastIndexOf('.')
  return pt.types[ref.slice(0, dot)]?.[ref.slice(dot + 1)] ?? null
}

/** Below this many others of the same type, fall back to the whole skill. */
const MIN_SAME_TYPE = 3

/**
 * Up to `n` questions like `item`: same process type, never itself. Unseen
 * first, then ones last answered wrong, then the rest; closest score band
 * within each.
 */
export function similarTo(item: Pick<SetItem, 'id' | 'cb_id' | 'skill' | 'band'>,
                          pool: SetItem[], pt: ProcessTypes, n = 10): SetItem[] {
  const ref = item.cb_id ? pt.q[item.cb_id] : undefined
  const others = pool.filter((p) => p.id !== item.id)
  let same = ref ? others.filter((p) => p.cb_id && pt.q[p.cb_id] === ref) : []
  if (same.length < MIN_SAME_TYPE) same = others.filter((p) => p.skill === item.skill)
  const status = (p: SetItem) => (p.last_correct === null ? 0 : p.last_correct ? 2 : 1)
  const gap = (p: SetItem) => Math.abs((p.band ?? 4) - (item.band ?? 4))
  return [...same]
    .sort((a, b) => status(a) - status(b) || gap(a) - gap(b))
    .slice(0, n)
}
