import React from 'react'
import { LayoutDashboard, Wallet, Target, PieChart, Users, Settings, Moon, Sun, CircleHelp, Download } from 'lucide-react'
import UserCard from './UserCard'
import { useTheme } from '../contexts/ThemeContext'
import { useRegisterSW } from 'virtual:pwa-register/react'

export default function Sidebar({ isOpen, onClose, currentPage, setPage, setSelectedAccount, selectedAccount, signOut, accounts, isMobile, user }) {
  const { isDark, toggleTheme } = useTheme()
  const { needRefresh, updateServiceWorker, offlineReady } = useRegisterSW({
    onNeedRefresh() {
      updateServiceWorker(true)
    },
  })
  const [deferredPrompt, setDeferredPrompt] = React.useState(null)

  React.useEffect(() => {
    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setDeferredPrompt(null)
    }
  }
  const items = [
    { name: 'Panel', page: 'dashboard', icon: LayoutDashboard },
    { name: 'Billeteras', page: 'wallets', icon: Wallet },
    { name: 'Presupuestos', page: 'budgets', icon: Target },
    { name: 'Asignaciones', page: 'allocations', icon: PieChart },
    { name: 'Cuentas', page: 'accounts', icon: Users },
    { name: 'Perfil y configuración', page: 'profile', icon: Settings },
    { name: 'Ayuda y tutoriales', page: 'help', icon: CircleHelp },
  ]

  const handleItemClick = (page) => {
    setPage(page)
    const accountScopedPages = ['wallets', 'budgets', 'allocations']

    if (accountScopedPages.includes(page) && !selectedAccount) {
      setSelectedAccount(accounts.length > 0 ? accounts[0].id : null)
    }
    onClose()
  }

  return (
    <>
      {isMobile && isOpen && <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[1px]" onClick={onClose}></div>}
      <aside className={`h-dvh w-[17rem] bg-card border-r border-border flex flex-col overflow-hidden ${isMobile ? 'fixed inset-y-0 left-0 z-50 transform transition-transform duration-200 ease-out' : 'sticky top-0'} ${isMobile && isOpen ? 'translate-x-0' : isMobile && !isOpen ? '-translate-x-full' : ''}`}>
        <div className="p-4 border-b border-border shrink-0">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-foreground">Budget App</h2>
          </div>
        </div>
        <nav className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2">
          {items.map(item => {
            const Icon = item.icon
            return (
              <button
                key={item.page}
                onClick={() => handleItemClick(item.page)}
                className={`w-full flex items-center space-x-3 p-3 rounded-lg text-left text-sm font-medium ${currentPage === item.page ? 'bg-primary/15 text-primary' : 'text-foreground hover:bg-accent'}`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.name}</span>
              </button>
            )
          })}
        </nav>
        <div className="px-4 pb-2 space-y-2">
          <button
            onClick={handleInstall}
            disabled={!deferredPrompt}
            className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-4 w-4" />
            Agregar acceso directo
          </button>
          <button
            onClick={toggleTheme}
            className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {isDark ? 'Modo claro' : 'Modo oscuro'}
          </button>
        </div>
        <UserCard user={user} onLogout={signOut} />
      </aside>
    </>
  )
}
