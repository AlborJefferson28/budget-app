import { useEffect, useState } from 'react'
import { useTransactions } from '../hooks/useTransactions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/Select'
import { Skeleton } from './ui/Skeleton'
import { ArrowLeft, Edit, Trash2, Download, Shield, QrCode, Check, X } from 'lucide-react'
import { formatCOP, parseCOP } from '../lib/currency'
import { IconGlyph, WALLET_ICON_OPTIONS, normalizeIconKey } from '../lib/icons'

const QUICK_AMOUNT_STEPS = [10000, 50000, 100000]

const normalizeCOPAmount = (value) => {
  const parsed = parseCOP(value)
  return Math.max(0, Math.round(parsed))
}

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

export default function WalletDetail({ wallet, onBack, onDelete, updateWallet }) {
  const { transactions, loading: transactionsLoading } = useTransactions(wallet.account_id)
  const [isEditing, setIsEditing] = useState(false)
  const [currentWallet, setCurrentWallet] = useState(wallet)
  const [editError, setEditError] = useState('')
  const [editNotice, setEditNotice] = useState('')
  const [editForm, setEditForm] = useState({
    name: wallet.name,
    icon: normalizeIconKey(wallet.icon, 'wallet'),
    balanceInput: String(normalizeCOPAmount(wallet.balance))
  })

  useEffect(() => {
    setCurrentWallet(wallet)
    setEditForm({
      name: wallet.name,
      icon: normalizeIconKey(wallet.icon, 'wallet'),
      balanceInput: String(normalizeCOPAmount(wallet.balance)),
    })
    setIsEditing(false)
    setEditError('')
    setEditNotice('')
  }, [wallet])

  const walletTransactions = transactions.filter(t =>
    t.from_wallet === currentWallet.id || t.to_wallet === currentWallet.id
  ).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  const recentWalletTransactions = walletTransactions.slice(0, 5)
  const latestActivity = walletTransactions[0]?.created_at || currentWallet.created_at

  const applyBalanceQuickAmount = (amount) => {
    const nextValue = Math.max(0, normalizeCOPAmount(editForm.balanceInput) + amount)
    setEditForm(prev => ({
      ...prev,
      balanceInput: String(nextValue),
    }))
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
        balanceInput: String(normalizeCOPAmount(currentWallet.balance)),
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
      setEditError('El nombre de la wallet es obligatorio.')
      return
    }

    setEditError('')
    setEditNotice('')
    const { data, error } = await updateWallet(currentWallet.id, payload)

    if (error) {
      setEditError(error.message || 'No se pudo actualizar la wallet.')
      return
    }

    setCurrentWallet(data?.[0] || { ...currentWallet, ...payload })
    setEditNotice('Wallet actualizada correctamente.')
    setIsEditing(false)
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="flex flex-col items-start gap-3 mb-6 sm:flex-row sm:items-center">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver
        </Button>
        <h1 className="text-2xl sm:text-3xl font-bold">Detalle de Wallet</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Información principal */}
        <div className="lg:col-span-2">
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
                    <CardDescription>Wallet ID: {currentWallet.id}</CardDescription>
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
                  <p className="text-sm text-muted-foreground">Balance</p>
                  {isEditing ? (
                    <div>
                      <Input
                        type="text"
                        value={editForm.balanceInput}
                        onFocus={() => {
                          if (editForm.balanceInput === '0') {
                            setEditForm(prev => ({ ...prev, balanceInput: '' }))
                          }
                        }}
                        onChange={(e) => {
                          const nextValue = e.target.value
                          if (nextValue === '') {
                            setEditForm(prev => ({ ...prev, balanceInput: '' }))
                            return
                          }
                          if (/^[\d.,\s]+$/.test(nextValue)) {
                            setEditForm(prev => ({ ...prev, balanceInput: nextValue }))
                          }
                        }}
                        onBlur={() => {
                          if (!editForm.balanceInput) {
                            setEditForm(prev => ({ ...prev, balanceInput: '0' }))
                            return
                          }
                          setEditForm(prev => ({ ...prev, balanceInput: String(normalizeCOPAmount(prev.balanceInput)) }))
                        }}
                        className="text-2xl font-bold"
                      />
                      <div className="mt-2 flex flex-wrap gap-2">
                        {QUICK_AMOUNT_STEPS.map((quickAmount) => (
                          <Button
                            key={`detail-add-${quickAmount}`}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => applyBalanceQuickAmount(quickAmount)}
                          >
                            + {formatCOP(quickAmount)}
                          </Button>
                        ))}
                        {QUICK_AMOUNT_STEPS.map((quickAmount) => (
                          <Button
                            key={`detail-sub-${quickAmount}`}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => applyBalanceQuickAmount(-quickAmount)}
                          >
                            - {formatCOP(quickAmount)}
                          </Button>
                        ))}
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Vista previa: <span className="font-semibold text-foreground">{formatCOP(normalizeCOPAmount(editForm.balanceInput))}</span>
                      </p>
                    </div>
                  ) : (
                    <p className="text-3xl font-bold text-primary">{formatCOP(currentWallet.balance)}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Moneda</p>
                  <p className="text-lg">COP</p>
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
                  Exportar Historial
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Transacciones recientes */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Transacciones Recientes</CardTitle>
            </CardHeader>
            <CardContent>
              {transactionsLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full rounded-lg" />
                  <Skeleton className="h-16 w-full rounded-lg" />
                  <Skeleton className="h-16 w-full rounded-lg" />
                </div>
              ) : recentWalletTransactions.length > 0 ? (
                <div className="space-y-3">
                  {recentWalletTransactions.map(transaction => (
                    <div key={transaction.id} className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">
                          {transaction.type === 'transfer' ? 'Transferencia' : transaction.type}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(transaction.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <p className={`font-bold ${transaction.to_wallet === currentWallet.id ? 'text-primary' : 'text-destructive'}`}>
                        {transaction.to_wallet === currentWallet.id ? '+' : '-'}{formatCOP(transaction.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No hay transacciones recientes</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Panel lateral */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Seguridad
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Tu wallet está protegida con encriptación de nivel bancario.
              </p>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Autenticación 2FA</span>
                  <span className="text-primary">Activada</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Encriptación</span>
                  <span className="text-primary">AES-256</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="w-5 h-5" />
                Código QR
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center">
                <div className="w-32 h-32 bg-muted flex items-center justify-center rounded-lg">
                  <QrCode className="w-16 h-16 text-muted-foreground" />
                </div>
              </div>
              <p className="text-xs text-center text-muted-foreground mt-2">
                Escanea para compartir dirección
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
