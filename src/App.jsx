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
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard setPage={setCurrentPage} setSelectedAccount={setSelectedAccount} />
      case 'accounts':
        return <Accounts setPage={setCurrentPage} setSelectedAccount={setSelectedAccount} />
      case 'wallets':
        return <Wallets accountId={selectedAccount} setPage={setCurrentPage} />
      case 'transactions':
        return <Transactions accountId={selectedAccount} setPage={setCurrentPage} />
      case 'budgets':
        return <Budgets accountId={selectedAccount} setPage={setCurrentPage} />
      case 'allocations':
        return <Allocations accountId={selectedAccount} setPage={setCurrentPage} />
      default:
        return <Dashboard setPage={setCurrentPage} setSelectedAccount={setSelectedAccount} />
    }
  }

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen)
  const closeSidebar = () => setIsSidebarOpen(false)

  return (
    <div className="min-h-screen bg-gray-50">
      {isMobile && (
        <header className="w-full bg-white border-b px-4 py-3 flex items-center">
          <button onClick={toggleSidebar} className="p-2 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <Menu className="w-6 h-6 text-gray-700" />
          </button>
        </header>
      )}
      <div className="flex">
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={closeSidebar}
          currentPage={currentPage}
          setPage={setCurrentPage}
          setSelectedAccount={setSelectedAccount}
          signOut={signOut}
          accounts={accounts}
          isMobile={isMobile}
          user={user}
        />
        <main className="flex-1 p-6">
          {renderPage()}
        </main>
      </div>
    </div>
  )
}

export default App