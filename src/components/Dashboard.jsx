import { useAccounts } from '../hooks/useAccounts'
import { useWallets } from '../hooks/useWallets'
import { useBudgets } from '../hooks/useBudgets'
import { useTransactions } from '../hooks/useTransactions'
import { useAllocations } from '../hooks/useAllocations'
import { Wallet, TrendingUp, Plus, ArrowRight, DollarSign, Target, Activity, Lightbulb } from 'lucide-react'

export default function Dashboard({ setPage, setSelectedAccount }) {
  const { accounts, loading: accountsLoading, error: accountsError } = useAccounts()

  // Asumir primera cuenta para mostrar datos
  const accountId = accounts.length > 0 ? accounts[0].id : null

  const { wallets, loading: walletsLoading } = useWallets(accountId)
  const { budgets, loading: budgetsLoading } = useBudgets(accountId)
  const { transactions, loading: transactionsLoading } = useTransactions(accountId)
  const { allocations, loading: allocationsLoading } = useAllocations(accountId)

  if (accountsLoading || walletsLoading || budgetsLoading || transactionsLoading || allocationsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    )
  }

  if (accountsError) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-red-600">Error: {accountsError.message}</div>

  // Calcular total balance
  const totalBalance = wallets.reduce((sum, wallet) => sum + wallet.balance, 0)

  // Calcular monthly spending (gastos del mes actual)
  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()
  const monthlySpending = transactions
    .filter(t => t.type === 'expense' && new Date(t.created_at).getMonth() === currentMonth && new Date(t.created_at).getFullYear() === currentYear)
    .reduce((sum, t) => sum + t.amount, 0)

  // Calcular progreso de budgets (asumiendo allocations como spent)
  const budgetProgress = budgets.map(budget => {
    const spent = allocations
      .filter(a => a.budget_id === budget.id)
      .reduce((sum, a) => sum + a.amount, 0)
    return { ...budget, spent, progress: budget.target > 0 ? (spent / budget.target) * 100 : 0 }
  })

  // Actividad reciente: últimas 5 transacciones
  const recentActivity = transactions.slice(-5).reverse()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm px-4 py-6 lg:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 lg:text-2xl">Budget App</h1>
              <p className="text-sm text-gray-600">Dashboard Financiero</p>
            </div>
          </div>
          <button
            onClick={() => { if (accountId) { setSelectedAccount(accountId); setPage('transactions') } }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Transacción</span>
          </button>
        </div>
      </div>

      <div className="px-4 py-6 lg:px-6 lg:grid lg:grid-cols-3 lg:gap-6">
        {/* Contenido principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tarjetas de resumen */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Balance</p>
                  <p className="text-2xl font-bold text-gray-900">${totalBalance.toFixed(2)}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Monthly Spending</p>
                  <p className="text-2xl font-bold text-gray-900">${monthlySpending.toFixed(2)}</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Wallets */}
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Wallets</h2>
              <button
                onClick={() => { if (accountId) { setSelectedAccount(accountId); setPage('wallets') } }}
                className="text-blue-600 text-sm flex items-center space-x-1 hover:text-blue-700"
              >
                <span>Ver todas</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              {wallets.length > 0 ? wallets.slice(0, 3).map(wallet => (
                <div key={wallet.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{wallet.icon}</span>
                    <div>
                      <p className="font-medium text-gray-900">{wallet.name}</p>
                      <p className="text-sm text-gray-600">${wallet.balance.toFixed(2)}</p>
                    </div>
                  </div>
                  <Wallet className="w-5 h-5 text-gray-400" />
                </div>
              )) : <p className="text-gray-500 text-center py-4">No tienes wallets aún. Crea una nueva.</p>}
            </div>
          </div>

          {/* Actividad Reciente */}
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Actividad Reciente</h2>
              <button
                onClick={() => { if (accountId) { setSelectedAccount(accountId); setPage('transactions') } }}
                className="text-blue-600 text-sm flex items-center space-x-1 hover:text-blue-700"
              >
                <span>Ver todas</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            {/* Mobile: lista */}
            <div className="lg:hidden space-y-3">
              {recentActivity.length > 0 ? recentActivity.map(transaction => (
                <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Activity className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">
                        {transaction.type === 'transfer' ? 'Transferencia' : transaction.type === 'income' ? 'Ingreso' : 'Gasto'}
                      </p>
                      <p className="text-sm text-gray-600">{new Date(transaction.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <p className={`font-medium ${transaction.type === 'expense' ? 'text-red-600' : 'text-green-600'}`}>
                    {transaction.type === 'expense' ? '-' : '+'}${transaction.amount.toFixed(2)}
                  </p>
                </div>
              )) : <p className="text-gray-500 text-center py-4">No hay actividad reciente.</p>}
            </div>
            {/* Desktop: tabla */}
            <div className="hidden lg:block">
              {recentActivity.length > 0 ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 font-medium text-gray-700">Tipo</th>
                      <th className="text-left py-2 font-medium text-gray-700">Fecha</th>
                      <th className="text-right py-2 font-medium text-gray-700">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentActivity.map(transaction => (
                      <tr key={transaction.id} className="border-b">
                        <td className="py-3">
                          <div className="flex items-center space-x-2">
                            <Activity className="w-4 h-4 text-gray-400" />
                            <span>{transaction.type === 'transfer' ? 'Transferencia' : transaction.type === 'income' ? 'Ingreso' : 'Gasto'}</span>
                          </div>
                        </td>
                        <td className="py-3 text-gray-600">{new Date(transaction.created_at).toLocaleDateString()}</td>
                        <td className={`py-3 text-right font-medium ${transaction.type === 'expense' ? 'text-red-600' : 'text-green-600'}`}>
                          {transaction.type === 'expense' ? '-' : '+'}${transaction.amount.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <p className="text-gray-500 text-center py-4">No hay actividad reciente.</p>}
            </div>
          </div>
        </div>

        {/* Columna derecha */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button
                onClick={() => { if (accountId) { setSelectedAccount(accountId); setPage('wallets') } }}
                className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg flex items-center justify-center space-x-2 hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Nueva Wallet</span>
              </button>
              <button
                onClick={() => { if (accountId) { setSelectedAccount(accountId); setPage('budgets') } }}
                className="w-full bg-green-600 text-white px-4 py-3 rounded-lg flex items-center justify-center space-x-2 hover:bg-green-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Nuevo Budget</span>
              </button>
            </div>
          </div>

          {/* Budgets */}
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Budgets</h3>
              <button
                onClick={() => { if (accountId) { setSelectedAccount(accountId); setPage('budgets') } }}
                className="text-blue-600 text-sm flex items-center space-x-1 hover:text-blue-700"
              >
                <span>Ver todas</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              {budgetProgress.length > 0 ? budgetProgress.slice(0, 3).map(budget => (
                <div key={budget.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{budget.icon}</span>
                      <p className="font-medium text-gray-900">{budget.name}</p>
                    </div>
                    <p className="text-sm text-gray-600">${budget.spent.toFixed(2)} / ${budget.target.toFixed(2)}</p>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${Math.min(budget.progress, 100)}%` }}
                    ></div>
                  </div>
                </div>
              )) : <p className="text-gray-500 text-center py-4">No tienes budgets aún. Crea uno nuevo.</p>}
            </div>
          </div>

          {/* Tip Financiero */}
          <div className="bg-blue-50 p-6 rounded-xl">
            <div className="flex items-start space-x-3">
              <Lightbulb className="w-6 h-6 text-blue-600 mt-1" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Tip Financiero</h3>
                <p className="text-sm text-gray-700">Recuerda revisar tus gastos mensuales para mantener un presupuesto saludable. ¡Sigue ahorrando!</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}