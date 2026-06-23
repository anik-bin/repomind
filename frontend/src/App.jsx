import { useState } from 'react'
import './index.css'
import { RepoConnector } from './components/RepoConnector'
import { ChatPage } from './pages/ChatPage'

export default function App() {
  const [repoId, setRepoId] = useState(null)
  const [repoUrl, setRepoUrl] = useState('')

  function handleConnected(id, url) {
    setRepoId(id)
    setRepoUrl(url)
  }

  function handleDisconnect() {
    setRepoId(null)
    setRepoUrl('')
  }

  if (!repoId) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100">
        <RepoConnector onConnected={handleConnected} />
      </div>
    )
  }

  return (
    <ChatPage
      repoId={repoId}
      repoUrl={repoUrl}
      onDisconnect={handleDisconnect}
    />
  )
}
