const BARS = 9
const DURS   = [0.55, 0.45, 0.65, 0.5, 0.7, 0.4, 0.6, 0.5, 0.45]
const DELAYS = [0,  0.1, 0.2, 0.05, 0.3, 0.15, 0.25, 0.1, 0.35]

export default function WaveformAnimation({ active, className = '' }) {
  return (
    <div className={`flex items-center justify-center gap-[4px] h-9 ${className}`}>
      {DURS.map((dur, i) => (
        <div
          key={i}
          className={`rounded-full transition-colors duration-300 ${active ? 'bg-dm-accent' : 'bg-slate-700'}`}
          style={{
            width: '3px',
            height: active ? undefined : '4px',
            '--dur':   `${dur}s`,
            '--delay': `${DELAYS[i]}s`,
            animation: active
              ? `barBounce ${dur}s ease-in-out ${DELAYS[i]}s infinite alternate`
              : 'none',
          }}
        />
      ))}
    </div>
  )
}
