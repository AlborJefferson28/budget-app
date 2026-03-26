import { useEffect, useMemo, useState } from 'react'
import { useTransactions } from '../hooks/useTransactions'
import { useAllocations } from '../hooks/useAllocations'
import { accountTransfersService } from '../services'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/Select'
import { Skeleton } from './ui/Skeleton'
import { ArrowLeft, ArrowRightLeft, Check, Download, Edit, Eye, PiggyBank, TrendingDown, TrendingUp, Trash2, X } from 'lucide-react'
import { formatCOP, formatCOPInput, formatCOPInputFromRaw, normalizeCOPAmount } from '../lib/currency'
import { IconGlyph, WALLET_ICON_OPTIONS, normalizeIconKey } from '../lib/icons'

const QUICK_AMOUNT_STEPS = [10000, 50000, 100000]

const formatDateLabel = (value) => {
  if (!value) return 'Sin datos'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Sin datos'
  return parsed.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  })
}

const formatDateTimeLabel = (value) => {
  if (!value) return 'Sin datos'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Sin datos'
  return parsed.toLocaleString('es-CO')
}

export default function WalletDetail({ wallet, onBack, onDelete, updateWallet }) {
  const { transactions, loading: transactionsLoading } = useTransactions(wallet.account_id)
  const { allocations, loading: allocationsLoading } = useAllocations(wallet.account_id)
  const [accountTransfers, setAccountTransfers] = useState([])
  const [accountTransfersLoading, setAccountTransfersLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [currentWallet, setCurrentWallet] = useState(wallet)
  const [editError, setEditError] = useState('')
  const [editNotice, setEditNotice] = useState('')
  const [balanceAdjustMode, setBalanceAdjustMode] = useState('add')
  const [editForm, setEditForm] = useState({
    name: wallet.name,
    icon: normalizeIconKey(wallet.icon, 'wallet'),
    balanceInput: formatCOPInput(wallet.balance)
  })

  const getTransactionDate = (transaction) => transaction?.occurred_at || transaction?.created_at
  const toDateMs = (value) => {
    if (!value) return 0
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime()
  }

  useEffect(() => {
    setCurrentWallet(wallet)
    setEditForm({
      name: wallet.name,
      icon: normalizeIconKey(wallet.icon, 'wallet'),
      balanceInput: formatCOPInput(wallet.balance),
    })
    setBalanceAdjustMode('add')
    setIsEditing(false)
    setEditError('')
    setEditNotice('')
  }, [wallet])

  useEffect(() => {
    let isCancelled = false

    const loadAccountTransfers = async () => {
      setAccountTransfersLoading(true)
      const { data, error } = await accountTransfersService.getRecent(400)

      if (isCancelled) return
      if (error) {
        setAccountTransfers([])
        setAccountTransfersLoading(false)
        return
      }

      const relatedTransfers = (data || []).filter((transfer) =>
        transfer.from_wallet_id === currentWallet.id || transfer.to_wallet_id === currentWallet.id
      )

      setAccountTransfers(relatedTransfers)
      setAccountTransfersLoading(false)
    }

    loadAccountTransfers()

    return () => {
      isCancelled = true
    }
  }, [currentWallet.id])

  const walletTransactions = useMemo(() => (
    transactions
      .filter(t => t.from_wallet === currentWallet.id || t.to_wallet === currentWallet.id)
      .sort((a, b) => toDateMs(getTransactionDate(b)) - toDateMs(getTransactionDate(a)))
  ), [transactions, currentWallet.id])

  const walletAllocations = useMemo(() => (
    allocations
      .filter(allocation => allocation.wallet_id === currentWallet.id)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  ), [allocations, currentWallet.id])

  const walletAccountTransfers = useMemo(() => (
    accountTransfers
      .filter(transfer => transfer.from_wallet_id === currentWallet.id || transfer.to_wallet_id === currentWallet.id)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  ), [accountTransfers, currentWallet.id])

  const totalSpent = useMemo(() => {
    const txSpent = walletTransactions
      .filter(
        transaction =>
          transaction.from_wallet === currentWallet.id &&
          (transaction.type === 'expense' || transaction.type === 'transfer')
      )
      .reduce((sum, transaction) => sum + normalizeCOPAmount(transaction.amount), 0)

    const allocationSpent = walletAllocations
      .reduce((sum, allocation) => sum + normalizeCOPAmount(allocation.amount), 0)

    const contributionSpent = walletAccountTransfers
      .filter(transfer => transfer.from_wallet_id === currentWallet.id)
      .reduce((sum, transfer) => sum + normalizeCOPAmount(transfer.amount), 0)

    return txSpent + allocationSpent + contributionSpent
  }, [walletTransactions, walletAllocations, walletAccountTransfers, currentWallet.id])

  const baseAmount = normalizeCOPAmount(currentWallet.balance)
  const remainingQuota = Math.max(baseAmount - totalSpent, 0)

  const movementHistory = useMemo(() => {
    const transactionEvents = walletTransactions.map((transaction) => {
      const isIncoming = transaction.to_wallet === currentWallet.id && transaction.from_wallet !== currentWallet.id
      const isOutgoing = transaction.from_wallet === currentWallet.id && transaction.to_wallet !== currentWallet.id

      let title = 'Movimiento'
      let icon = Eye
      let amountPrefix = ''
      let amountClass = 'text-foreground'

      if (transaction.type === 'transfer') {
        title = 'Transferencia entre billeteras'
        icon = ArrowRightLeft
        amountPrefix = isIncoming ? '+' : '-'
        amountClass = isIncoming ? 'text-primary' : 'text-destructive'
      } else if (transaction.type === 'income') {
        title = 'Ingreso'
        icon = TrendingUp
        amountPrefix = '+'
        amountClass = 'text-primary'
      } else if (transaction.type === 'expense') {
        title = 'Gasto'
        icon = TrendingDown
        amountPrefix = '-'
        amountClass = 'text-destructive'
      }

      if (!isIncoming && !isOutgoing && transaction.type === 'transfer') {
        amountPrefix = '-'
        amountClass = 'text-destructive'
      }

      return {
        id: `tx-${transaction.id}`,
        date: getTransactionDate(transaction),
        title,
        subtitle: transaction.type === 'transfer'
          ? 'Movimiento entre billeteras'
          : `${transaction.category || 'Transacción de billetera'}${transaction.note ? ` · ${transaction.note}` : ''}`,
        amount: normalizeCOPAmount(transaction.amount),
        amountPrefix,
        amountClass,
        icon,
      }
    })

    const allocationEvents = walletAllocations.map((allocation) => ({
      id: `allocation-${allocation.id}`,
      date: allocation.created_at,
      title: 'Asignación a presupuesto',
      subtitle: `${allocation.wallets?.name || currentWallet.name} -> ${allocation.budgets?.name || 'Presupuesto'}`,
      amount: normalizeCOPAmount(allocation.amount),
      amountPrefix: '-',
      amountClass: 'text-destructive',
      icon: PiggyBank,
    }))

    const accountTransferEvents = walletAccountTransfers.map((transfer) => {
      const isIncoming = transfer.to_wallet_id === currentWallet.id
      return {
        id: `account-transfer-${transfer.id}`,
        date: transfer.created_at,
        title: 'Aporte entre cuentas',
        subtitle: isIncoming ? 'Entrada desde otra cuenta' : 'Salida hacia otra cuenta',
        amount: normalizeCOPAmount(transfer.amount),
        amountPrefix: isIncoming ? '+' : '-',
        amountClass: isIncoming ? 'text-primary' : 'text-destructive',
        icon: ArrowRightLeft,
      }
    })

    return [...transactionEvents, ...allocationEvents, ...accountTransferEvents]
      .sort((a, b) => toDateMs(b.date) - toDateMs(a.date))
  }, [walletTransactions, walletAllocations, walletAccountTransfers, currentWallet.id, currentWallet.name])

  const latestActivity = movementHistory[0]?.date || currentWallet.created_at

  const applyBalanceQuickAmount = (amount) => {
    const nextValue = Math.max(0, normalizeCOPAmount(editForm.balanceInput) + amount)
    setEditForm(prev => ({
      ...prev,
      balanceInput: formatCOPInput(nextValue),
    }))
  }

  const applyBalanceStepByMode = (step) => {
    const sign = balanceAdjustMode === 'add' ? 1 : -1
    applyBalanceQuickAmount(step * sign)
  }

  const handleDelete = async () => {
    if (window.confirm('¿Estás seguro de eliminar esta billetera?')) {
      const result = await onDelete(currentWallet.id)
      if (!result.error) {
        onBack()
      } else {
        alert('Error al eliminar la billetera: ' + result.error.message)
      }
    }
  }

  const handleEditToggle = () => {
    setEditError('')
    setEditNotice('')
    if (isEditing) {
      setEditForm({
        name: currentWallet.name,
        icon: normalizeIconKey(currentWallet.icon, 'wallet'),
        balanceInput: formatCOPInput(currentWallet.balance),
      })
    }
    setIsEditing(!isEditing)
  }

  const handleSave = async () => {
    const payload = {
      name: editForm.name.trim(),
      icon: normalizeIconKey(editForm.icon, 'wallet'),
      balance: normalizeCOPAmount(editForm.balanceInput),
    }

    if (!payload.name) {
      setEditError('El nombre de la billetera es obligatorio.')
      return
    }

    setEditError('')
    setEditNotice('')
    const { data, error } = await updateWallet(currentWallet.id, payload)

    if (error) {
      setEditError(error.message || 'No se pudo actualizar la billetera.')
      return
    }

    setCurrentWallet(data?.[0] || { ...currentWallet, ...payload })
    setEditNotice('Billetera actualizada correctamente.')
    setIsEditing(false)
  }

  const isMovementsLoading = transactionsLoading || allocationsLoading || accountTransfersLoading

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="mb-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold">Detalle de billetera</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 min-w-0">
              {isEditing ? (
                <Select value={editForm.icon} onValueChange={(value) => setEditForm({ ...editForm, icon: value })}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WALLET_ICON_OPTIONS.map((iconOption) => (
                      <SelectItem key={iconOption.key} value={iconOption.key}>
                        <div className="flex items-center gap-2">
                          <IconGlyph value={iconOption.key} className="h-4 w-4" />
                          <span>{iconOption.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <IconGlyph value={currentWallet.icon} fallback="wallet" className="h-7 w-7" />
                </span>
              )}
              <div className="min-w-0">
                {isEditing ? (
                  <Input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="text-2xl font-bold"
                  />
                ) : (
                  <CardTitle className="text-2xl">{currentWallet.name}</CardTitle>
                )}
                <CardDescription>Detalle de billetera</CardDescription>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {isEditing ? (
                <>
                  <Button variant="outline" size="sm" onClick={handleSave}>
                    <Check className="w-4 h-4 mr-2" />
                    Guardar
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleEditToggle}>
                    <X className="w-4 h-4 mr-2" />
                    Cancelar
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" size="sm" onClick={handleEditToggle}>
                    <Edit className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDelete}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Eliminar
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {editError && (
            <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {editError}
            </div>
          )}
          {editNotice && (
            <div className="mb-4 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
              {editNotice}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-sm text-muted-foreground">Monto base</p>
              {isEditing ? (
                <div>
                  <Input
                    type="text"
                    numeric
                    value={editForm.balanceInput}
                    onFocus={() => {
                      if (editForm.balanceInput === '0') {
                        setEditForm(prev => ({ ...prev, balanceInput: '' }))
                      }
                    }}
                    onChange={(e) => {
                      setEditForm(prev => ({ ...prev, balanceInput: formatCOPInputFromRaw(e.target.value) }))
                    }}
                    onBlur={() => {
                      setEditForm(prev => ({ ...prev, balanceInput: formatCOPInput(prev.balanceInput) }))
                    }}
                    className="text-2xl font-bold"
                  />
                  <div className="mt-2 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Ajuste rápido</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant={balanceAdjustMode === 'add' ? 'default' : 'outline'}
                        size="sm"
                        className={balanceAdjustMode === 'add' ? '' : 'border-primary/40 text-primary hover:bg-primary/10 hover:text-primary'}
                        onClick={() => setBalanceAdjustMode('add')}
                      >
                        Sumar
                      </Button>
                      <Button
                        type="button"
                        variant={balanceAdjustMode === 'subtract' ? 'destructive' : 'outline'}
                        size="sm"
                        className={balanceAdjustMode === 'subtract' ? '' : 'border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive'}
                        onClick={() => setBalanceAdjustMode('subtract')}
                      >
                        Restar
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      {QUICK_AMOUNT_STEPS.map((quickAmount) => (
                        <Button
                          key={`detail-balance-step-${quickAmount}`}
                          type="button"
                          variant="outline"
                          size="sm"
                          className={`justify-start ${
                            balanceAdjustMode === 'add'
                              ? 'border-primary/50 text-primary hover:bg-primary/10 hover:text-primary'
                              : 'border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive'
                          }`}
                          onClick={() => applyBalanceStepByMode(quickAmount)}
                        >
                          {balanceAdjustMode === 'add' ? '+' : '-'} {formatCOP(quickAmount)}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-3xl font-bold text-primary">{formatCOP(baseAmount)}</p>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Gastado</p>
              <p className="text-2xl font-bold text-destructive">{formatCOP(totalSpent)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Restante</p>
              <p className="text-2xl font-bold text-primary">{formatCOP(remainingQuota)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Creada</p>
              <p className="text-lg">{formatDateLabel(currentWallet.created_at)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Última actividad</p>
              <p className="text-lg">{formatDateLabel(latestActivity)}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Exportar historial
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Historial de movimientos</CardTitle>
        </CardHeader>
        <CardContent>
          {isMovementsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-16 w-full rounded-lg" />
            </div>
          ) : movementHistory.length > 0 ? (
            <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
              {movementHistory.map((movement) => {
                const MovementIcon = movement.icon
                return (
                  <article key={movement.id} className="rounded-lg border border-border p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 rounded-md bg-muted p-2 text-muted-foreground">
                          <MovementIcon className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{movement.title}</p>
                          <p className="text-xs text-muted-foreground">{movement.subtitle}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{formatDateTimeLabel(movement.date)}</p>
                        </div>
                      </div>
                      <p className={`text-sm font-bold ${movement.amountClass}`}>
                        {movement.amountPrefix}{formatCOP(movement.amount)}
                      </p>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <p className="text-muted-foreground">No hay movimientos registrados para esta billetera.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
