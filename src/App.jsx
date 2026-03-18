import { useState, useEffect } from 'react'
import { CircleHelp, Menu, Moon, Sun } from 'lucide-react'
import { useAuth } from './contexts/AuthContext'
import Login from './components/Auth/Login'
import Signup from './components/Auth/Signup'
import Dashboard from './components/Dashboard'
import Accounts from './components/Accounts'
import Wallets from './components/Wallets'
import Transactions from './components/Transactions'
import Budgets from './components/Budgets'
import Allocations from './components/Allocations'
import ProfileSettings from './components/ProfileSettings'
import HelpCenter from './components/HelpCenter'
import Sidebar from './components/Sidebar'
import OnboardingTips from './components/OnboardingTips'
import { useAccounts } from './hooks/useAccounts'
import { useTheme } from './contexts/ThemeContext'
import { Skeleton } from './components/ui/Skeleton'

function App() {
  const { user, loading, signOut } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const [authMode, setAuthMode] = useState('login') // 'login' or 'signup'
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [selectedAccount, setSelectedAccount] = useState(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024)
  const { accounts } = useAccounts()

  const activeAccount = accounts.find(account => account.id === selectedAccount) || accounts[0] || null
  const activeAccountId = activeAccount?.id || null

  useEffect(() => {
    if (selectedAccount && !accounts.some(account => account.id === selectedAccount)) {
      setSelectedAccount(accounts[0]?.id || null)
    }
  }, [accounts, selectedAccount])

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <Skeleton className="h-14 w-full rounded-xl" />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[272px_1fr]">
            <Skeleton className="h-[78vh] rounded-xl" />
            <div className="space-y-4">
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-64 rounded-xl" />
              <Skeleton className="h-64 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return authMode === 'login' ? (
      <Login onSwitchToSignup={() => setAuthMode('signup')} />
    ) : (
      <Signup onSwitchToLogin={() => setAuthMode('login')} />
    )
  }

  const renderPage = () => {
    const accountScopedPages = ['wallets', 'transactions', 'budgets', 'allocations']

    if (accountScopedPages.includes(currentPage) && !activeAccountId) {
      return (
        <div className="rounded-xl border border-border bg-card p-6 text-center">
          <h2 className="text-lg font-semibold text-foreground">No hay una cuenta seleccionada</h2>
          <p className="mt-1 text-sm text-muted-foreground">Selecciona una cuenta para continuar.</p>
          <button
            type="button"
            onClick={() => setCurrentPage('accounts')}
            className="mt-4 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Ir a Cuentas
          </button>
        </div>
      )
    }

    switch (currentPage) {
      case 'dashboard':
        return <Dashboard setPage={setCurrentPage} setSelectedAccount={setSelectedAccount} accountId={activeAccountId} />
      case 'accounts':
        return <Accounts setPage={setCurrentPage} setSelectedAccount={setSelectedAccount} />
      case 'wallets':
        return <Wallets accountId={activeAccountId} setPage={setCurrentPage} />
      case 'transactions':
        return <Transactions accountId={activeAccountId} setPage={setCurrentPage} />
      case 'budgets':
        return <Budgets accountId={activeAccountId} setPage={setCurrentPage} />
      case 'allocations':
        return <Allocations accountId={activeAccountId} setPage={setCurrentPage} />
      case 'profile':
        return <ProfileSettings />
      case 'help':
        return <HelpCenter setPage={setCurrentPage} />
      default:
        return <Dashboard setPage={setCurrentPage} setSelectedAccount={setSelectedAccount} accountId={activeAccountId} />
    }
  }

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen)
  const closeSidebar = () => setIsSidebarOpen(false)

  return (
    <div className="min-h-screen bg-background text-foreground">
      {isMobile && (
        <header className="w-full bg-card border-b border-border px-4 py-3 flex items-center justify-between">
          <button onClick={toggleSidebar} className="p-2 rounded-md hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring">
            <Menu className="w-6 h-6 text-foreground" />
          </button>
          <span className="text-sm font-semibold text-foreground">Budget App</span>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-md hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            {isDark ? <Sun className="h-5 w-5 text-foreground" /> : <Moon className="h-5 w-5 text-foreground" />}
          </button>
        </header>
      )}
      <div className="flex min-h-[calc(100vh-57px)] lg:min-h-screen">
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={closeSidebar}
          currentPage={currentPage}
          setPage={setCurrentPage}
          setSelectedAccount={setSelectedAccount}
          selectedAccount={activeAccountId}
          signOut={signOut}
          accounts={accounts}
          isMobile={isMobile}
          user={user}
        />
        <main className="flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
          <div className="mb-4 rounded-xl border border-border bg-card px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contexto actual de cuenta</p>
            {activeAccount ? (
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">{activeAccount.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {activeAccount.owner_id === user?.id
                      ? (activeAccount.kind === 'shared' ? 'Cuenta compartida (Propietario)' : 'Cuenta personal')
                      : 'Cuenta compartida (Colaborador)'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentPage('accounts')}
                  className="inline-flex h-9 items-center justify-center rounded-md border border-border px-3 text-xs font-medium text-foreground hover:bg-accent w-full sm:w-auto"
                >
                  Cambiar cuenta
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage('help')}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border px-3 text-xs font-medium text-foreground hover:bg-accent w-full sm:w-auto"
                >
                  <CircleHelp className="h-3.5 w-3.5" />
                  Ayuda
                </button>
              </div>
            ) : (
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">No hay una cuenta seleccionada.</p>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                  <button
                    type="button"
                    onClick={() => setCurrentPage('accounts')}
                    className="inline-flex h-9 items-center justify-center rounded-md border border-border px-3 text-xs font-medium text-foreground hover:bg-accent w-full sm:w-auto"
                  >
                    Abrir cuentas
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage('help')}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border px-3 text-xs font-medium text-foreground hover:bg-accent w-full sm:w-auto"
                  >
                    <CircleHelp className="h-3.5 w-3.5" />
                    Ayuda
                  </button>
                </div>
              </div>
            )}
          </div>
          {renderPage()}
        </main>
      </div>
      <OnboardingTips setPage={setCurrentPage} />
    </div>
  )
}

export default App
