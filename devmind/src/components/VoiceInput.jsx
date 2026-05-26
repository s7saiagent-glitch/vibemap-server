import { useState } from 'react'
import WaveformAnimation from './WaveformAnimation'

export default function VoiceInput({
  isListening,
  isSpeaking,
  isStreaming,
  transcript,
  isVoiceSupported,
  onStartListening,
  onStopListening,
  onSubmit,
  onStopSpeaking,
}) {
  const [text, setText] = useState('')

  const handleMicClick = () => {
    if (isSpeaking) { onStopSpeaking(); return }
    if (isListening) { onStopListening(); return }
    onStartListening((final) => {
      if (final) onSubmit(final)
    })
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      if (text.trim()) { onSubmit(text.trim()); setText('') }
    }
  }

  const handleSend = () => {
    if (text.trim()) { onSubmit(text.trim()); setText('') }
  }

  const inputValue = isListening ? transcript : text

  let statusText, statusColor
  if (isSpeaking)     { statusText = '◆ Speaking — click mic to stop'; statusColor = 'text-dm-accent' }
  else if (isListening) { statusText = '● Listening…';                   statusColor = 'text-dm-ok' }
  else if (isStreaming) { statusText = '◌ Thinking…';                    statusColor = 'text-dm-think' }
  else                  { statusText = 'Ready';                           statusColor = 'text-slate-700' }

  return (
    <div className="flex flex-col gap-3">
      {/* Waveform */}
      <WaveformAnimation active={isListening} />

      {/* Status */}
      <p className={`text-center text-xs font-mono ${statusColor} h-4`}>{statusText}</p>

      {/* Mic button */}
      {isVoiceSupported && (
        <div className="flex justify-center">
          <button
            onClick={handleMicClick}
            aria-label={isListening ? 'Stop listening' : 'Start voice input'}
            className={`w-14 h-14 rounded-full border-2 flex items-center justify-center text-xl
                        transition-all duration-200 focus:outline-none
                        ${isListening
                          ? 'border-dm-ok bg-green-900/20'
                          : isSpeaking
                          ? 'border-dm-accent bg-cyan-900/20 animate-pulseGlow'
                          : 'border-dm-border bg-dm-panel hover:border-slate-500'}`}
          >
            {isSpeaking ? '🔊' : isListening ? '🎙️' : '🎤'}
          </button>
        </div>
      )}

      {/* Text / code input */}
      <div className="relative">
        <textarea
          value={inputValue}
          onChange={e => !isListening && setText(e.target.value)}
          onKeyDown={handleKeyDown}
          readOnly={isListening}
          rows={5}
          placeholder={
            isListening
              ? 'Listening…'
              : 'Ask anything, or paste code here\n(Ctrl+Enter to send)'
          }
          className={`w-full bg-dm-panel border rounded-xl px-4 py-3 text-slate-200 text-sm font-mono
                      resize-none focus:outline-none transition-colors placeholder-slate-700
                      ${isListening
                        ? 'border-dm-ok/40 bg-green-950/20'
                        : 'border-dm-border focus:border-dm-accent/40'}`}
        />
        <span className="absolute bottom-2.5 right-3 text-slate-700 text-xs font-mono select-none">
          Ctrl+↵
        </span>
      </div>

      {/* Send button */}
      <button
        onClick={handleSend}
        disabled={!text.trim() || isStreaming || isListening}
        className="w-full py-3 rounded-xl border font-mono text-sm transition-all duration-200
                   bg-dm-accent/10 hover:bg-dm-accent/20 border-dm-accent/20 hover:border-dm-accent/50
                   text-dm-accent disabled:opacity-25 disabled:cursor-not-allowed"
      >
        {isStreaming ? '⟳  Processing…' : '⚡  Ask DevMind'}
      </button>
    </div>
  )
}
