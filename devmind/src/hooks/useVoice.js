import { useState, useRef, useCallback, useEffect } from 'react'

export function useVoice() {
  const [isListening, setIsListening]   = useState(false)
  const [isSpeaking, setIsSpeaking]     = useState(false)
  const [transcript, setTranscript]     = useState('')
  const [isSupported, setIsSupported]   = useState(false)

  const recognitionRef   = useRef(null)
  const isListeningRef   = useRef(false)
  const lastTextRef      = useRef('')
  const callbackRef      = useRef(null)

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return
    setIsSupported(true)

    const rec = new SR()
    rec.continuous = false
    rec.interimResults = true
    rec.lang = 'en-US'

    rec.onresult = (e) => {
      let final = '', interim = ''
      for (const r of e.results) {
        if (r.isFinal) final += r[0].transcript
        else interim += r[0].transcript
      }
      const text = final || interim
      lastTextRef.current = text
      setTranscript(text)
    }

    rec.onend = () => {
      isListeningRef.current = false
      setIsListening(false)
      const cb   = callbackRef.current
      const text = lastTextRef.current
      callbackRef.current = null
      lastTextRef.current = ''
      if (cb && text.trim()) cb(text.trim())
    }

    rec.onerror = (e) => {
      if (e.error !== 'aborted') console.warn('Speech recognition error:', e.error)
      isListeningRef.current = false
      setIsListening(false)
    }

    recognitionRef.current = rec
    return () => rec.abort()
  }, [])

  const startListening = useCallback((onFinal) => {
    if (!recognitionRef.current || isListeningRef.current) return
    isListeningRef.current = true
    lastTextRef.current = ''
    callbackRef.current = onFinal ?? null
    setTranscript('')
    try {
      recognitionRef.current.start()
      setIsListening(true)
    } catch {
      isListeningRef.current = false
      setIsListening(false)
    }
  }, [])

  const stopListening = useCallback(() => {
    if (isListeningRef.current) recognitionRef.current?.stop()
  }, [])

  const speak = useCallback((text) => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()

    // Strip markdown for speech
    const clean = text
      .replace(/```[\s\S]*?```/g, 'code block omitted')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/#{1,6} /g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .trim()

    const utt = new SpeechSynthesisUtterance(clean)
    utt.rate = 0.92
    utt.pitch = 1.0
    utt.volume = 1.0

    // Pick a natural English voice
    const voices = window.speechSynthesis.getVoices()
    const pick = voices.find(v =>
      v.lang.startsWith('en') &&
      (v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Alex'))
    )
    if (pick) utt.voice = pick

    utt.onstart = () => setIsSpeaking(true)
    utt.onend   = () => setIsSpeaking(false)
    utt.onerror = () => setIsSpeaking(false)

    window.speechSynthesis.speak(utt)
  }, [])

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel()
    setIsSpeaking(false)
  }, [])

  return { isListening, isSpeaking, transcript, isSupported, startListening, stopListening, speak, stopSpeaking }
}
