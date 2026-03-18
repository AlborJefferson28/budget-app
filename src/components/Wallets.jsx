import { useState } from 'react'
import { useWallets } from '../hooks/useWallets'
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Search, Plus, Edit, Trash2 } from 'lucide-react'
import WalletDetail from './WalletDetail'
import { formatCOP, parseCOP } from '../lib/currency'
import { IconGlyph, WALLET_ICON_OPTIONS, normalizeIconKey } from '../lib/icons'
import { WalletsSkeleton } from './RouteSkeletons'

const QUICK_BALANCE_STEPS = [10000, 50000, 100000]

const normalizeCOPAmount = (value) => {
  const parsed = parseCOP(value)
  return Math.max(0, Math.round(parsed))
}

export default function Wallets({ accountId, setPage }) {
  const { wallets, loading, error, createWallet, updateWallet, deleteWallet, refetch } = useWallets(accountId)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ name: '', icon: 'wallet', balance: 0 })
  const [balanceInput, setBalanceInput] = useState('0')
  const [editing, setEditing] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedWallet, setSelectedWallet] = useState(null)

  const openCreateForm = () => {
    setEditing(null)
    setFormData({ name: '', icon: 'wallet', balance: 0 })
    setBalanceInput('0')
    setShowForm(true)
  }

  const resetForm = () => {
    setFormData({ name: '', icon: 'wallet', balance: 0 })
    setBalanceInput('0')
    setEditing(null)
    setShowForm(false)
  }

  const applyBalanceQuickAmount = (delta) => {
    const nextValue = Math.max(0, normalizeCOPAmount(balanceInput) + delta)
    setBalanceInput(String(nextValue))
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
      await createWallet(payload)
    }
    resetForm()
  }

  const handleEdit = (wallet) => {
    setEditing(wallet)
    setFormData({ name: wallet.name, icon: normalizeIconKey(wallet.icon, 'wallet'), balance: wallet.balance })
    setBalanceInput(String(normalizeCOPAmount(wallet.balance)))
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar esta billetera?')) {
      return await deleteWallet(id)
    }
    return { error: null }
  }

  const filteredWallets = wallets.filter(wallet => {
    const matchesSearch = wallet.name.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  if (loading) return <WalletsSkeleton />
  if (error) return <div className="text-destructive">Error: {error.message}</div>

  if (selectedWallet) {
    return (
      <WalletDetail
        wallet={selectedWallet}
        onBack={() => { setSelectedWallet(null); refetch(); }}
        onDelete={handleDelete}
        updateWallet={updateWallet}
      />
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold">Mis billeteras</h1>
        <Button onClick={openCreateForm} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Nueva billetera
        </Button>
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
              <p className="text-2xl font-bold text-primary mb-4">{formatCOP(wallet.balance)}</p>
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
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

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
                    placeholder="0"
                    value={balanceInput}
                    onFocus={() => {
                      if (balanceInput === '0') setBalanceInput('')
                    }}
                    onChange={(e) => {
                      const nextValue = e.target.value
                      if (nextValue === '') {
                        setBalanceInput('')
                        return
                      }
                      if (/^[\d.,\s]+$/.test(nextValue)) {
                        setBalanceInput(nextValue)
                      }
                    }}
                    onBlur={() => {
                      if (!balanceInput) {
                        setBalanceInput('0')
                        return
                      }
                      setBalanceInput(String(normalizeCOPAmount(balanceInput)))
                    }}
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    {QUICK_BALANCE_STEPS.map((quickAmount) => (
                      <Button
                        key={`add-${quickAmount}`}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => applyBalanceQuickAmount(quickAmount)}
                      >
                        + {formatCOP(quickAmount)}
                      </Button>
                    ))}
                    {QUICK_BALANCE_STEPS.map((quickAmount) => (
                      <Button
                        key={`sub-${quickAmount}`}
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
                    Vista previa: <span className="font-semibold text-foreground">{formatCOP(normalizeCOPAmount(balanceInput))}</span>
                  </p>
                </div>
                <div className="flex flex-col-reverse sm:flex-row gap-2">
                  <Button type="submit" className="w-full sm:w-auto">
                    {editing ? 'Actualizar' : 'Crear'}
                  </Button>
                  <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={resetForm}>
                    Cancelar
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
