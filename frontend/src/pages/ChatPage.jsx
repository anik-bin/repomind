import { useState, useEffect, useRef } from 'react'
import { useSSE } from '../hooks/useSSE'
import { ChatWindow } from '../components/ChatWindow'

export function ChatPage({ repoId, repoUrl, onDisconnect }) {
  const [messages, setMessages] = useState([])
  const { ask, answer, citations, loading, error, reset } = useSSE(repoId)

  // When streaming finishes, commit the answer to the message list
  const wasLoadingRef = useRef(false)
  useEffect(() => {
    if (wasLoadingRef.current && !loading && answer) {
      setMessages(prev => [...prev, { role: 'assistant', content: answer, citations }])
      reset()
    }
    wasLoadingRef.current = loading
  }, [loading, answer, citations, reset])

  function handleSubmit(question) {
    setMessages(prev => [...prev, { role: 'user', content: question, citations: [] }])
    ask(question)
  }

  const repoName = repoUrl.replace('https://github.com/', '')

  return (
    <div className="flex flex-col h-screen bg-gray-950">
      {/* Topbar */}
      <header className="flex items-center justify-between border-b border-gray-800 px-5 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-white font-semibold text-sm">RepoMind</span>
          <span className="text-gray-600 text-xs">·</span>
          <span className="text-indigo-400 text-xs font-mono truncate max-w-[260px]">{repoName}</span>
        </div>
        <button
          onClick={onDisconnect}
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          Change repo
        </button>
      </header>

      {/* Chat area — takes all remaining height */}
      <div className="flex-1 overflow-hidden">
        <ChatWindow
          messages={messages}
          streamingAnswer={loading ? answer : ''}
          loading={loading}
          error={error}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  )
}
