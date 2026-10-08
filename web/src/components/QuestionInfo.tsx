/**
 * Info button in the practice top bar: College Board ID, difficulty and score
 * band, out of the way until asked for. They used to sit beside Mark for
 * Review, which crowded the one control you actually press mid-question.
 */
import { useEffect, useRef, useState } from 'react'
import { Icon } from './Icon'
import type { Question } from '../types'

const DIFFICULTY_LABEL: Record<string, string> = { E: 'Easy', M: 'Medium', H: 'Hard' }

export function QuestionInfo({ question }: { question: Question }) {
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)

  // Close on a new question, a click anywhere else, or Escape.
  useEffect(() => { setOpen(false) }, [question.id])
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown, true)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="qinfo" ref={wrap}>
      <button className={open ? 'tool on' : 'tool'} aria-label="Question info"
              aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span className="tool-glyphs"><Icon name="info" size={21} /></span>
        <span className="tool-label"><span className="tool-text">Info</span></span>
      </button>
      {open ? (
        <div className="qinfo-pop" role="dialog" aria-label="Question info">
          {question.cb_id ? (
            <div className="qinfo-row">
              <span className="qinfo-k">ID</span>
              {/* College Board's own id: the string videos and forums quote. */}
              <QuestionId id={question.cb_id} />
            </div>
          ) : null}
          <div className="qinfo-row">
            <span className="qinfo-k">Difficulty</span>
            <span className={`q-diff d-${question.difficulty}`}>
              {DIFFICULTY_LABEL[question.difficulty] ?? question.difficulty}
            </span>
          </div>
          {question.band ? (
            <div className="qinfo-row">
              <span className="qinfo-k">Score band</span>
              <span className="qinfo-v">{question.band} <span className="dim">of 7</span></span>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function QuestionId({ id }: { id: string }) {
  const [copied, setCopied] = useState(false)
  const search = `https://www.youtube.com/results?search_query=${encodeURIComponent(id)}`
  return (
    <span className="q-id">
      <button className="q-id-copy" title="Copy question ID"
              onClick={() => {
                navigator.clipboard?.writeText(id).then(() => {
                  setCopied(true)
                  setTimeout(() => setCopied(false), 1400)
                }).catch(() => {})
              }}>
        {copied ? 'Copied' : id}
      </button>
      <a className="q-id-yt" href={search} target="_blank" rel="noreferrer"
         title="Search YouTube for this question">YouTube</a>
    </span>
  )
}
