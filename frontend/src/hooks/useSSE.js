import { useState, useRef, useCallback } from 'react'
import { openChatStream } from '../api'

/**
 * Custom hook for consuming the /api/chat/stream/ SSE endpoint.
 *
 * Usage:
 *   const { ask, answer, citations, loading, error } = useSSE(repoId, { onComplete })
 *
 * onComplete(finalAnswer, finalCitations) is called exactly once when the
 * stream finishes successfully, with the locally-accumulated answer — not
 * from React state, so there are no concurrent-render timing issues.
 */
export function useSSE(repoId, { onComplete } = {}) {
  const [answer, setAnswer] = useState('')
  const [citations, setCitations] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const readerRef = useRef(null)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  const reset = useCallback(() => {
    setAnswer('')
    setCitations([])
    setError(null)
    setLoading(false)
  }, [])

  const ask = useCallback(async (question) => {
    reset()
    setLoading(true)

    let reader
    try {
      reader = await openChatStream(repoId, question)
      readerRef.current = reader
    } catch (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    const decoder = new TextDecoder()
    let buffer = ''
    // Track answer locally so onComplete always gets the correct final value,
    // regardless of React render timing.
    let localAnswer = ''
    let localCitations = []

    try {
      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const events = buffer.split('\n\n')
        buffer = events.pop()

        for (const raw of events) {
          const parsed = _parseSSEEvent(raw)
          if (!parsed) continue

          if (parsed.event === 'token') {
            const text = parsed.data?.text ?? ''
            localAnswer += text
            setAnswer(prev => prev + text)
          } else if (parsed.event === 'citations') {
            localCitations = parsed.data?.citations ?? []
            setCitations(localCitations)
          } else if (parsed.event === 'done') {
            onCompleteRef.current?.(localAnswer, localCitations)
            setLoading(false)
          } else if (parsed.event === 'error') {
            setError(parsed.data?.error ?? 'Unknown error')
            setLoading(false)
          }
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [repoId, reset])

  return { ask, answer, citations, loading, error, reset }
}

function _parseSSEEvent(raw) {
  const lines = raw.trim().split('\n')
  let event = 'message'
  let dataStr = ''

  for (const line of lines) {
    if (line.startsWith('event: ')) event = line.slice(7).trim()
    else if (line.startsWith('data: ')) dataStr = line.slice(6).trim()
  }

  if (!dataStr) return null

  try {
    return { event, data: JSON.parse(dataStr) }
  } catch {
    return null
  }
}
