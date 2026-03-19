import { useEffect, useMemo, useState } from 'react'
import { useAccounts } from '../hooks/useAccounts'
import { useWallets } from '../hooks/useWallets'
import { useBudgets } from '../hooks/useBudgets'
import { useTransactions } from '../hooks/useTransactions'
import { useAllocations } from '../hooks/useAllocations'
import { accountTransfersService } from '../services'
import { Wallet, TrendingUp, Plus, ArrowRight, DollarSign, Target, Activity, Lightbulb } from 'lucide-react'
import { formatCOP } from '../lib/currency'
import { IconGlyph } from '../lib/icons'
import { DashboardSkeleton } from './RouteSkeletons'

export default function Dashboard({ setPage, setSelectedAccount, accountId: selectedAccountId }) {
  const { accounts, loading: accountsLoading, error: accountsError } = useAccounts()

  // Asumir primera cuenta para mostrar datos
  const accountId = selectedAccountId || (accounts.length > 0 ? accounts[0].id : null)

  const { wallets, loading: walletsLoading } = useWallets(accountId)
  const { budgets, loading: budgetsLoading } = useBudgets(accountId)
  const { transactions, loading: transactionsLoading } = useTransactions(accountId)
  const { allocations, loading: allocationsLoading } = useAllocations(accountId)
  const [recentTransfers, setRecentTransfers] = useState([])
  const [transfersLoading, setTransfersLoading] = useState(false)

  useEffect(() => {
    const loadRecentTransfers = async () => {
      if (!accountId) {
        setRecentTransfers([])
        return
      }

      setTransfersLoading(true)
      const { data, error } = await accountTransfersService.getRecent(200)

      if (error) {
        setRecentTransfers([])
        setTransfersLoading(false)
        return
      }

      const accountTransfers = (data || []).filter(transfer =>
        transfer.from_account_id === accountId || transfer.to_account_id === accountId
      )
      setRecentTransfers(accountTransfers)
      setTransfersLoading(false)
    }

    loadRecentTransfers()
  }, [accountId])

  const walletNameById = useMemo(() => {
    const map = {}
    wallets.forEach(wallet => {
      map[wallet.id] = wallet.name
    })
    return map
  }, [wallets])

  if (accountsLoading || walletsLoading || budgetsLoading || transactionsLoading || allocationsLoading || transfersLoading) {
    return <DashboardSkeleton />
  }

  if (accountsError) return <div className="min-h-[60vh] flex items-center justify-center text-destructive">Error: {accountsError.message}</div>

  // Calcular total balance
  const totalBalance = wallets.reduce((sum, wallet) => sum + wallet.balance, 0)

  // Calcular monthly spending (gastos del mes actual + asignaciones a presupuesto)
  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()
  const monthlyExpenseTransactions = transactions
    .filter(t => t.type === 'expense' && new Date(t.created_at).getMonth() === currentMonth && new Date(t.created_at).getFullYear() === currentYear)
    .reduce((sum, t) => sum + t.amount, 0)
  const monthlyBudgetAllocations = allocations
    .filter(a => new Date(a.created_at).getMonth() === currentMonth && new Date(a.created_at).getFullYear() === currentYear)
    .reduce((sum, a) => sum + a.amount, 0)
  const monthlySpending = monthlyExpenseTransactions + monthlyBudgetAllocations
  const globalRemaining = totalBalance - monthlySpending

  // Calcular progreso de budgets (asumiendo allocations como spent)
  const budgetProgress = budgets.map(budget => {
    const spent = allocations
      .filter(a => a.budget_id === budget.id)
      .reduce((sum, a) => sum + a.amount, 0)
    return { ...budget, spent, progress: budget.target > 0 ? (spent / budget.target) * 100 : 0 }
  })

  const getWalletName = (walletId, fallback = 'Billetera') => walletNameById[walletId] || fallback

  const transactionEvents = transactions.map(transaction => {
    const typeLabel = transaction.type === 'transfer'
      ? 'Transferencia'
      : transaction.type === 'income'
        ? 'Ingreso'
        : 'Gasto'

    return {
      id: `transaction-${transaction.id}`,
      date: transaction.created_at,
      type: 'transaction',
      title: typeLabel,
      subtitle: transaction.type === 'transfer'
        ? `De ${getWalletName(transaction.from_wallet)} a ${getWalletName(transaction.to_wallet)}`
        : `Wallet: ${getWalletName(transaction.from_wallet || transaction.to_wallet)}`,
      amount: transaction.amount,
      amountStyle: transaction.type === 'expense' ? 'text-destructive' : 'text-primary',
      amountPrefix: transaction.type === 'expense' ? '-' : '+',
    }
  })

  const transferEvents = recentTransfers.map(transfer => {
    const isIncoming = transfer.to_account_id === accountId
    return {
      id: `account-transfer-${transfer.id}`,
      date: transfer.created_at,
      type: 'account_transfer',
      title: 'Aporte entre cuentas',
      subtitle: `${getWalletName(transfer.from_wallet_id, 'Billetera origen')} -> ${getWalletName(transfer.to_wallet_id, 'Billetera destino')}`,
      amount: transfer.amount,
      amountStyle: isIncoming ? 'text-primary' : 'text-destructive',
      amountPrefix: isIncoming ? '+' : '-',
    }
  })

  const allocationEvents = allocations.map(allocation => ({
    id: `allocation-${allocation.id}`,
    date: allocation.created_at,
    type: 'allocation',
    title: 'Asignación a presupuesto',
    subtitle: `${allocation.wallets?.name || 'Billetera'} -> ${allocation.budgets?.name || 'Presupuesto'}`,
    amount: allocation.amount,
    amountStyle: 'text-primary',
    amountPrefix: '-',
  }))

  const recentActivity = [...transactionEvents, ...transferEvents, ...allocationEvents]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 20)

  return (
    <div className="w-full">
      {/* Header */}
      <div className="bg-card border border-border rounded-xl px-4 py-5 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground lg:text-2xl">Budget App</h1>
              <p className="text-sm text-muted-foreground">Dashboard Financiero</p>
            </div>
          </div>
          <button
            onClick={() => { if (accountId) { setSelectedAccount(accountId); setPage('wallets') } }}
            className="w-full sm:w-auto bg-primary text-primary-foreground px-4 py-2.5 rounded-lg flex items-center justify-center space-x-2 hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Mover entre billeteras</span>
          </button>
        </div>
      </div>

      <div className="px-4 py-6 sm:px-6 lg:grid lg:grid-cols-3 lg:gap-6">
        {/* Contenido principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tarjetas de resumen */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-card border border-border p-6 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Balance total</p>
                  <p className="text-2xl font-bold text-foreground">{formatCOP(totalBalance)}</p>
                </div>
                <div className="w-12 h-12 bg-primary/15 rounded-full flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-primary" />
                </div>
              </div>
            </div>
            <div className="bg-card border border-border p-6 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Gasto mensual</p>
                  <p className="text-2xl font-bold text-foreground">{formatCOP(monthlySpending)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Incluye gastos y asignaciones a presupuestos</p>
                </div>
                <div className="w-12 h-12 bg-destructive/15 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-destructive" />
                </div>
              </div>
            </div>
            <div className="bg-card border border-border p-6 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Restante global</p>
                  <p className={`text-2xl font-bold ${globalRemaining >= 0 ? 'text-primary' : 'text-destructive'}`}>
                    {formatCOP(globalRemaining)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Balance total - gasto mensual</p>
                </div>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${globalRemaining >= 0 ? 'bg-primary/15' : 'bg-destructive/15'}`}>
                  <Target className={`w-6 h-6 ${globalRemaining >= 0 ? 'text-primary' : 'text-destructive'}`} />
                </div>
              </div>
            </div>
          </div>

          {/* Wallets */}
          <div className="bg-card border border-border p-6 rounded-xl">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h2 className="text-lg font-semibold text-foreground">Billeteras</h2>
              <button
                onClick={() => { if (accountId) { setSelectedAccount(accountId); setPage('wallets') } }}
                className="text-primary text-sm flex items-center space-x-1 hover:text-primary/80 shrink-0"
              >
                <span>Ver todas</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-[300px] overflow-y-auto pr-1 space-y-3">
              {wallets.length > 0 ? wallets.slice(0, 12).map(wallet => (
                <div key={wallet.id} className="flex items-center justify-between gap-3 p-3 bg-muted/60 rounded-lg border border-border/60">
                  <div className="flex items-center space-x-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <IconGlyph value={wallet.icon} fallback="wallet" className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="font-medium text-foreground">{wallet.name}</p>
                      <p className="text-sm text-muted-foreground">{formatCOP(wallet.balance)}</p>
                    </div>
                  </div>
                  <Wallet className="w-5 h-5 text-muted-foreground" />
                </div>
              )) : <p className="text-muted-foreground text-center py-4">No tienes billeteras aún. Crea una nueva.</p>}
            </div>
          </div>

          {/* Actividad Reciente */}
          <div className="bg-card border border-border p-6 rounded-xl">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h2 className="text-lg font-semibold text-foreground">Actividad Reciente</h2>
              <button
                onClick={() => { if (accountId) { setSelectedAccount(accountId); setPage('wallets') } }}
                className="text-primary text-sm flex items-center space-x-1 hover:text-primary/80 shrink-0"
              >
                <span>Ver todas</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            {/* Mobile: lista */}
            <div className="lg:hidden max-h-[360px] overflow-y-auto pr-1 space-y-3">
              {recentActivity.length > 0 ? recentActivity.map(event => (
                <div key={event.id} className="flex items-center justify-between gap-2 p-3 bg-muted/60 rounded-lg border border-border/60">
                  <div className="flex items-center space-x-3">
                    <Activity className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-foreground">{event.title}</p>
                      <p className="text-sm text-muted-foreground">{event.subtitle}</p>
                      <p className="text-xs text-muted-foreground">{new Date(event.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <p className={`font-medium ${event.amountStyle}`}>
                    {event.amountPrefix}{formatCOP(event.amount)}
                  </p>
                </div>
              )) : <p className="text-muted-foreground text-center py-4">No hay actividad reciente.</p>}
            </div>
            {/* Desktop: tabla */}
            <div className="hidden lg:block max-h-[360px] overflow-y-auto pr-1">
              {recentActivity.length > 0 ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 font-medium text-muted-foreground">Tipo</th>
                      <th className="text-left py-2 font-medium text-muted-foreground">Fecha</th>
                      <th className="text-right py-2 font-medium text-muted-foreground">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentActivity.map(event => (
                      <tr key={event.id} className="border-b border-border/70">
                        <td className="py-3">
                          <div className="flex items-center space-x-2">
                            <Activity className="w-4 h-4 text-muted-foreground" />
                            <span>{event.title}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{event.subtitle}</p>
                        </td>
                        <td className="py-3 text-muted-foreground">{new Date(event.date).toLocaleDateString()}</td>
                        <td className={`py-3 text-right font-medium ${event.amountStyle}`}>
                          {event.amountPrefix}{formatCOP(event.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <p className="text-muted-foreground text-center py-4">No hay actividad reciente.</p>}
            </div>
          </div>
        </div>

        {/* Columna derecha */}
        <div className="space-y-6 mt-6 lg:mt-0">
          {/* Quick Actions */}
          <div className="bg-card border border-border p-6 rounded-xl">
            <h3 className="text-lg font-semibold text-foreground mb-4">Acciones rápidas</h3>
            <div className="space-y-3">
              <button
                onClick={() => { if (accountId) { setSelectedAccount(accountId); setPage('wallets') } }}
                className="w-full bg-primary text-primary-foreground px-4 py-3 rounded-lg flex items-center justify-center space-x-2 hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Nueva billetera</span>
              </button>
              <button
                onClick={() => { if (accountId) { setSelectedAccount(accountId); setPage('budgets') } }}
                className="w-full bg-secondary text-secondary-foreground px-4 py-3 rounded-lg flex items-center justify-center space-x-2 hover:bg-secondary/80 transition-colors border border-border"
              >
                <Plus className="w-4 h-4" />
                <span>Nuevo presupuesto</span>
              </button>
            </div>
          </div>

          {/* Budgets */}
          <div className="bg-card border border-border p-6 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Presupuestos</h3>
              <button
                onClick={() => { if (accountId) { setSelectedAccount(accountId); setPage('budgets') } }}
                className="text-primary text-sm flex items-center space-x-1 hover:text-primary/80"
              >
                <span>Ver todas</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              {budgetProgress.length > 0 ? budgetProgress.slice(0, 3).map(budget => (
                <div key={budget.id} className="p-3 bg-muted/60 rounded-lg border border-border/60">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <IconGlyph value={budget.icon} fallback="piggy-bank" className="h-5 w-5" />
                      </span>
                      <p className="font-medium text-foreground">{budget.name}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">{formatCOP(budget.spent)} / {formatCOP(budget.target)}</p>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full"
                      style={{ width: `${Math.min(budget.progress, 100)}%` }}
                    ></div>
                  </div>
                </div>
              )) : <p className="text-muted-foreground text-center py-4">No tienes presupuestos aún. Crea uno nuevo.</p>}
            </div>
          </div>

          {/* Tip Financiero */}
          <div className="bg-accent/60 border border-border p-6 rounded-xl">
            <div className="flex items-start space-x-3">
              <Lightbulb className="w-6 h-6 text-primary mt-1" />
              <div>
                <h3 className="font-semibold text-foreground mb-2">Tip Financiero</h3>
                <p className="text-sm text-muted-foreground">Recuerda revisar tus gastos mensuales para mantener un presupuesto saludable. ¡Sigue ahorrando!</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
