export function CitationCard({ citation }) {
  const { file_path, start_line, end_line, github_url } = citation

  const inner = (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-indigo-400 shrink-0">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      </span>
      <div className="min-w-0">
        <p className="text-xs font-mono text-gray-200 truncate">{file_path}</p>
        <p className="text-xs text-gray-500 mt-0.5">
          lines {start_line}–{end_line}
        </p>
      </div>
    </div>
  )

  if (github_url) {
    return (
      <a
        href={github_url}
        target="_blank"
        rel="noreferrer"
        className="block bg-gray-800 border border-gray-700 rounded-lg px-3 py-2
                   hover:border-indigo-500 hover:bg-gray-750 transition-colors"
      >
        {inner}
      </a>
    )
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2">
      {inner}
    </div>
  )
}
