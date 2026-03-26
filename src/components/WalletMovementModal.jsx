import { useEffect, useMemo, useState } from 'react'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { transactionsService } from '../services'
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Select, SelectContent, SelectEmpty, SelectItem, SelectTrigger, SelectValue } from './ui/Select'
import { formatCOP, formatCOPInput, formatCOPInputFromRaw, normalizeCOPAmount } from '../lib/currency'
import { IconGlyph } from '../lib/icons'

const QUICK_AMOUNT_STEPS = [10000, 50000, 100000]

const toDateInput = (value) => {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  const localDate = new Date(parsed.getTime() - (parsed.getTimezoneOffset() * 60000))
  return localDate.toISOString().slice(0, 10)
}

const toIsoDatetimeFromDate = (value) => {
  if (!value) return new Date().toISOString()

  const [yearRaw, monthRaw, dayRaw] = value.split('-')
  const year = Number(yearRaw)
  const month = Number(monthRaw)
  const day = Number(dayRaw)

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return new Date().toISOString()
  }

  const now = new Date()
  const localDate = new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds(), 0)
  return localDate.toISOString()
}

const buildInitialForm = (defaultType = 'income', initialWalletId = '', wallets = []) => ({
  type: defaultType,
  wallet_id: initialWalletId || wallets[0]?.id || '',
  amount: '0',
  note: '',
  category: '',
  occurred_at: toDateInput(new Date().toISOString()),
})

export default function WalletMovementModal({
  open,
  onClose,
  accountId,
  userId,
  wallets = [],
  categories = [],
  defaultType = 'income',
  initialWalletId = '',
  onSuccess,
}) {
  const [formData, setFormData] = useState(buildInitialForm(defaultType, initialWalletId, wallets))
  const [amountAdjustMode, setAmountAdjustMode] = useState('add')
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showCategoryMenu, setShowCategoryMenu] = useState(false)

  useEffect(() => {
    if (!open) return
    setFormData(buildInitialForm(defaultType, initialWalletId, wallets))
    setAmountAdjustMode('add')
    setFormError('')
    setSubmitting(false)
    setShowCategoryMenu(false)
  }, [open, defaultType, initialWalletId, wallets])

  useEffect(() => {
    if (!open) return
    if (wallets.length === 0) {
      setFormData(prev => ({ ...prev, wallet_id: '' }))
      return
    }

    const exists = wallets.some(wallet => wallet.id === formData.wallet_id)
    if (!exists) {
      setFormData(prev => ({ ...prev, wallet_id: wallets[0]?.id || '' }))
    }
  }, [open, wallets, formData.wallet_id])

  const selectedWallet = useMemo(
    () => wallets.find(wallet => wallet.id === formData.wallet_id) || null,
    [wallets, formData.wallet_id]
  )
  const previewAmount = useMemo(
    () => normalizeCOPAmount(formData.amount),
    [formData.amount]
  )

  const availableCategories = useMemo(() => {
    const unique = new Set(
      (categories || [])
        .map(category => (category || '').trim())
        .filter(Boolean)
    )
    return [...unique].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }))
  }, [categories])

  const normalizedCategorySearch = formData.category.trim().toLowerCase()
  const filteredCategories = useMemo(() => {
    if (!normalizedCategorySearch) return availableCategories.slice(0, 8)
    return availableCategories
      .filter(category => category.toLowerCase().includes(normalizedCategorySearch))
      .slice(0, 8)
  }, [availableCategories, normalizedCategorySearch])
  const hasExactCategoryMatch = useMemo(
    () => availableCategories.some(category => category.toLowerCase() === normalizedCategorySearch),
    [availableCategories, normalizedCategorySearch]
  )
  const canCreateCategory = formData.category.trim().length > 0 && !hasExactCategoryMatch

  const isIncome = formData.type === 'income'
  const modalTitle = isIncome ? 'Registrar ingreso' : 'Registrar gasto'

  const applyAmountQuickDelta = (delta) => {
    const nextValue = Math.max(0, normalizeCOPAmount(formData.amount) + delta)
    setFormData(prev => ({ ...prev, amount: formatCOPInput(nextValue) }))
  }

  const applyAmountStepByMode = (step) => {
    const sign = amountAdjustMode === 'add' ? 1 : -1
    applyAmountQuickDelta(step * sign)
  }

  const applyCategorySelection = (value) => {
    setFormData(prev => ({ ...prev, category: value }))
    setShowCategoryMenu(false)
  }

  const handleCategoryEnter = () => {
    const typedValue = formData.category.trim()
    if (!typedValue) return

    if (canCreateCategory) {
      applyCategorySelection(typedValue)
      return
    }

    if (filteredCategories.length > 0) {
      applyCategorySelection(filteredCategories[0])
      return
    }

    applyCategorySelection(typedValue)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')

    if (!accountId) {
      setFormError('No hay una cuenta activa para registrar el movimiento.')
      return
    }

    const wallet = wallets.find(item => item.id === formData.wallet_id)
    if (!wallet) {
      setFormError('Selecciona una billetera válida.')
      return
    }

    const amount = normalizeCOPAmount(formData.amount)
    if (amount <= 0) {
      setFormError('Ingresa un monto válido mayor a 0.')
      return
    }

    const note = formData.note.trim()
    const category = formData.category.trim()

    if (!note) {
      setFormError('La nota es obligatoria.')
      return
    }

    if (!category) {
      setFormError('La categoría es obligatoria.')
      return
    }

    if (!isIncome) {
      const walletBalance = normalizeCOPAmount(wallet.balance)
      if (amount > walletBalance) {
        setFormError(`Saldo insuficiente en la billetera. Disponible: ${formatCOP(walletBalance)}.`)
        return
      }
    }

    const payload = {
      account_id: accountId,
      to_wallet: isIncome ? wallet.id : null,
      from_wallet: isIncome ? null : wallet.id,
      amount,
      type: isIncome ? 'income' : 'expense',
      note,
      category,
      occurred_at: toIsoDatetimeFromDate(formData.occurred_at),
      created_by: userId || null,
    }

    setSubmitting(true)
    const { error } = await transactionsService.create(payload)

    if (error) {
      setFormError(error.message || 'No fue posible registrar el movimiento.')
      setSubmitting(false)
      return
    }

    if (onSuccess) {
      await onSuccess()
    }

    setSubmitting(false)
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isIncome ? <TrendingUp className="h-5 w-5 text-primary" /> : <TrendingDown className="h-5 w-5 text-destructive" />}
            {modalTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {formError}
              </div>
            )}

            <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income">Ingreso</SelectItem>
                <SelectItem value="expense">Gasto</SelectItem>
              </SelectContent>
            </Select>

            <Select value={formData.wallet_id} onValueChange={(value) => setFormData(prev => ({ ...prev, wallet_id: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar billetera" />
              </SelectTrigger>
              <SelectContent>
                {wallets.length === 0 ? (
                  <SelectEmpty>No hay billeteras disponibles</SelectEmpty>
                ) : (
                  wallets.map(wallet => (
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

            <div className="relative">
              <Input
                type="text"
                placeholder="Categoría"
                value={formData.category}
                onFocus={() => setShowCategoryMenu(true)}
                onBlur={() => {
                  window.setTimeout(() => setShowCategoryMenu(false), 120)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleCategoryEnter()
                  }
                }}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, category: e.target.value }))
                  setShowCategoryMenu(true)
                }}
                required
              />
              {showCategoryMenu && (
                <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover text-popover-foreground shadow-md">
                  <div className="max-h-56 overflow-y-auto p-1">
                    {filteredCategories.map((category) => (
                      <button
                        key={category}
                        type="button"
                        className="w-full rounded-sm px-3 py-2 text-left text-sm hover:bg-accent"
                        onMouseDown={(e) => {
                          e.preventDefault()
                          applyCategorySelection(category)
                        }}
                      >
                        {category}
                      </button>
                    ))}
                    {canCreateCategory && (
                      <button
                        type="button"
                        className="w-full rounded-sm px-3 py-2 text-left text-sm text-primary hover:bg-accent"
                        onMouseDown={(e) => {
                          e.preventDefault()
                          applyCategorySelection(formData.category.trim())
                        }}
                      >
                        Presiona Enter para crear "{formData.category.trim()}"
                      </button>
                    )}
                    {filteredCategories.length === 0 && !canCreateCategory && (
                      <p className="px-3 py-2 text-sm text-muted-foreground">No hay categorías registradas.</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <Input
              type="text"
              placeholder="Nota"
              value={formData.note}
              onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
              required
            />

            <Input
              type="date"
              value={formData.occurred_at}
              onChange={(e) => setFormData(prev => ({ ...prev, occurred_at: e.target.value }))}
              required
            />

            <Input
              type="text"
              numeric
              placeholder="Monto"
              value={formData.amount}
              onFocus={() => {
                if (formData.amount === '0') {
                  setFormData(prev => ({ ...prev, amount: '' }))
                }
              }}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, amount: formatCOPInputFromRaw(e.target.value) }))
              }}
              onBlur={() => {
                setFormData(prev => ({ ...prev, amount: formatCOPInput(prev.amount) }))
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
                    key={`movement-step-${quickAmount}`}
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

            {!isIncome && selectedWallet && previewAmount > normalizeCOPAmount(selectedWallet.balance) && (
              <p className="text-xs text-destructive">
                Advertencia: saldo insuficiente. Disponible: {formatCOP(selectedWallet.balance)}.
              </p>
            )}

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" className="w-full sm:w-auto" disabled={submitting || wallets.length === 0}>
                {submitting ? 'Guardando...' : 'Guardar movimiento'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
