import { useState } from 'react'
import { useWallets } from '../hooks/useWallets'
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Search, Plus, Edit, Trash2 } from 'lucide-react'

export default function Wallets({ accountId, setPage }) {
  const { wallets, loading, error, createWallet, updateWallet, deleteWallet } = useWallets(accountId)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ name: '', icon: '💰', balance: 0 })
  const [editing, setEditing] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState('Todas')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (editing) {
      await updateWallet(editing.id, formData)
      setEditing(null)
    } else {
      await createWallet(formData)
    }
    setFormData({ name: '', icon: '💰', balance: 0 })
    setShowForm(false)
  }

  const handleEdit = (wallet) => {
    setEditing(wallet)
    setFormData({ name: wallet.name, icon: wallet.icon, balance: wallet.balance })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar esta billetera?')) {
      await deleteWallet(id)
    }
  }

  const filteredWallets = wallets.filter(wallet => {
    const matchesSearch = wallet.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filter === 'Todas' || wallet.type === filter.toLowerCase()
    return matchesSearch && matchesFilter
  })

  if (loading) return <div className="flex justify-center items-center h-64">Cargando...</div>
  if (error) return <div className="text-red-500">Error: {error.message}</div>

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Mis Wallets</h1>
        <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700">
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
        <div className="flex gap-2">
          {['Todas', 'Cripto', 'Fiat', 'Ahorros'].map((f) => (
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
            <p className="text-gray-500">Crear nueva wallet</p>
          </CardContent>
        </Card>

        {filteredWallets.map(wallet => (
          <Card key={wallet.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">{wallet.icon}</span>
                {wallet.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600 mb-4">${wallet.balance}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleEdit(wallet)}>
                  <Edit className="w-4 h-4 mr-1" />
                  Editar
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleDelete(wallet.id)}>
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
                <Input
                  type="text"
                  placeholder="Ícono"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                />
                <Input
                  type="number"
                  placeholder="Balance"
                  value={formData.balance}
                  onChange={(e) => setFormData({ ...formData, balance: parseFloat(e.target.value) })}
                />
                <div className="flex gap-2">
                  <Button type="submit">
                    {editing ? 'Actualizar' : 'Crear'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditing(null); setFormData({ name: '', icon: '💰', balance: 0 }) }}>
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