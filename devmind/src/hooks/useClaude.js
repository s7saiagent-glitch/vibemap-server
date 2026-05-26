import { useState, useRef, useCallback } from 'react'

const SYSTEM = `You are DevMind, an expert AI developer companion that thinks like a senior engineer pair-programming with the user.

When answering questions or reviewing code:
- Reason through the problem step by step in your thinking block
- Be specific: reference exact lines, patterns, and failure modes
- Be conversational: pair programming, not documentation
- Auto-detect the programming language when code is pasted
- Keep context from earlier in the conversation

For code review:
- Identify bugs, performance issues, and security problems
- Suggest concrete refactors with justification
- Explain the "why" behind each suggestion

Format responses with markdown: use \`\`\`lang blocks for code, **bold** for key terms, bullet points for lists.`

const API_URL = 'https://api.anthropic.com/v1/messages'

export function useClaude(apiKey) {
  const [thinking, setThinking] = useState('')
  const [answer, setAnswer] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState(null)
  const [phase, setPhase] = useState('idle') // idle | thinking | answering | done
  const abortRef = useRef(null)

  const interrupt = useCallback(() => {
    abortRef.current?.abort()
    setIsStreaming(false)
    setPhase('idle')
  }, [])

  const streamMessage = useCallback(async (messages) => {
    if (!apiKey) {
      setError('No API key — click 🔑 to add your Anthropic key.')
      return { thinking: '', answer: '' }
    }

    abortRef.current?.abort()
    abortRef.current = new AbortController()

    setThinking('')
    setAnswer('')
    setError(null)
    setIsStreaming(true)
    setPhase('thinking')

    let thinkingAcc = ''
    let answerAcc = ''

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-request-from-browser': 'true',
          'anthropic-beta': 'interleaved-thinking-2025-05-14',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 16000,
          thinking: { type: 'enabled', budget_tokens: 10000 },
          stream: true,
          system: SYSTEM,
          messages: messages.slice(-20), // keep last 20 messages in context
        }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || `API error ${res.status}`)
      }

      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let buf = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (raw === '[DONE]') continue

          let ev
          try { ev = JSON.parse(raw) } catch { continue }

          if (ev.type === 'content_block_start') {
            if (ev.content_block?.type === 'text') setPhase('answering')
          } else if (ev.type === 'content_block_delta') {
            const { delta } = ev
            if (delta?.type === 'thinking_delta' && delta.thinking) {
              thinkingAcc += delta.thinking
              setThinking(thinkingAcc)
            } else if (delta?.type === 'text_delta' && delta.text) {
              answerAcc += delta.text
              setAnswer(answerAcc)
            }
          }
        }
      }

      setPhase('done')
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message)
        setPhase('idle')
      }
    } finally {
      setIsStreaming(false)
    }

    return { thinking: thinkingAcc, answer: answerAcc }
  }, [apiKey])

  return { thinking, answer, isStreaming, error, phase, streamMessage, interrupt }
}
