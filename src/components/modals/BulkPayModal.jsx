import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import { Button } from '../ui/Button'
import { Select, SelectContent, SelectEmpty, SelectItem, SelectTrigger, SelectValue } from '../ui/Select'
import { formatCOP } from '../../lib/currency'
import { IconGlyph } from '../../lib/icons'

export default function BulkPayModal({
  open,
  onClose,
  selectedBudgets = [],
  wallets = [],
  onCreateAllocations,
  userId,
  onSuccess,
}) {
  const [selectedWalletId, setSelectedWalletId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Pre-calculate missing amounts
  const budgetPayments = useMemo(() => {
    return selectedBudgets.map(budget => {
      const missing = Math.max(0, (budget.target || 0) - (budget.current || 0))
      return {
        ...budget,
        missing
      }
    })
  }, [selectedBudgets])

  const totalToPay = useMemo(() => {
    return budgetPayments.reduce((sum, b) => sum + b.missing, 0)
  }, [budgetPayments])

  const selectedWallet = useMemo(() => {
    return wallets.find(w => w.id === selectedWalletId) || null
  }, [wallets, selectedWalletId])

  useEffect(() => {
    if (open && wallets.length > 0 && !selectedWalletId) {
      setSelectedWalletId(wallets[0].id)
    }
  }, [open, wallets, selectedWalletId])

  useEffect(() => {
    if (!open) {
      setError('')
      setIsSubmitting(false)
    }
  }, [open])

  const handleConfirm = async () => {
    setError('')
    if (!selectedWalletId) {
      setError('Por favor selecciona una billetera de origen.')
      return
    }

    if (selectedWallet && totalToPay > selectedWallet.balance) {
      setError(`Saldo insuficiente en ${selectedWallet.name}. Faltan ${formatCOP(totalToPay - selectedWallet.balance)}`)
      return
    }

    const allocations = budgetPayments
      .filter(b => b.missing > 0)
      .map(b => ({
        budget_id: b.id,
        wallet_id: selectedWalletId,
        amount: b.missing,
        created_by: userId,
      }))

    if (allocations.length === 0) {
      setError('No hay montos pendientes por asignar en los presupuestos seleccionados.')
      return
    }

    setIsSubmitting(true)
    try {
      const { error: bulkError } = await onCreateAllocations(allocations)
      if (bulkError) throw bulkError
      if (onSuccess) onSuccess()
      onClose()
    } catch (err) {
      setError(err.message || 'Error al procesar las asignaciones.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-300">
      <Card className="w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-200 border-primary/20">
        <CardHeader className="border-b bg-muted/20 pb-4">
          <CardTitle className="flex items-center gap-2 text-xl font-bold">
            <CheckCircle2 className="h-6 w-6 text-primary" />
            Pagar presupuestos seleccionados
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive animate-in slide-in-from-top-1">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">Resumen de pagos</h4>
            <div className="max-h-48 overflow-y-auto border rounded-xl divide-y bg-muted/10">
              {budgetPayments.map(budget => (
                <div key={budget.id} className="flex items-center justify-between p-3 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                      <IconGlyph value={budget.icon} fallback="piggy-bank" className="h-4 w-4" />
                    </span>
                    <span className="text-sm font-medium truncate">{budget.name}</span>
                  </div>
                  <span className="text-sm font-bold text-foreground shrink-0">{formatCOP(budget.missing)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center p-4 bg-primary/10 rounded-xl border border-primary/20 ring-1 ring-primary/5">
              <span className="text-sm font-bold text-primary">Total a asignar</span>
              <span className="text-xl font-black text-primary">{formatCOP(totalToPay)}</span>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1 block">Billetera de origen</label>
            <Select value={selectedWalletId} onValueChange={setSelectedWalletId}>
              <SelectTrigger className="h-12 bg-background border-border hover:border-primary/50 transition-colors">
                <SelectValue placeholder="Seleccionar billetera" />
              </SelectTrigger>
              <SelectContent>
                {wallets.length === 0 ? (
                  <SelectEmpty>No hay billeteras disponibles</SelectEmpty>
                ) : (
                  wallets.map(wallet => (
                    <SelectItem key={wallet.id} value={wallet.id}>
                      <div className="flex items-center gap-3">
                        <IconGlyph value={wallet.icon} fallback="wallet" className="h-5 w-5" />
                        <div className="flex flex-col items-start">
                          <span className="font-semibold text-sm">{wallet.name}</span>
                          <span className="text-[10px] text-muted-foreground uppercase tracking-tighter">Disponible: {formatCOP(wallet.balance)}</span>
                        </div>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {selectedWallet && (
              <div className="flex justify-between items-center px-1">
                <p className={`text-[11px] font-medium ${totalToPay > selectedWallet.balance ? 'text-destructive' : 'text-muted-foreground'}`}>
                  Saldo después: {formatCOP(selectedWallet.balance - totalToPay)}
                </p>
                {totalToPay > selectedWallet.balance && (
                  <span className="text-[10px] font-bold text-destructive uppercase">Insuficiente</span>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button variant="outline" className="flex-1 h-11 font-semibold" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button 
              className="flex-1 h-11 font-bold shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90" 
              onClick={handleConfirm} 
              disabled={isSubmitting || totalToPay === 0 || (selectedWallet && totalToPay > selectedWallet.balance)}
            >
              {isSubmitting ? 'Procesando...' : `Confirmar pago (${budgetPayments.length})`}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
