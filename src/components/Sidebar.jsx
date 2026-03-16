import { LayoutDashboard, Wallet, ArrowLeftRight, Target, PieChart, Users } from 'lucide-react'
import UserCard from './UserCard'

export default function Sidebar({ isOpen, onClose, currentPage, setPage, setSelectedAccount, signOut, accounts, isMobile, user }) {
  const items = [
    { name: 'Dashboard', page: 'dashboard', icon: LayoutDashboard },
    { name: 'Wallets', page: 'wallets', icon: Wallet },
    { name: 'Transactions', page: 'transactions', icon: ArrowLeftRight },
    { name: 'Budgets', page: 'budgets', icon: Target },
    { name: 'Allocations', page: 'allocations', icon: PieChart },
    { name: 'Accounts', page: 'accounts', icon: Users },
  ]

  const handleItemClick = (page) => {
    setPage(page)
    if (page === 'dashboard' || page === 'accounts') {
      setSelectedAccount(null)
    } else {
      setSelectedAccount(accounts.length > 0 ? accounts[0].id : null)
    }
    onClose()
  }

  return (
    <>
      {isMobile && isOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={onClose}></div>}
      <div className={`h-full w-64 bg-white border-r ${isMobile ? 'fixed left-0 top-0 z-50 transform transition-transform' : 'static'} ${isMobile && isOpen ? 'translate-x-0' : isMobile && !isOpen ? '-translate-x-full' : ''}`}>
        <div className="p-4 border-b">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <h2 className="text-lg font-bold">Budget App</h2>
          </div>
        </div>
        <nav className="p-4 space-y-2">
          {items.map(item => {
            const Icon = item.icon
            return (
              <button
                key={item.page}
                onClick={() => handleItemClick(item.page)}
                className={`w-full flex items-center space-x-3 p-3 rounded-lg text-left ${currentPage === item.page ? 'bg-blue-100 text-blue-600' : 'text-gray-700 hover:bg-gray-100'}`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.name}</span>
              </button>
            )
          })}
        </nav>
        <UserCard user={user} onLogout={signOut} />
      </div>
    </>
  )
}