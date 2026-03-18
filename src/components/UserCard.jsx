import { LogOut } from 'lucide-react'

export default function UserCard({ user, onLogout }) {
  const getInitials = (email) => {
    if (!email) return 'U'
    return email.split('@')[0].substring(0, 2).toUpperCase()
  }

  return (
    <div className="p-4 border-t border-border bg-muted/30 shrink-0">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
          <span className="text-muted-foreground font-bold">{getInitials(user?.email)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {user?.email || 'Usuario'}
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
