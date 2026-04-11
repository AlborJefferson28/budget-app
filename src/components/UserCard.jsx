import { useEffect, useMemo, useState } from 'react'
import { LogOut } from 'lucide-react'

export default function UserCard({ user, onLogout }) {
  const [imageLoadFailed, setImageLoadFailed] = useState(false)

  const displayName = useMemo(
    () => user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || 'Usuario',
    [user]
  )

  const avatarUrl = useMemo(
    () => user?.user_metadata?.avatar_url || user?.user_metadata?.picture || '',
    [user]
  )

  useEffect(() => {
    setImageLoadFailed(false)
  }, [avatarUrl])

  const getInitials = (nameOrEmail) => {
    const value = (nameOrEmail || '').trim()
    if (!value) return 'U'

    const words = value.split(/\s+/).filter(Boolean)
    if (words.length >= 2) {
      return `${words[0][0]}${words[1][0]}`.toUpperCase()
    }

    if (value.includes('@')) {
      return value.split('@')[0].substring(0, 2).toUpperCase()
    }

    return value.substring(0, 2).toUpperCase()
  }

  return (
    <div className="p-4 border-t border-border bg-muted/30 shrink-0">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
          {avatarUrl && !imageLoadFailed ? (
            <img
              src={avatarUrl}
              alt={`Foto de perfil de ${displayName}`}
              className="h-full w-full rounded-full object-cover"
              referrerPolicy="no-referrer"
              onError={() => setImageLoadFailed(true)}
            />
          ) : (
            <span className="text-muted-foreground font-bold">{getInitials(displayName)}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {displayName}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {user?.email || 'usuario@ejemplo.com'}
          </p>
        </div>
      </div>

      <button
        onClick={onLogout}
        aria-label="Cerrar sesión"
        className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <LogOut className="w-4 h-4" />
        Cerrar sesión
      </button>
    </div>
  )
}
