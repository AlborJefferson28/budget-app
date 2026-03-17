import { LayoutDashboard, Wallet, ArrowLeftRight, Target, PieChart, Users, Settings } from 'lucide-react'
import UserCard from './UserCard'

export default function Sidebar({ isOpen, onClose, currentPage, setPage, setSelectedAccount, selectedAccount, signOut, accounts, isMobile, user }) {
  const items = [
    { name: 'Dashboard', page: 'dashboard', icon: LayoutDashboard },
    { name: 'Wallets', page: 'wallets', icon: Wallet },
    { name: 'Transactions', page: 'transactions', icon: ArrowLeftRight },
    { name: 'Budgets', page: 'budgets', icon: Target },
    { name: 'Allocations', page: 'allocations', icon: PieChart },
    { name: 'Accounts', page: 'accounts', icon: Users },
    { name: 'Profile & Settings', page: 'profile', icon: Settings },
  ]

  const handleItemClick = (page) => {
    setPage(page)
    const accountScopedPages = ['wallets', 'transactions', 'budgets', 'allocations']

    if (accountScopedPages.includes(page) && !selectedAccount) {
      setSelectedAccount(accounts.length > 0 ? accounts[0].id : null)
    }
    onClose()
  }

  return (
    <>
      {isMobile && isOpen && <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[1px]" onClick={onClose}></div>}
      <aside className={`h-screen w-[17rem] bg-white border-r flex flex-col ${isMobile ? 'fixed left-0 top-0 z-50 transform transition-transform duration-200 ease-out' : 'sticky top-0'} ${isMobile && isOpen ? 'translate-x-0' : isMobile && !isOpen ? '-translate-x-full' : ''}`}>
        <div className="p-4 border-b shrink-0">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <h2 className="text-lg font-bold">Budget App</h2>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {items.map(item => {
            const Icon = item.icon
            return (
              <button
                key={item.page}
                onClick={() => handleItemClick(item.page)}
                className={`w-full flex items-center space-x-3 p-3 rounded-lg text-left text-sm font-medium ${currentPage === item.page ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.name}</span>
              </button>
            )
          })}
        </nav>
        <UserCard user={user} onLogout={signOut} />
      </aside>
    </>
  )
}
