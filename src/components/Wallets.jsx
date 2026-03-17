import { useState } from 'react'
import { useWallets } from '../hooks/useWallets'
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Search, Plus, Edit, Trash2 } from 'lucide-react'
import WalletDetail from './WalletDetail'
import { formatCOP, parseCOP } from '../lib/currency'

const iconOptions = [
  '💰', '🏦', '💳', '📱', '💸', '🤑', '💵', '💎', '🏆', '🎯', '🚀', '🌟',
  '💼', '🛒', '🏠', '🚗', '✈️', '🍔', '🎮', '📚', '🎵', '🏃', '💪', '❤️'
]

const COP_NUMBER_FORMATTER = new Intl.NumberFormat('es-CO', {
  maximumFractionDigits: 0,
})

const normalizeCOPAmount = (value) => {
  const parsed = parseCOP(value)
  return Math.max(0, Math.round(parsed))
}

const formatCOPNumber = (value) => COP_NUMBER_FORMATTER.format(normalizeCOPAmount(value))

export default function Wallets({ accountId, setPage }) {
  const { wallets, loading, error, createWallet, updateWallet, deleteWallet, refetch } = useWallets(accountId)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ name: '', icon: '💰', balance: 0 })
  const [balanceInput, setBalanceInput] = useState('')
  const [editing, setEditing] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedWallet, setSelectedWallet] = useState(null)

  const openCreateForm = () => {
    setEditing(null)
    setFormData({ name: '', icon: '💰', balance: 0 })
    setBalanceInput('')
    setShowForm(true)
  }

  const resetForm = () => {
    setFormData({ name: '', icon: '💰', balance: 0 })
    setBalanceInput('')
    setEditing(null)
    setShowForm(false)
  }

  const applyBalanceQuickAmount = (amount) => {
    const nextValue = normalizeCOPAmount(balanceInput) + amount
    setBalanceInput(formatCOPNumber(nextValue))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const payload = {
      ...formData,
      name: formData.name.trim(),
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
    setFormData({ name: wallet.name, icon: wallet.icon, balance: wallet.balance })
    setBalanceInput(formatCOPNumber(wallet.balance))
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

  if (loading) return <div className="flex justify-center items-center h-64">Cargando...</div>
  if (error) return <div className="text-red-500">Error: {error.message}</div>

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
        <h1 className="text-2xl sm:text-3xl font-bold">Mis Wallets</h1>
        <Button onClick={openCreateForm} className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Nueva Wallet
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            type="text"
            placeholder="Buscar wallets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="text-sm text-slate-500 flex items-center">
          {filteredWallets.length} wallet{filteredWallets.length === 1 ? '' : 's'}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="border-dashed border-2 border-gray-300 hover:border-blue-400 transition-colors cursor-pointer" onClick={openCreateForm}>
          <CardContent className="flex flex-col items-center justify-center h-48">
            <Plus className="w-12 h-12 text-gray-400 mb-2" />
            <p className="text-gray-500">Crear nueva wallet</p>
          </CardContent>
        </Card>

        {filteredWallets.map(wallet => (
          <Card key={wallet.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setSelectedWallet(wallet)}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">{wallet.icon}</span>
                {wallet.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600 mb-4">{formatCOP(wallet.balance)}</p>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
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
                  <Input
                    type="text"
                    placeholder="Ícono personalizado"
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    className="mb-2"
                  />
                  <div className="grid grid-cols-5 sm:grid-cols-6 gap-2">
                    {iconOptions.map((icon) => (
                      <Button
                        key={icon}
                        type="button"
                        variant={formData.icon === icon ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFormData({ ...formData, icon })}
                        className="text-lg"
                      >
                        {icon}
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
                    onChange={(e) => setBalanceInput(e.target.value)}
                    onBlur={() => setBalanceInput(formatCOPNumber(balanceInput))}
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    {[10000, 50000, 100000].map((quickAmount) => (
                      <Button
                        key={quickAmount}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => applyBalanceQuickAmount(quickAmount)}
                      >
                        + {formatCOP(quickAmount)}
                      </Button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Vista previa: <span className="font-semibold text-slate-700">{formatCOP(normalizeCOPAmount(balanceInput))}</span>
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
          Volver al Dashboard
        </Button>
      </div>
    </div>
  )
}
