export default function Header({ apiKey, onChangeKey, onClear, msgCount }) {
  const keyLabel = apiKey
    ? `sk-ant-…${apiKey.slice(-4)}`
    : 'Set API Key'

  return (
    <header className="flex items-center justify-between px-5 py-3.5 border-b border-dm-border shrink-0">
      <div className="flex items-center gap-3">
        <span className="text-2xl">⚡</span>
        <div>
          <h1 className="text-white font-bold font-mono text-base leading-none">DevMind</h1>
          <p className="text-slate-600 text-xs">AI Developer Companion</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {msgCount > 0 && (
          <>
            <span className="text-xs font-mono text-slate-600">
              <span className="text-dm-accent">{msgCount}</span> msgs
            </span>
            <button
              onClick={onClear}
              className="text-xs font-mono text-slate-600 hover:text-dm-err transition-colors"
              title="Clear session"
            >
              ✕ clear
            </button>
          </>
        )}
        <button
          onClick={onChangeKey}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dm-border
                     hover:border-slate-600 text-slate-500 hover:text-slate-300 text-xs font-mono transition-all"
        >
          <span>🔑</span>
          <span>{keyLabel}</span>
        </button>
      </div>
    </header>
  )
}
