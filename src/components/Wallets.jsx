import { useEffect, useMemo, useState } from 'react'
import { useWallets } from '../hooks/useWallets'
import { useTransactions } from '../hooks/useTransactions'
import { useAllocations } from '../hooks/useAllocations'
import { useAuth } from '../contexts/AuthContext'
import { accountTransfersService, transactionsService } from '../services'
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Select, SelectContent, SelectEmpty, SelectItem, SelectTrigger, SelectValue } from './ui/Select'
import { Search, Plus, Edit, Trash2, ArrowRightLeft, TrendingUp, TrendingDown } from 'lucide-react'
import WalletDetail from './WalletDetail'
import { formatCOP, formatCOPInput, formatCOPInputFromRaw, normalizeCOPAmount } from '../lib/currency'
import { IconGlyph, WALLET_ICON_OPTIONS, normalizeIconKey } from '../lib/icons'
import { WalletsSkeleton } from './RouteSkeletons'
import WalletMovementModal from './WalletMovementModal'

const QUICK_BALANCE_STEPS = [10000, 50000, 100000]
const QUICK_TRANSFER_STEPS = [10000, 50000, 100000]

export default function Wallets({ accountId, setPage, selectedWalletId = null, onClearSelectedWallet }) {
  const { user } = useAuth()
  const { transactions, refetch: refetchTransactions } = useTransactions(accountId)
  const { allocations } = useAllocations(accountId)
  const { wallets, loading, error, createWallet, updateWallet, deleteWallet, refetch } = useWallets(accountId)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ name: '', icon: 'wallet', balance: 0 })
  const [balanceInput, setBalanceInput] = useState('0')
  const [editing, setEditing] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedWallet, setSelectedWallet] = useState(null)
  const [accountTransfers, setAccountTransfers] = useState([])
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [transferForm, setTransferForm] = useState({ from_wallet: '', to_wallet: '', amount: '0' })
  const [transferAdjustMode, setTransferAdjustMode] = useState('add')
  const [balanceAdjustMode, setBalanceAdjustMode] = useState('add')
  const [transferSubmitting, setTransferSubmitting] = useState(false)
  const [transferError, setTransferError] = useState('')
  const [movementModal, setMovementModal] = useState({ open: false, type: 'income', walletId: '' })
  const [idempotencyKey, setIdempotencyKey] = useState('')
  const [transferIdempotencyKey, setTransferIdempotencyKey] = useState('')

  useEffect(() => {
    if (!selectedWalletId) return
    const targetWallet = wallets.find(wallet => wallet.id === selectedWalletId)
    if (targetWallet) {
      setSelectedWallet(targetWallet)
      onClearSelectedWallet?.()
    }
  }, [selectedWalletId, wallets, onClearSelectedWallet])

  useEffect(() => {
    let isCancelled = false

    const loadAccountTransfers = async () => {
      if (!accountId || wallets.length === 0) {
        setAccountTransfers([])
        return
      }

      const walletIds = new Set(wallets.map(wallet => wallet.id))
      const { data, error: transferErrorLoad } = await accountTransfersService.getRecent(400)
      if (isCancelled) return

      if (transferErrorLoad) {
        setAccountTransfers([])
        return
      }

      const relatedTransfers = (data || []).filter(transfer =>
        walletIds.has(transfer.from_wallet_id) || walletIds.has(transfer.to_wallet_id)
      )

      setAccountTransfers(relatedTransfers)
    }

    loadAccountTransfers()

    return () => {
      isCancelled = true
    }
  }, [accountId, wallets])

  const openCreateForm = () => {
    setEditing(null)
    setFormData({ name: '', icon: 'wallet', balance: 0 })
    setBalanceInput('0')
    setBalanceAdjustMode('add')
    setIdempotencyKey(crypto.randomUUID())
    setShowForm(true)
  }

  const resetForm = () => {
    setFormData({ name: '', icon: 'wallet', balance: 0 })
    setBalanceInput('0')
    setBalanceAdjustMode('add')
    setEditing(null)
    setShowForm(false)
  }

  const applyBalanceQuickAmount = (delta) => {
    const nextValue = Math.max(0, normalizeCOPAmount(balanceInput) + delta)
    setBalanceInput(formatCOPInput(nextValue))
  }

  const applyBalanceStepByMode = (step) => {
    const sign = balanceAdjustMode === 'add' ? 1 : -1
    applyBalanceQuickAmount(step * sign)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const payload = {
      ...formData,
      name: formData.name.trim(),
      icon: normalizeIconKey(formData.icon, 'wallet'),
      balance: normalizeCOPAmount(balanceInput),
    }

    if (editing) {
      await updateWallet(editing.id, payload)
    } else {
      const { error } = await createWallet({ ...payload, idempotency_key: idempotencyKey })
      if (error && error.code === '23505') {
        alert('Esta billetera ya ha sido registrada (duplicado detectado).')
        return
      }
    }
    resetForm()
  }

  const handleEdit = (wallet) => {
    setEditing(wallet)
    setFormData({ name: wallet.name, icon: normalizeIconKey(wallet.icon, 'wallet'), balance: wallet.balance })
    setBalanceInput(formatCOPInput(wallet.balance))
    setBalanceAdjustMode('add')
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar esta billetera?')) {
      return await deleteWallet(id)
    }
    return { error: null }
  }

  const canTransferBetweenWallets = wallets.length > 1
  const selectedSourceWallet = useMemo(
    () => wallets.find(wallet => wallet.id === transferForm.from_wallet) || null,
    [wallets, transferForm.from_wallet]
  )
  const previewTransferAmount = useMemo(
    () => normalizeCOPAmount(transferForm.amount),
    [transferForm.amount]
  )

  const openTransferModal = (fromWalletId = '') => {
    if (!canTransferBetweenWallets) return
    const sourceWalletId = fromWalletId || wallets[0]?.id || ''
    const defaultTargetId = wallets.find(wallet => wallet.id !== sourceWalletId)?.id || ''

    setTransferError('')
    setTransferForm({
      from_wallet: sourceWalletId,
      to_wallet: defaultTargetId,
      amount: '0',
    })
    setTransferIdempotencyKey(crypto.randomUUID())
    setShowTransferModal(true)
  }

  const openMovementModal = (type = 'income', walletId = '') => {
    if (wallets.length === 0) {
      openCreateForm()
      return
    }
    setMovementModal({ open: true, type, walletId })
  }

  const closeMovementModal = () => {
    setMovementModal(prev => ({ ...prev, open: false }))
  }

  const closeTransferModal = () => {
    setShowTransferModal(false)
    setTransferAdjustMode('add')
    setTransferSubmitting(false)
    setTransferError('')
    setTransferForm({ from_wallet: '', to_wallet: '', amount: '0' })
  }

  const applyTransferQuickAmount = (delta) => {
    const nextValue = Math.max(0, normalizeCOPAmount(transferForm.amount) + delta)
    setTransferForm(prev => ({ ...prev, amount: formatCOPInput(nextValue) }))
  }

  const applyTransferStepByMode = (step) => {
    const sign = transferAdjustMode === 'add' ? 1 : -1
    applyTransferQuickAmount(step * sign)
  }

  const handleTransferSubmit = async (e) => {
    e.preventDefault()
    setTransferError('')

    const amount = normalizeCOPAmount(transferForm.amount)
    if (amount <= 0) {
      setTransferError('Ingresa un monto válido mayor a 0.')
      return
    }

    const sourceWallet = wallets.find(wallet => wallet.id === transferForm.from_wallet)
    const targetWallet = wallets.find(wallet => wallet.id === transferForm.to_wallet)

    if (!sourceWallet || !targetWallet) {
      setTransferError('Selecciona billeteras válidas para origen y destino.')
      return
    }

    if (sourceWallet.id === targetWallet.id) {
      setTransferError('La billetera de origen y destino deben ser diferentes.')
      return
    }

    if (!accountId) {
      setTransferError('No hay una cuenta activa para registrar la transferencia.')
      return
    }

    const sourceBalance = normalizeCOPAmount(sourceWallet.balance)
    if (amount > sourceBalance) {
      setTransferError(`Saldo insuficiente en la billetera origen. Disponible: ${formatCOP(sourceBalance)}.`)
      return
    }

    setTransferSubmitting(true)
    const { error: transactionError } = await transactionsService.create({
      account_id: accountId,
      from_wallet: sourceWallet.id,
      to_wallet: targetWallet.id,
      amount,
      type: 'transfer',
      note: null,
      category: null,
      occurred_at: new Date().toISOString(),
      created_by: user?.id || null,
      idempotency_key: transferIdempotencyKey,
    })

    if (transactionError) {
      if (transactionError.code === '23505') {
        setTransferError('Esta transferencia ya ha sido registrada (duplicado detectado).')
      } else {
        setTransferError(transactionError.message || 'No fue posible registrar la transferencia.')
      }
      setTransferSubmitting(false)
      return
    }

    await Promise.all([refetch(), refetchTransactions()])
    setTransferSubmitting(false)
    closeTransferModal()
  }

  const filteredWallets = wallets.filter(wallet => {
    const matchesSearch = wallet.name.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  const spentByWalletId = useMemo(() => {
    const spentStats = {}
    wallets.forEach((wallet) => {
      spentStats[wallet.id] = 0
    })

    transactions.forEach((transaction) => {
      const isOutgoingMoney =
        transaction.from_wallet &&
        (transaction.type === 'expense' || transaction.type === 'transfer')

      if (isOutgoingMoney && Number.isFinite(spentStats[transaction.from_wallet])) {
        spentStats[transaction.from_wallet] += normalizeCOPAmount(transaction.amount)
      }
    })

    allocations.forEach((allocation) => {
      if (allocation.wallet_id && Number.isFinite(spentStats[allocation.wallet_id])) {
        spentStats[allocation.wallet_id] += normalizeCOPAmount(allocation.amount)
      }
    })

    accountTransfers.forEach((transfer) => {
      if (transfer.from_wallet_id && Number.isFinite(spentStats[transfer.from_wallet_id])) {
        spentStats[transfer.from_wallet_id] += normalizeCOPAmount(transfer.amount)
      }
    })

    return spentStats
  }, [wallets, transactions, allocations, accountTransfers])

  const movementCategories = useMemo(() => (
    transactions
      .map(transaction => (transaction.category || '').trim())
      .filter(Boolean)
  ), [transactions])

  if (loading) return <WalletsSkeleton />
  if (error) return <div className="text-destructive">Error: {error.message}</div>

  if (selectedWallet) {
    return (
      <WalletDetail
        wallet={selectedWallet}
        onBack={() => { setSelectedWallet(null); onClearSelectedWallet?.(); refetch(); }}
        onDelete={handleDelete}
        updateWallet={updateWallet}
      />
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold">Mis billeteras</h1>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button
            variant="outline"
            onClick={() => openMovementModal('income')}
            className="w-full sm:w-auto"
          >
            <TrendingUp className="w-4 h-4 mr-2 text-primary" />
            Registrar ingreso
          </Button>
          <Button
            variant="outline"
            onClick={() => openMovementModal('expense')}
            className="w-full sm:w-auto"
          >
            <TrendingDown className="w-4 h-4 mr-2 text-destructive" />
            Registrar gasto
          </Button>
          <Button onClick={openCreateForm} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Nueva billetera
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            type="text"
            placeholder="Buscar wallets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="text-sm text-muted-foreground flex items-center">
          {filteredWallets.length} billetera{filteredWallets.length === 1 ? '' : 's'}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="border-dashed border-2 border-border hover:border-primary/40 transition-colors cursor-pointer" onClick={openCreateForm}>
          <CardContent className="flex flex-col items-center justify-center h-48">
            <Plus className="w-12 h-12 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">Crear nueva billetera</p>
          </CardContent>
        </Card>

        {filteredWallets.map(wallet => (
          <Card key={wallet.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setSelectedWallet(wallet)}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <IconGlyph value={wallet.icon} fallback="wallet" className="h-5 w-5" />
                </span>
                {wallet.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const currentBalance = normalizeCOPAmount(wallet.balance)
                const totalSpent = spentByWalletId[wallet.id] || 0
                return (
                  <>
                    <div className="mb-4 rounded-lg border border-border bg-muted/40 p-3">
                      <p className="text-xs text-muted-foreground">Saldo actual</p>
                      <p className="text-2xl font-bold text-foreground">{formatCOP(currentBalance)}</p>
                    </div>
                    <div className="mb-4 grid grid-cols-1 gap-2">
                      <div className="rounded-lg border border-border bg-muted/20 p-2.5">
                        <p className="text-[11px] text-muted-foreground">Gastado</p>
                        <p className="text-sm font-semibold text-destructive">{formatCOP(totalSpent)}</p>
                      </div>
                    </div>
                  </>
                )
              })()}
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleEdit(wallet); }}>
                  <Edit className="w-4 h-4 mr-1" />
                  Editar
                </Button>
                <Button variant="outline" size="sm" onClick={async (e) => {
                  e.stopPropagation();
                  const result = await handleDelete(wallet.id);
                  if (result.error) {
                    alert('Error al eliminar la billetera: ' + result.error.message);
                  }
                }}>
                  <Trash2 className="w-4 h-4 mr-1" />
                  Eliminar
                </Button>
                {canTransferBetweenWallets && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      openTransferModal(wallet.id)
                    }}
                  >
                    <ArrowRightLeft className="w-4 h-4 mr-1" />
                    Transferir
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {showTransferModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Transferir entre billeteras</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleTransferSubmit} className="space-y-4">
                {transferError && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {transferError}
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-sm font-medium">Billetera origen</label>
                  <Select
                    value={transferForm.from_wallet}
                    onValueChange={(value) => {
                      setTransferForm((prev) => {
                        const nextTarget = prev.to_wallet === value
                          ? wallets.find(wallet => wallet.id !== value)?.id || ''
                          : prev.to_wallet
                        return { ...prev, from_wallet: value, to_wallet: nextTarget }
                      })
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar origen" />
                    </SelectTrigger>
                    <SelectContent>
                      {wallets.length === 0 ? (
                        <SelectEmpty>No hay billeteras disponibles</SelectEmpty>
                      ) : (
                        wallets.map((wallet) => (
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
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">Billetera destino</label>
                  <Select
                    value={transferForm.to_wallet}
                    onValueChange={(value) => setTransferForm(prev => ({ ...prev, to_wallet: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar destino" />
                    </SelectTrigger>
                    <SelectContent>
                      {wallets.length === 0 ? (
                        <SelectEmpty>No hay billeteras disponibles</SelectEmpty>
                      ) : (
                        wallets.map((wallet) => (
                          <SelectItem key={wallet.id} value={wallet.id} disabled={wallet.id === transferForm.from_wallet}>
                            <div className="flex items-center gap-2">
                              <IconGlyph value={wallet.icon} fallback="wallet" className="h-4 w-4" />
                              <span>{wallet.name}</span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">Monto</label>
                  <Input
                    type="text"
                    numeric
                    placeholder="0"
                    value={transferForm.amount}
                    onFocus={() => {
                      if (transferForm.amount === '0') {
                        setTransferForm(prev => ({ ...prev, amount: '' }))
                      }
                    }}
                    onChange={(e) => {
                      setTransferForm(prev => ({ ...prev, amount: formatCOPInputFromRaw(e.target.value) }))
                    }}
                    onBlur={() => {
                      setTransferForm(prev => ({ ...prev, amount: formatCOPInput(prev.amount) }))
                    }}
                    required
                  />
                  <div className="mt-2 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Ajuste rápido</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant={transferAdjustMode === 'add' ? 'default' : 'outline'}
                        size="sm"
                        className={transferAdjustMode === 'add' ? '' : 'border-primary/40 text-primary hover:bg-primary/10 hover:text-primary'}
                        onClick={() => setTransferAdjustMode('add')}
                      >
                        Sumar
                      </Button>
                      <Button
                        type="button"
                        variant={transferAdjustMode === 'subtract' ? 'destructive' : 'outline'}
                        size="sm"
                        className={transferAdjustMode === 'subtract' ? '' : 'border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive'}
                        onClick={() => setTransferAdjustMode('subtract')}
                      >
                        Restar
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      {QUICK_TRANSFER_STEPS.map((quickAmount) => (
                        <Button
                          key={`wallet-transfer-step-${quickAmount}`}
                          type="button"
                          variant="outline"
                          size="sm"
                          className={`justify-start ${
                            transferAdjustMode === 'add'
                              ? 'border-primary/50 text-primary hover:bg-primary/10 hover:text-primary'
                              : 'border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive'
                          }`}
                          onClick={() => applyTransferStepByMode(quickAmount)}
                        >
                          {transferAdjustMode === 'add' ? '+' : '-'} {formatCOP(quickAmount)}
                        </Button>
                      ))}
                    </div>
                  </div>
                  {selectedSourceWallet && previewTransferAmount > normalizeCOPAmount(selectedSourceWallet.balance) && (
                    <p className="mt-1 text-xs text-destructive">
                      Saldo insuficiente en origen. Disponible: {formatCOP(selectedSourceWallet.balance)}.
                    </p>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
                  <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={closeTransferModal}>
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="w-full sm:w-auto"
                    disabled={transferSubmitting || !canTransferBetweenWallets}
                  >
                    {transferSubmitting ? 'Procesando...' : 'Transferir'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      <WalletMovementModal
        open={movementModal.open}
        onClose={closeMovementModal}
        accountId={accountId}
        userId={user?.id || null}
        wallets={wallets}
        categories={movementCategories}
        defaultType={movementModal.type}
        initialWalletId={movementModal.walletId}
        onSuccess={async () => {
          await Promise.all([refetch(), refetchTransactions()])
        }}
      />

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>{editing ? 'Editar Billetera' : 'Nueva Billetera'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  type="text"
                  placeholder="Nombre"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
                <div>
                  <label className="block text-sm font-medium mb-2">Ícono</label>
                  <div className="grid grid-cols-5 sm:grid-cols-6 gap-2">
                    {WALLET_ICON_OPTIONS.map((iconOption) => (
                      <Button
                        key={iconOption.key}
                        type="button"
                        variant={formData.icon === iconOption.key ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFormData({ ...formData, icon: iconOption.key })}
                        className="h-10 px-0"
                        title={iconOption.label}
                      >
                        <IconGlyph value={iconOption.key} className="h-4 w-4" />
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Balance inicial (COP)</label>
                  <Input
                    type="text"
                    numeric
                    placeholder="0"
                    value={balanceInput}
                    onFocus={() => {
                      if (balanceInput === '0') setBalanceInput('')
                    }}
                    onChange={(e) => {
                      setBalanceInput(formatCOPInputFromRaw(e.target.value))
                    }}
                    onBlur={() => {
                      setBalanceInput(formatCOPInput(balanceInput))
                    }}
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
                      {QUICK_BALANCE_STEPS.map((quickAmount) => (
                        <Button
                          key={`wallet-balance-step-${quickAmount}`}
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
                <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
                  <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={resetForm}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="w-full sm:w-auto">
                    {editing ? 'Actualizar' : 'Crear'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="mt-6">
        <Button variant="outline" onClick={() => setPage('dashboard')}>
          Volver al panel
        </Button>
      </div>
    </div>
  )
}
