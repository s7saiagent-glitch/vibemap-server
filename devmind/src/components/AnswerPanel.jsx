import { useRef, useEffect } from 'react'
import CodeBlock from './CodeBlock'

// ── Inline formatter ────────────────────────────────────────────────────────
function Inline({ text }) {
  const parts = []
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*\n]+\*)/g
  let last = 0, m

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(<span key={last}>{text.slice(last, m.index)}</span>)
    const tok = m[0]
    if (tok.startsWith('**'))
      parts.push(<strong key={m.index} className="text-white font-semibold">{tok.slice(2, -2)}</strong>)
    else if (tok.startsWith('`'))
      parts.push(<code key={m.index} className="bg-dm-panel text-dm-accent px-1.5 py-0.5 rounded text-[0.8em] font-mono">{tok.slice(1, -1)}</code>)
    else
      parts.push(<em key={m.index} className="italic text-slate-400">{tok.slice(1, -1)}</em>)
    last = m.index + tok.length
  }
  if (last < text.length) parts.push(<span key={last}>{text.slice(last)}</span>)
  return <>{parts}</>
}

// ── Block renderer ───────────────────────────────────────────────────────────
function TextBlock({ content }) {
  return (
    <div className="space-y-1">
      {content.split('\n').map((line, i) => {
        if (/^### /.test(line)) return (
          <p key={i} className="text-sm font-semibold text-slate-100 mt-3 mb-1">
            <Inline text={line.slice(4)} />
          </p>
        )
        if (/^## /.test(line)) return (
          <p key={i} className="text-base font-semibold text-white mt-4 mb-1">
            <Inline text={line.slice(3)} />
          </p>
        )
        if (/^# /.test(line)) return (
          <p key={i} className="text-lg font-bold text-white mt-4 mb-2">
            <Inline text={line.slice(2)} />
          </p>
        )
        if (/^[-*] /.test(line)) return (
          <div key={i} className="flex gap-2">
            <span className="text-dm-accent mt-0.5 shrink-0 text-xs">▸</span>
            <span className="text-slate-300 text-sm"><Inline text={line.slice(2)} /></span>
          </div>
        )
        if (/^\d+\. /.test(line)) {
          const [num, ...rest] = line.split('. ')
          return (
            <div key={i} className="flex gap-2">
              <span className="text-dm-accent text-sm shrink-0 font-mono w-5 text-right">{num}.</span>
              <span className="text-slate-300 text-sm"><Inline text={rest.join('. ')} /></span>
            </div>
          )
        }
        if (/^-{3,}$/.test(line.trim())) return <hr key={i} className="border-dm-border my-3" />
        if (!line.trim()) return <div key={i} className="h-1.5" />
        return (
          <p key={i} className="text-slate-300 text-sm leading-relaxed">
            <Inline text={line} />
          </p>
        )
      })}
    </div>
  )
}

// ── Markdown splitter ────────────────────────────────────────────────────────
function parseMarkdown(text) {
  const parts = []
  const re = /```(\w*)\n?([\s\S]*?)```/g
  let last = 0, m

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ type: 'text', content: text.slice(last, m.index) })
    parts.push({ type: 'code', lang: m[1] || '', content: m[2].trimEnd() })
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push({ type: 'text', content: text.slice(last) })
  return parts
}

// ── Main component ───────────────────────────────────────────────────────────
export default function AnswerPanel({ answer, isStreaming, phase, onSpeak, isSpeaking, onStopSpeaking }) {
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current && isStreaming) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [answer, isStreaming])

  if (!answer && phase !== 'answering') return null

  const parts = parseMarkdown(answer)

  return (
    <div className="border border-dm-border rounded-xl overflow-hidden bg-dm-card stream-fade">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-dm-border">
        <div className="flex items-center gap-2">
          <span className="text-dm-accent text-sm">⚡</span>
          <span className="text-dm-accent text-sm font-mono font-medium">DevMind</span>
          {isStreaming && phase === 'answering' && (
            <span className="flex gap-1 ml-1 items-center">
              <span className="dot-blink bg-dm-accent" />
              <span className="dot-blink bg-dm-accent" />
              <span className="dot-blink bg-dm-accent" />
            </span>
          )}
        </div>
        {answer && (
          <button
            onClick={isSpeaking ? onStopSpeaking : () => onSpeak(answer)}
            className={`text-xs font-mono flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors
              ${isSpeaking
                ? 'text-dm-accent bg-cyan-900/30 border border-dm-accent/30'
                : 'text-slate-600 hover:text-slate-300 border border-transparent hover:border-dm-border'}`}
          >
            {isSpeaking ? '🔊 stop' : '🔈 speak'}
          </button>
        )}
      </div>

      {/* Body */}
      <div ref={scrollRef} className="px-5 py-4 max-h-[55vh] overflow-y-auto space-y-1">
        {parts.map((p, i) =>
          p.type === 'code'
            ? <CodeBlock key={i} code={p.content} language={p.lang} />
            : <TextBlock key={i} content={p.content} />
        )}
        {/* Blinking cursor while streaming */}
        {isStreaming && phase === 'answering' && (
          <span className="inline-block w-2 h-[1em] bg-dm-accent animate-pulse ml-0.5 align-middle rounded-sm" />
        )}
      </div>
    </div>
  )
}
