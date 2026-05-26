import { useState } from 'react'

export default function ApiKeyModal({ onSave }) {
  const [key, setKey] = useState('')
  const [err, setErr] = useState('')

  const handleSave = () => {
    const k = key.trim()
    if (!k) { setErr('Please enter your API key.'); return }
    if (!k.startsWith('sk-ant-')) { setErr('Key should start with sk-ant-'); return }
    localStorage.setItem('devmind_api_key', k)
    onSave(k)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 bg-dm-card border border-dm-border rounded-2xl p-8 shadow-2xl">

        <div className="flex items-center gap-3 mb-8">
          <span className="text-4xl">⚡</span>
          <div>
            <h1 className="text-xl font-bold text-white font-mono">DevMind</h1>
            <p className="text-slate-500 text-sm">AI Developer Companion</p>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-slate-300 text-sm mb-2 font-mono">
            Anthropic API Key
          </label>
          <input
            type="password"
            value={key}
            onChange={e => { setKey(e.target.value); setErr('') }}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            placeholder="sk-ant-api03-..."
            autoFocus
            className="w-full bg-dm-panel border border-dm-border rounded-xl px-4 py-3 text-slate-100 font-mono text-sm
                       focus:outline-none focus:border-dm-accent transition-colors placeholder-slate-700"
          />
          {err && <p className="text-dm-err text-xs mt-2 font-mono">{err}</p>}
          <p className="text-slate-600 text-xs mt-3">
            Stored only in your browser's localStorage. Never sent anywhere except the Anthropic API.
          </p>
        </div>

        <a
          href="https://console.anthropic.com/settings/keys"
          target="_blank"
          rel="noopener noreferrer"
          className="text-dm-accent text-xs hover:underline block mb-5 font-mono"
        >
          Get your key from console.anthropic.com →
        </a>

        <button
          onClick={handleSave}
          disabled={!key.trim()}
          className="w-full bg-dm-accent hover:bg-cyan-300 disabled:bg-dm-border disabled:text-slate-600
                     text-dm-bg font-bold py-3 rounded-xl transition-colors font-mono"
        >
          Launch DevMind
        </button>
      </div>
    </div>
  )
}
