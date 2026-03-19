import { useEffect, useMemo, useState } from 'react'
import { useTransactions } from '../hooks/useTransactions'
import { useWallets } from '../hooks/useWallets'
import { useAccounts } from '../hooks/useAccounts'
import { useAuth } from '../contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Select, SelectContent, SelectEmpty, SelectItem, SelectTrigger, SelectValue } from './ui/Select'
import { Search, Plus, Edit, Trash2, ArrowRightLeft, TrendingUp, TrendingDown } from 'lucide-react'
import { formatCOP, formatCOPInput, formatCOPInputFromRaw, normalizeCOPAmount } from '../lib/currency'
import { accountTransfersService, walletsService } from '../services'
import { IconGlyph } from '../lib/icons'
import { TransactionsSkeleton } from './RouteSkeletons'

const QUICK_AMOUNT_STEPS = [10000, 50000, 100000]

const getErrorMessage = (error, fallback) => {
  if (!error) return fallback
  return error.message || fallback
}

export default function Transactions({ accountId, setPage }) {
  const { user } = useAuth()
  const { accounts } = useAccounts()
  const { transactions, loading, error, createTransaction, updateTransaction, deleteTransaction, refetch: refetchTransactions } = useTransactions(accountId)
  const { wallets, refetch: refetchWallets } = useWallets(accountId)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ from_wallet: '', to_wallet: '', amount: 0, type: 'transfer' })
  const [amountInput, setAmountInput] = useState('0')
  const [editing, setEditing] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState('Todas')
  const [personalSourceWallets, setPersonalSourceWallets] = useState([])
  const [sourceLoading, setSourceLoading] = useState(false)
  const [formError, setFormError] = useState('')
  const [viewingTransaction, setViewingTransaction] = useState(null)
  const [amountAdjustMode, setAmountAdjustMode] = useState('add')

  const activeAccount = useMemo(
    () => accounts.find(account => account.id === accountId) || null,
    [accounts, accountId]
  )
  const isSharedContext = activeAccount?.kind === 'shared' || activeAccount?.owner_id !== user?.id
  const isContributorContext = isSharedContext && activeAccount?.owner_id !== user?.id

  const originWalletOptions = useMemo(() => {
    const activeOptions = wallets.map(wallet => ({
      ...wallet,
      account_name: activeAccount?.name || 'Current account',
      source_type: 'active',
    }))

    const personalOptions = personalSourceWallets.map(wallet => ({
      ...wallet,
      source_type: 'personal',
    }))

    return [...activeOptions, ...personalOptions]
  }, [wallets, personalSourceWallets, activeAccount?.name])

  const destinationWalletOptions = wallets
  const selectedFromWallet = useMemo(
    () => originWalletOptions.find(wallet => wallet.id === formData.from_wallet) || null,
    [originWalletOptions, formData.from_wallet]
  )
  const selectedToWallet = useMemo(
    () => destinationWalletOptions.find(wallet => wallet.id === formData.to_wallet) || null,
    [destinationWalletOptions, formData.to_wallet]
  )
  const previewTransactionAmount = useMemo(
    () => normalizeCOPAmount(amountInput),
    [amountInput]
  )
  const previewAvailableBalance = useMemo(() => {
    if (!selectedFromWallet) return null
    let available = normalizeCOPAmount(selectedFromWallet.balance)
    if (editing && editing.type !== 'income' && editing.from_wallet === selectedFromWallet.id) {
      available += normalizeCOPAmount(editing.amount)
    }
    return available
  }, [selectedFromWallet, editing])

  useEffect(() => {
    if (!showForm) return

    const loadPersonalWallets = async () => {
      if (!isContributorContext) {
        setPersonalSourceWallets([])
        setSourceLoading(false)
        return
      }

      const personalAccounts = accounts.filter(account =>
        account.owner_id === user?.id &&
        account.id !== accountId &&
        account.kind !== 'shared'
      )

      if (personalAccounts.length === 0) {
        setPersonalSourceWallets([])
        setSourceLoading(false)
        return
      }

      setSourceLoading(true)
      const responses = await Promise.all(
        personalAccounts.map(async (account) => {
          const { data, error: walletError } = await walletsService.getByAccount(account.id)
          return { account, data, error: walletError }
        })
      )

      const firstError = responses.find(item => item.error)?.error
      if (firstError) {
        setFormError(firstError.message || 'Could not load personal wallets.')
        setPersonalSourceWallets([])
        setSourceLoading(false)
        return
      }

      const options = responses.flatMap(({ account, data }) =>
        (data || []).map(wallet => ({
          ...wallet,
          account_name: account.name,
        }))
      )

      setPersonalSourceWallets(options)
      setSourceLoading(false)
    }

    loadPersonalWallets()
  }, [showForm, isContributorContext, accounts, user?.id, accountId])

  useEffect(() => {
    if (!showForm || editing) return
    setFormData(prev => ({
      ...prev,
      from_wallet: prev.from_wallet || originWalletOptions[0]?.id || '',
      to_wallet: prev.to_wallet || destinationWalletOptions[0]?.id || '',
    }))
  }, [showForm, editing, originWalletOptions, destinationWalletOptions])

  const closeForm = () => {
    setShowForm(false)
    setEditing(null)
    setFormError('')
    setAmountInput('0')
    setAmountAdjustMode('add')
    setFormData({ from_wallet: '', to_wallet: '', amount: 0, type: 'transfer' })
  }

  const openCreateForm = () => {
    setEditing(null)
    setFormError('')
    setAmountInput('0')
    setAmountAdjustMode('add')
    setFormData({ from_wallet: '', to_wallet: '', amount: 0, type: 'transfer' })
    setShowForm(true)
  }

  const applyAmountQuickDelta = (delta) => {
    const nextValue = Math.max(0, normalizeCOPAmount(amountInput) + delta)
    setAmountInput(formatCOPInput(nextValue))
  }

  const applyAmountStepByMode = (step) => {
    const sign = amountAdjustMode === 'add' ? 1 : -1
    applyAmountQuickDelta(step * sign)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')

    const amount = normalizeCOPAmount(amountInput)
    if (amount <= 0) {
      setFormError('Ingresa un monto válido mayor a 0.')
      return
    }

    const fromWallet = originWalletOptions.find(wallet => wallet.id === formData.from_wallet)
    const toWallet = destinationWalletOptions.find(wallet => wallet.id === formData.to_wallet)

    if (!fromWallet || !toWallet) {
      setFormError('Selecciona wallets válidas de origen y destino.')
      return
    }

    if (formData.type === 'transfer' && fromWallet.id === toWallet.id) {
      setFormError('La billetera origen y destino deben ser diferentes.')
      return
    }

    const requiresFundsValidation = formData.type !== 'income'
    if (requiresFundsValidation) {
      let availableBalance = normalizeCOPAmount(fromWallet.balance)

      if (editing && editing.type !== 'income' && editing.from_wallet === fromWallet.id) {
        // Al editar, se considera que el monto anterior puede liberarse.
        availableBalance += normalizeCOPAmount(editing.amount)
      }

      if (amount > availableBalance) {
        setFormError(`Saldo insuficiente en billetera origen. Disponible: ${formatCOP(availableBalance)}.`)
        return
      }
    }

    if (editing) {
      const { error: updateError } = await updateTransaction(editing.id, { ...formData, amount })
      if (updateError) {
        setFormError(getErrorMessage(updateError, 'No fue posible actualizar la transacción.'))
        return
      }
      setEditing(null)
    } else {
      const isCrossAccountContribution = fromWallet.account_id !== accountId && toWallet.account_id === accountId

      if (isCrossAccountContribution) {
        if (!isContributorContext) {
          setFormError('Solo los contribuyentes pueden aportar fondos desde cuentas personales.')
          return
        }

        const { error: contributionError } = await accountTransfersService.contributeToSharedAccount({
          fromWalletId: fromWallet.id,
          toWalletId: toWallet.id,
          amount,
          note: 'Contribution from Transactions',
        })

        if (contributionError) {
          setFormError(getErrorMessage(contributionError, 'No fue posible procesar el aporte entre cuentas.'))
          return
        }

        await Promise.all([refetchTransactions(), refetchWallets()])
      } else {
        const { error: createError } = await createTransaction({ ...formData, amount })
        if (createError) {
          setFormError(getErrorMessage(createError, 'No fue posible crear la transacción.'))
          return
        }
      }
    }

    closeForm()
  }

  const handleEdit = (transaction) => {
    if (transaction.type === 'transfer') return
    setFormError('')
    setEditing(transaction)
    setFormData({
      from_wallet: transaction.from_wallet || '',
      to_wallet: transaction.to_wallet || '',
      amount: transaction.amount,
      type: transaction.type
    })
    setAmountInput(formatCOPInput(transaction.amount))
    setAmountAdjustMode('add')
    setShowForm(true)
  }

  const handleViewTransaction = (transaction) => {
    setViewingTransaction(transaction)
  }

  const closeViewTransaction = () => {
    setViewingTransaction(null)
  }

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar esta transacción?')) {
      await deleteTransaction(id)
    }
  }

  const getWalletName = (walletId) => {
    if (!walletId) return 'Billetera'
    return wallets.find(wallet => wallet.id === walletId)?.name || 'Billetera'
  }

  const filteredTransactions = transactions.filter(transaction => {
    const search = searchTerm.toLowerCase()
    const fromName = getWalletName(transaction.from_wallet).toLowerCase()
    const toName = getWalletName(transaction.to_wallet).toLowerCase()
    const matchesSearch = transaction.type.toLowerCase().includes(search) ||
      fromName.includes(search) ||
      toName.includes(search)
    const matchesFilter = filter === 'Todas' || transaction.type === filter.toLowerCase()
    return matchesSearch && matchesFilter
  })

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'transfer': return <ArrowRightLeft className="w-5 h-5" />
      case 'income': return <TrendingUp className="w-5 h-5 text-primary" />
      case 'expense': return <TrendingDown className="w-5 h-5 text-destructive" />
      default: return <ArrowRightLeft className="w-5 h-5" />
    }
  }

  const getTransactionColor = (type) => {
    switch (type) {
      case 'income': return 'text-primary'
      case 'expense': return 'text-destructive'
      default: return 'text-primary'
    }
  }

  if (loading) return <TransactionsSkeleton />
  if (error) return <div className="text-destructive">Error: {error.message}</div>

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold">Transacciones</h1>
        <Button onClick={openCreateForm} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Nueva Transacción
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            type="text"
            placeholder="Buscar transacciones..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {['Todas', 'Transferencias', 'Ingresos', 'Gastos'].map((f) => (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f)}
              className="shrink-0"
            >
              {f}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="border-dashed border-2 border-border hover:border-primary/40 transition-colors cursor-pointer" onClick={openCreateForm}>
          <CardContent className="flex flex-col items-center justify-center h-48">
            <Plus className="w-12 h-12 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">Crear nueva transacción</p>
          </CardContent>
        </Card>

        {filteredTransactions.map(transaction => (
          <Card key={transaction.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                {getTransactionIcon(transaction.type)}
                {transaction.type === 'transfer' ? 'Transferencia' : transaction.type === 'income' ? 'Ingreso' : 'Gasto'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                {transaction.type === 'transfer' 
                  ? `De ${getWalletName(transaction.from_wallet)} a ${getWalletName(transaction.to_wallet)}`
                  : `Wallet: ${getWalletName(transaction.from_wallet || transaction.to_wallet)}`
                }
              </p>
              <p className={`text-2xl font-bold mb-2 ${getTransactionColor(transaction.type)}`}>
                {formatCOP(transaction.amount)}
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                {new Date(transaction.created_at).toLocaleDateString()}
              </p>
              <div className="flex flex-wrap gap-2">
                {transaction.type === 'transfer' ? (
                  <Button variant="outline" size="sm" onClick={() => handleViewTransaction(transaction)}>
                    Ver movimiento
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(transaction)}>
                      <Edit className="w-4 h-4 mr-1" />
                      Editar
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(transaction.id)}>
                      <Trash2 className="w-4 h-4 mr-1" />
                      Eliminar
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>{editing ? 'Editar Transacción' : 'Nueva Transacción'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {formError && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {formError}
                  </div>
                )}

                {isContributorContext && personalSourceWallets.length > 0 && (
                  <div className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">
                    Puedes usar wallets personales como origen para aportar a esta cuenta compartida.
                  </div>
                )}

                <Select
                  value={formData.from_wallet}
                  onValueChange={(value) => setFormData({ ...formData, from_wallet: value })}
                  disabled={sourceLoading || originWalletOptions.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar billetera origen" />
                  </SelectTrigger>
                  <SelectContent>
                    {originWalletOptions.length === 0 ? (
                      <SelectEmpty>
                        {sourceLoading ? 'Cargando billeteras...' : 'No hay billeteras disponibles'}
                      </SelectEmpty>
                    ) : (
                      originWalletOptions.map(wallet => (
                        <SelectItem key={wallet.id} value={wallet.id}>
                          <div className="flex items-center gap-2">
                            <IconGlyph value={wallet.icon} fallback="wallet" className="h-4 w-4" />
                            <span>{wallet.name}</span>
                          </div>
                          {wallet.source_type === 'personal' ? ` (Personal: ${wallet.account_name})` : ''}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <Select
                  value={formData.to_wallet}
                  onValueChange={(value) => setFormData({ ...formData, to_wallet: value })}
                  disabled={destinationWalletOptions.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar billetera destino" />
                  </SelectTrigger>
                  <SelectContent>
                    {destinationWalletOptions.length === 0 ? (
                      <SelectEmpty>No hay billeteras disponibles</SelectEmpty>
                    ) : (
                      destinationWalletOptions.map(wallet => (
                        <SelectItem key={wallet.id} value={wallet.id}>
                          <div className="flex items-center gap-2">
                            <IconGlyph value={wallet.icon} fallback="wallet" className="h-4 w-4" />
                            <span>{wallet.name}</span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <Input
                  type="text"
                  numeric
                  placeholder="Monto"
                  value={amountInput}
                  onFocus={() => {
                    if (amountInput === '0') setAmountInput('')
                  }}
                  onChange={(e) => {
                    setAmountInput(formatCOPInputFromRaw(e.target.value))
                  }}
                  onBlur={() => {
                    setAmountInput(formatCOPInput(amountInput))
                  }}
                  required
                />
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Ajuste rápido</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={amountAdjustMode === 'add' ? 'default' : 'outline'}
                      size="sm"
                      className={amountAdjustMode === 'add' ? '' : 'border-primary/40 text-primary hover:bg-primary/10 hover:text-primary'}
                      onClick={() => setAmountAdjustMode('add')}
                    >
                      Sumar
                    </Button>
                    <Button
                      type="button"
                      variant={amountAdjustMode === 'subtract' ? 'destructive' : 'outline'}
                      size="sm"
                      className={amountAdjustMode === 'subtract' ? '' : 'border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive'}
                      onClick={() => setAmountAdjustMode('subtract')}
                    >
                      Restar
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {QUICK_AMOUNT_STEPS.map((quickAmount) => (
                      <Button
                        key={`tx-step-${quickAmount}`}
                        type="button"
                        variant="outline"
                        size="sm"
                        className={`justify-start ${
                          amountAdjustMode === 'add'
                            ? 'border-primary/50 text-primary hover:bg-primary/10 hover:text-primary'
                            : 'border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive'
                        }`}
                        onClick={() => applyAmountStepByMode(quickAmount)}
                      >
                        {amountAdjustMode === 'add' ? '+' : '-'} {formatCOP(quickAmount)}
                      </Button>
                    ))}
                  </div>
                </div>
                {formData.type !== 'income' && previewAvailableBalance !== null && previewTransactionAmount > previewAvailableBalance && (
                  <p className="text-xs text-destructive">
                    Advertencia: saldo insuficiente en billetera origen. Disponible: {formatCOP(previewAvailableBalance)}.
                  </p>
                )}
                {formData.type === 'transfer' && selectedFromWallet && selectedToWallet && selectedFromWallet.id === selectedToWallet.id && (
                  <p className="text-xs text-destructive">
                    Advertencia: origen y destino deben ser diferentes.
                  </p>
                )}
                <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="transfer">Transferencia</SelectItem>
                    <SelectItem value="income">Ingreso</SelectItem>
                    <SelectItem value="expense">Gasto</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex flex-col-reverse sm:flex-row gap-2">
                  <Button type="submit" className="w-full sm:w-auto" disabled={sourceLoading}>
                    {editing ? 'Actualizar' : 'Crear'}
                  </Button>
                  <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={closeForm}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {viewingTransaction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Detalle de transferencia</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Origen</p>
                <p className="text-sm font-medium text-foreground">{getWalletName(viewingTransaction.from_wallet)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Destino</p>
                <p className="text-sm font-medium text-foreground">{getWalletName(viewingTransaction.to_wallet)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Monto</p>
                <p className="text-lg font-bold text-primary">{formatCOP(viewingTransaction.amount)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Fecha</p>
                <p className="text-sm text-foreground">{new Date(viewingTransaction.created_at).toLocaleString('es-CO')}</p>
              </div>
              <div className="pt-2 flex justify-end">
                <Button type="button" variant="outline" onClick={closeViewTransaction}>
                  Cerrar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="mt-6">
        <Button variant="outline" onClick={() => setPage('dashboard')}>
          Volver al Dashboard
        </Button>
      </div>
    </div>
  )
}
