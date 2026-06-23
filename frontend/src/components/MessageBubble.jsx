import { CitationCard } from './CitationCard'

export function MessageBubble({ role, content, citations = [], streaming = false }) {
  const isUser = role === 'user'

  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} gap-2`}>
      <div
        className={`
          max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap
          ${isUser
            ? 'bg-indigo-600 text-white rounded-br-sm'
            : 'bg-gray-800 text-gray-100 rounded-bl-sm'}
        `}
      >
        {content}
        {streaming && (
          <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-indigo-400 rounded-sm animate-pulse align-middle" />
        )}
      </div>

      {!isUser && citations.length > 0 && (
        <div className="max-w-[75%] w-full">
          <p className="text-xs text-gray-500 mb-1.5 ml-1">Sources</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {citations.map((c, i) => (
              <CitationCard key={i} citation={c} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
