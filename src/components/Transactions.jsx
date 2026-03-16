import { useState } from 'react'
import { useTransactions } from '../hooks/useTransactions'
import { useWallets } from '../hooks/useWallets'
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/Select'
import { Search, Plus, Edit, Trash2, ArrowRightLeft, TrendingUp, TrendingDown } from 'lucide-react'

export default function Transactions({ accountId, setPage }) {
  const { transactions, loading, error, createTransaction, updateTransaction, deleteTransaction } = useTransactions(accountId)
  const { wallets } = useWallets(accountId)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ from_wallet: '', to_wallet: '', amount: 0, type: 'transfer' })
  const [editing, setEditing] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState('Todas')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (editing) {
      await updateTransaction(editing.id, formData)
      setEditing(null)
    } else {
      await createTransaction(formData)
    }
    setFormData({ from_wallet: '', to_wallet: '', amount: 0, type: 'transfer' })
    setShowForm(false)
  }

  const handleEdit = (transaction) => {
    setEditing(transaction)
    setFormData({
      from_wallet: transaction.from_wallet,
      to_wallet: transaction.to_wallet,
      amount: transaction.amount,
      type: transaction.type
    })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar esta transacción?')) {
      await deleteTransaction(id)
    }
  }

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         wallets.find(w => w.id === transaction.from_wallet)?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         wallets.find(w => w.id === transaction.to_wallet)?.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filter === 'Todas' || transaction.type === filter.toLowerCase()
    return matchesSearch && matchesFilter
  })

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'transfer': return <ArrowRightLeft className="w-5 h-5" />
      case 'income': return <TrendingUp className="w-5 h-5 text-green-600" />
      case 'expense': return <TrendingDown className="w-5 h-5 text-red-600" />
      default: return <ArrowRightLeft className="w-5 h-5" />
    }
  }

  const getTransactionColor = (type) => {
    switch (type) {
      case 'income': return 'text-green-600'
      case 'expense': return 'text-red-600'
      default: return 'text-blue-600'
    }
  }

  if (loading) return <div className="flex justify-center items-center h-64">Cargando...</div>
  if (error) return <div className="text-red-500">Error: {error.message}</div>

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Transacciones</h1>
        <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Nueva Transacción
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            type="text"
            placeholder="Buscar transacciones..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {['Todas', 'Transferencias', 'Ingresos', 'Gastos'].map((f) => (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f)}
            >
              {f}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="border-dashed border-2 border-gray-300 hover:border-blue-400 transition-colors cursor-pointer" onClick={() => setShowForm(true)}>
          <CardContent className="flex flex-col items-center justify-center h-48">
            <Plus className="w-12 h-12 text-gray-400 mb-2" />
            <p className="text-gray-500">Crear nueva transacción</p>
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
              <p className="text-sm text-gray-600 mb-2">
                {transaction.type === 'transfer' 
                  ? `De ${wallets.find(w => w.id === transaction.from_wallet)?.name} a ${wallets.find(w => w.id === transaction.to_wallet)?.name}`
                  : `Wallet: ${wallets.find(w => w.id === (transaction.from_wallet || transaction.to_wallet))?.name}`
                }
              </p>
              <p className={`text-2xl font-bold mb-2 ${getTransactionColor(transaction.type)}`}>
                ${transaction.amount}
              </p>
              <p className="text-sm text-gray-500 mb-4">
                {new Date(transaction.created_at).toLocaleDateString()}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleEdit(transaction)}>
                  <Edit className="w-4 h-4 mr-1" />
                  Editar
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleDelete(transaction.id)}>
                  <Trash2 className="w-4 h-4 mr-1" />
                  Eliminar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>{editing ? 'Editar Transacción' : 'Nueva Transacción'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Select value={formData.from_wallet} onValueChange={(value) => setFormData({ ...formData, from_wallet: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar billetera origen" />
                  </SelectTrigger>
                  <SelectContent>
                    {wallets.map(wallet => (
                      <SelectItem key={wallet.id} value={wallet.id}>
                        {wallet.icon} {wallet.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={formData.to_wallet} onValueChange={(value) => setFormData({ ...formData, to_wallet: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar billetera destino" />
                  </SelectTrigger>
                  <SelectContent>
                    {wallets.map(wallet => (
                      <SelectItem key={wallet.id} value={wallet.id}>
                        {wallet.icon} {wallet.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  placeholder="Monto"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                  required
                />
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
                <div className="flex gap-2">
                  <Button type="submit">
                    {editing ? 'Actualizar' : 'Crear'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditing(null); setFormData({ from_wallet: '', to_wallet: '', amount: 0, type: 'transfer' }) }}>
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