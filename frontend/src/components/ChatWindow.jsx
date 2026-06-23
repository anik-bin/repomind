import { useState, useRef, useEffect } from 'react'
import { MessageBubble } from './MessageBubble'

export function ChatWindow({ messages, streamingAnswer, loading, error, onSubmit }) {
  const [input, setInput] = useState('')
  const bottomRef = useRef(null)

  // Auto-scroll as tokens arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingAnswer])

  function handleSubmit(e) {
    e.preventDefault()
    const q = input.trim()
    if (!q || loading) return
    setInput('')
    onSubmit(q)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-2">
            <p className="text-gray-400 text-sm">Ask anything about this codebase.</p>
            <p className="text-gray-600 text-xs">Answers are grounded in the actual source code.</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble
            key={i}
            role={msg.role}
            content={msg.content}
            citations={msg.citations}
          />
        ))}

        {/* Live streaming bubble */}
        {loading && streamingAnswer && (
          <MessageBubble
            role="assistant"
            content={streamingAnswer}
            citations={[]}
            streaming
          />
        )}

        {/* Thinking indicator before first token */}
        {loading && !streamingAnswer && (
          <div className="flex items-start gap-2">
            <div className="bg-gray-800 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 items-center">
              {[0, 150, 300].map(delay => (
                <span
                  key={delay}
                  className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="text-red-400 text-sm bg-red-950 border border-red-800 rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="border-t border-gray-800 px-4 py-4">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask a question about this repo…"
            disabled={loading}
            className="flex-1 bg-gray-800 border border-gray-700 text-gray-100
                       placeholder-gray-500 rounded-xl px-4 py-2.5 text-sm
                       focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500
                       disabled:opacity-50 transition-colors"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed
                       text-white rounded-xl px-4 py-2.5 text-sm font-medium transition-colors shrink-0"
          >
            {loading ? 'Thinking…' : 'Ask'}
          </button>
        </form>
      </div>
    </div>
  )
}
