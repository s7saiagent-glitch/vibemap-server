import { useState, useRef, useEffect } from 'react'

const PHASES = [
  { label: 'Analyzing',  icon: '🔍' },
  { label: 'Exploring',  icon: '🧠' },
  { label: 'Composing',  icon: '⚗️' },
  { label: 'Done',       icon: '✓'  },
]

export default function ThinkingPanel({ thinking, isStreaming, phase }) {
  const [open, setOpen] = useState(true)
  const bodyRef = useRef(null)

  useEffect(() => {
    if (open && bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight
    }
  }, [thinking, open])

  if (!thinking && phase === 'idle') return null

  const phaseIdx =
    phase === 'thinking'  ? 1 :
    phase === 'answering' ? 2 :
    phase === 'done'      ? 3 : 0

  const charCount = thinking.length

  return (
    <div className="border border-dm-think/20 rounded-xl overflow-hidden bg-amber-950/10 stream-fade">
      {/* Header / toggle */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-4 py-3 hover:bg-amber-900/10 transition-colors"
      >
        <span className="text-dm-think text-sm">🧠</span>
        <span className="text-amber-300 text-sm font-mono font-medium flex-1 text-left">
          DevMind is thinking
        </span>

        {(phase === 'thinking') && (
          <span className="flex gap-1 items-center mr-2">
            <span className="dot-blink bg-dm-think" />
            <span className="dot-blink bg-dm-think" />
            <span className="dot-blink bg-dm-think" />
          </span>
        )}

        {charCount > 0 && (
          <span className="text-amber-700 text-xs font-mono mr-2">
            {charCount.toLocaleString()} chars
          </span>
        )}
        <span className="text-slate-600 text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {/* Phase bar */}
      {open && (
        <div className="flex items-center gap-1 px-4 py-2 border-t border-amber-900/20 flex-wrap">
          {PHASES.map((p, i) => (
            <span
              key={i}
              className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full transition-colors
                ${i < phaseIdx  ? 'text-dm-ok  bg-green-900/20' :
                  i === phaseIdx ? 'text-amber-300 bg-amber-900/30 animate-pulse' :
                                   'text-slate-700'}`}
            >
              {p.icon}
              <span className="hidden sm:inline">{p.label}</span>
            </span>
          ))}
        </div>
      )}

      {/* Thinking content */}
      {open && (
        <div
          ref={bodyRef}
          className="px-4 py-3 max-h-60 overflow-y-auto border-t border-amber-900/20
                     text-xs font-mono text-slate-500 leading-relaxed whitespace-pre-wrap"
        >
          {thinking || <span className="text-slate-700 italic">Gathering thoughts…</span>}
        </div>
      )}
    </div>
  )
}
