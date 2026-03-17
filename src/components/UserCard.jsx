import { LogOut } from 'lucide-react'

export default function UserCard({ user, onLogout }) {
  const getInitials = (email) => {
    if (!email) return 'U'
    return email.split('@')[0].substring(0, 2).toUpperCase()
  }

  return (
    <div className="p-4 border-t bg-gray-50 shrink-0">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
          <span className="text-gray-600 font-bold">{getInitials(user?.email)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {user?.email || 'Usuario'}
          </p>
          <p className="text-xs text-gray-500 truncate">
            {user?.email || 'usuario@ejemplo.com'}
          </p>
        </div>
        <button
          onClick={onLogout}
          aria-label="Cerrar sesión"
          className="p-2 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <LogOut className="w-4 h-4 text-gray-600" />
        </button>
      </div>
    </div>
  )
}
