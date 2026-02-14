import { useAuth } from '@/contexts/AuthContext'

export function HomePage() {
  const { user, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-display font-semibold text-primary">FlareRead</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {user?.photoURL && (
              <img
                src={user.photoURL}
                alt=""
                className="w-8 h-8 rounded-full"
                referrerPolicy="no-referrer"
              />
            )}
            <span className="text-ui-sm text-muted-foreground font-body">
              {user?.displayName}
            </span>
          </div>
          <button
            onClick={signOut}
            className="text-ui-sm text-muted-foreground hover:text-foreground font-body transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>
      <main className="p-6">
        <p className="text-muted-foreground font-body">Your library will appear here.</p>
      </main>
    </div>
  )
}
