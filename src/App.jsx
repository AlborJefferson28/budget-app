import { useState, useEffect } from 'react'
import { Menu } from 'lucide-react'
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
import Sidebar from './components/Sidebar'
import { useAccounts } from './hooks/useAccounts'

function App() {
  const { user, loading, signOut } = useAuth()
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
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Cargando...</div>
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
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
          <h2 className="text-lg font-semibold text-slate-900">No account selected</h2>
          <p className="mt-1 text-sm text-slate-500">Select an account to continue.</p>
          <button
            type="button"
            onClick={() => setCurrentPage('accounts')}
            className="mt-4 inline-flex h-10 items-center justify-center rounded-md bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700"
          >
            Go to Accounts
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
      default:
        return <Dashboard setPage={setCurrentPage} setSelectedAccount={setSelectedAccount} accountId={activeAccountId} />
    }
  }

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen)
  const closeSidebar = () => setIsSidebarOpen(false)

  return (
    <div className="min-h-screen bg-gray-50">
      {isMobile && (
        <header className="w-full bg-white border-b px-4 py-3 flex items-center justify-between">
          <button onClick={toggleSidebar} className="p-2 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <Menu className="w-6 h-6 text-gray-700" />
          </button>
          <span className="text-sm font-semibold text-gray-800">Budget App</span>
          <span className="w-10" />
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
          <div className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Current Account Context</p>
            {activeAccount ? (
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{activeAccount.name}</p>
                  <p className="text-xs text-slate-500">
                    {activeAccount.owner_id === user?.id
                      ? (activeAccount.kind === 'shared' ? 'Shared account (Owner)' : 'Personal account')
                      : 'Shared account (Contributor)'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentPage('accounts')}
                  className="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 w-full sm:w-auto"
                >
                  Change account
                </button>
              </div>
            ) : (
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">No account selected.</p>
                <button
                  type="button"
                  onClick={() => setCurrentPage('accounts')}
                  className="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 w-full sm:w-auto"
                >
                  Open accounts
                </button>
              </div>
            )}
          </div>
          {renderPage()}
        </main>
      </div>
    </div>
  )
}

export default App
