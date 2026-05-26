import { useState } from 'react'

export default function CodeBlock({ code, language }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {/* ignore */}
  }

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-dm-border">
      <div className="flex items-center justify-between px-4 py-1.5 bg-dm-panel border-b border-dm-border">
        <span className="text-xs font-mono text-slate-500">{language || 'code'}</span>
        <button
          onClick={copy}
          className="text-xs font-mono text-slate-500 hover:text-slate-200 transition-colors"
        >
          {copied ? '✓ copied' : 'copy'}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto bg-[#0b0d14] text-sm font-mono text-slate-200 leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  )
}
