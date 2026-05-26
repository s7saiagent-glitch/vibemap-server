import { useState, useCallback, useRef } from 'react'
import ApiKeyModal   from './components/ApiKeyModal'
import Header        from './components/Header'
import VoiceInput    from './components/VoiceInput'
import ThinkingPanel from './components/ThinkingPanel'
import AnswerPanel   from './components/AnswerPanel'
import SessionThread from './components/SessionThread'
import { useClaude } from './hooks/useClaude'
import { useVoice }  from './hooks/useVoice'

const STARTER_PROMPTS = [
  'Review this code for bugs',
  'Explain this error message',
  'Optimize this function',
  'Suggest a refactor',
]

export default function App() {
  const [apiKey, setApiKey]         = useState(() => localStorage.getItem('devmind_api_key') || '')
  const [showModal, setShowModal]   = useState(!localStorage.getItem('devmind_api_key'))
  const [history, setHistory]       = useState([])

  const historyRef = useRef(history)
  historyRef.current = history

  const { thinking, answer, isStreaming, error, phase, streamMessage, interrupt } = useClaude(apiKey)
  const { isListening, isSpeaking, transcript, isSupported, startListening, stopListening, speak, stopSpeaking } = useVoice()

  const handleSubmit = useCallback(async (text, autoSpeak = false) => {
    const trimmed = text?.trim()
    if (!trimmed || isStreaming) return

    const userEntry = { role: 'user', content: trimmed, id: Date.now() }
    setHistory(prev => [...prev, userEntry])

    const msgs = [...historyRef.current, userEntry].map(e => ({
      role:    e.role,
      content: e.content,
    }))

    const { thinking: t, answer: a } = await streamMessage(msgs)

    if (a) {
      setHistory(prev => [...prev, {
        role:     'assistant',
        content:  a,
        thinking: t,
        id:       Date.now() + 1,
      }])
      if (autoSpeak) speak(a)
    }
  }, [isStreaming, streamMessage, speak])

  // Voice input automatically speaks the reply
  const handleVoiceSubmit = useCallback((text) => {
    handleSubmit(text, true)
  }, [handleSubmit])

  const handleSaveKey = (k) => {
    setApiKey(k)
    setShowModal(false)
  }

  const handleClear = () => {
    setHistory([])
    interrupt()
  }

  return (
    <div className="h-screen flex flex-col bg-dm-bg overflow-hidden">
      {showModal && <ApiKeyModal onSave={handleSaveKey} />}

      <Header
        apiKey={apiKey}
        onChangeKey={() => setShowModal(true)}
        onClear={handleClear}
        msgCount={history.length}
      />

      {/* Error banner */}
      {error && (
        <div className="mx-5 mt-3 px-4 py-2.5 bg-red-950/50 border border-dm-err/30 rounded-xl
                        text-dm-err text-xs font-mono shrink-0">
          ⚠ {error}
        </div>
      )}

      {/* Main layout */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* ── Left panel ── */}
        <div className="w-[38%] min-w-[280px] flex flex-col border-r border-dm-border overflow-hidden">

          {/* Voice + text input */}
          <div className="p-4 border-b border-dm-border shrink-0">
            <VoiceInput
              isListening={isListening}
              isSpeaking={isSpeaking}
              isStreaming={isStreaming}
              transcript={transcript}
              isVoiceSupported={isSupported}
              onStartListening={(cb) => startListening(cb)}
              onStopListening={stopListening}
              onSubmit={(t) => handleSubmit(t, false)}
              onStopSpeaking={stopSpeaking}
            />
          </div>

          {/* Session thread */}
          <div className="flex-1 overflow-y-auto p-4 min-h-0">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono text-slate-700 tracking-widest uppercase">
                Session Thread
              </span>
              {isStreaming && (
                <button
                  onClick={interrupt}
                  className="text-xs font-mono text-dm-err/70 hover:text-dm-err border border-dm-err/20
                             hover:border-dm-err/50 px-2 py-0.5 rounded transition-all"
                >
                  ✕ interrupt
                </button>
              )}
            </div>
            <SessionThread history={history} />
          </div>
        </div>

        {/* ── Right panel ── */}
        <div className="flex-1 flex flex-col gap-4 p-5 overflow-y-auto min-h-0">

          <ThinkingPanel
            thinking={thinking}
            isStreaming={isStreaming}
            phase={phase}
          />

          <AnswerPanel
            answer={answer}
            isStreaming={isStreaming}
            phase={phase}
            onSpeak={speak}
            isSpeaking={isSpeaking}
            onStopSpeaking={stopSpeaking}
          />

          {/* Empty state */}
          {!thinking && !answer && !isStreaming && phase === 'idle' && (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-10 min-h-[200px]">
              <div className="text-7xl mb-5 opacity-[0.06]">⚡</div>
              <p className="text-slate-700 font-mono text-sm mb-1">DevMind is ready</p>
              <p className="text-slate-800 text-xs mb-8">Ask a question, paste code, or speak</p>
              <div className="grid grid-cols-2 gap-2 max-w-sm w-full">
                {STARTER_PROMPTS.map(p => (
                  <button
                    key={p}
                    onClick={() => handleSubmit(p)}
                    className="text-xs text-slate-600 hover:text-slate-300 border border-dm-border
                               hover:border-slate-600 p-3 rounded-xl transition-all text-left font-mono"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
