import { getGitHubAuthUrl } from '../api'

export function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{
        background: 'radial-gradient(ellipse at 60% 20%, rgba(234,179,8,0.12) 0%, transparent 60%), radial-gradient(ellipse at 20% 80%, rgba(234,179,8,0.07) 0%, transparent 50%), #000000',
      }}
    >
      {/* Subtle yellow glow ring behind the card */}
      <div className="relative w-full max-w-sm">
        <div
          className="absolute -inset-px rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(234,179,8,0.35) 0%, transparent 50%, rgba(234,179,8,0.1) 100%)',
          }}
        />

        <div
          className="relative rounded-2xl p-8 text-center space-y-6"
          style={{ background: 'rgba(10,10,10,0.95)', border: '1px solid rgba(234,179,8,0.15)' }}
        >
          {/* Logo area */}
          <div className="space-y-3">
            <span
              className="block text-3xl font-bold tracking-tight"
              style={{ color: '#EAB308' }}
            >
              CodeRepo
            </span>
            <p
              className="text-lg font-semibold tracking-wide"
              style={{
                background: 'linear-gradient(90deg, #ffffff 0%, #EAB308 60%, #ffffff 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Explore Repositories Through Conversation
            </p>
            <p className="text-gray-500 text-sm">Ask questions about any GitHub codebase</p>
          </div>

          {/* Divider */}
          <div
            className="h-px w-full"
            style={{ background: 'linear-gradient(to right, transparent, rgba(234,179,8,0.3), transparent)' }}
          />

          {/* Login button — yellow with black text */}
          <a
            href={getGitHubAuthUrl()}
            className="flex items-center justify-center gap-3 w-full rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-150 hover:brightness-110 active:scale-95"
            style={{ background: '#EAB308', color: '#000000' }}
          >
            <GitHubIcon className="w-5 h-5 shrink-0" />
            Login with GitHub
          </a>

          <p className="text-gray-600 text-xs">
            We only request <code className="text-yellow-600/70">read:user</code> scope — no write access.
          </p>
        </div>
      </div>
    </div>
  )
}

function GitHubIcon({ className }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483
           0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466
           -.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832
           .092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688
           -.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004
           1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651
           .64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856
           0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484
           17.522 2 12 2z"
        clipRule="evenodd"
      />
    </svg>
  )
}
