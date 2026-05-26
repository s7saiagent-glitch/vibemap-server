import { useRef, useEffect } from 'react'

function Bubble({ entry }) {
  const isUser = entry.role === 'user'
  return (
    <div className={`flex gap-2 msg-in ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-6 h-6 rounded-full bg-dm-accent/20 border border-dm-accent/30
                        flex items-center justify-center shrink-0 mt-0.5 text-xs">
          ⚡
        </div>
      )}

      <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm font-mono
                       ${isUser
                         ? 'bg-slate-800/70 text-slate-200 rounded-tr-sm'
                         : 'bg-dm-panel   text-slate-300 rounded-tl-sm border border-dm-border'}`}>
        <p className="whitespace-pre-wrap leading-relaxed text-xs">{entry.content}</p>

        {/* Expandable thinking */}
        {entry.thinking && (
          <details className="mt-2">
            <summary className="text-amber-700 text-[10px] cursor-pointer hover:text-dm-think transition-colors select-none">
              View reasoning ({(entry.thinking.length / 1000).toFixed(1)}k chars)
            </summary>
            <p className="mt-1 text-slate-600 text-[10px] font-mono whitespace-pre-wrap leading-relaxed
                           max-h-28 overflow-y-auto">
              {entry.thinking}
            </p>
          </details>
        )}
      </div>

      {isUser && (
        <div className="w-6 h-6 rounded-full bg-slate-700/40 border border-dm-border
                        flex items-center justify-center shrink-0 mt-0.5 text-xs">
          👤
        </div>
      )}
    </div>
  )
}

export default function SessionThread({ history }) {
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history])

  if (!history.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-8 text-center">
        <div className="text-5xl mb-3 opacity-10">⚡</div>
        <p className="text-slate-700 text-sm font-mono">No conversation yet</p>
        <p className="text-slate-800 text-xs mt-1">Ask anything above to start</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {history.map(e => <Bubble key={e.id} entry={e} />)}
      <div ref={endRef} />
    </div>
  )
}
