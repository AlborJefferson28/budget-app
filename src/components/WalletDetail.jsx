import { useState } from 'react'
import { useTransactions } from '../hooks/useTransactions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/Select'
import { ArrowLeft, Edit, Trash2, Download, Shield, QrCode, Check, X } from 'lucide-react'

const iconOptions = [
  '💰', '🏦', '💳', '📱', '💸', '🤑', '💵', '💎', '🏆', '🎯', '🚀', '🌟',
  '💼', '🛒', '🏠', '🚗', '✈️', '🍔', '🎮', '📚', '🎵', '🏃', '💪', '❤️'
]

export default function WalletDetail({ wallet, onBack, onEdit, onDelete, updateWallet }) {
  const { transactions, loading: transactionsLoading } = useTransactions(wallet.account_id)
  const [showQR, setShowQR] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    name: wallet.name,
    icon: wallet.icon,
    balance: wallet.balance
  })

  // Filtrar transacciones de esta wallet
  const walletTransactions = transactions.filter(t =>
    t.from_wallet === wallet.id || t.to_wallet === wallet.id
  ).slice(0, 5) // Últimas 5

  const handleDelete = async () => {
    if (window.confirm('¿Estás seguro de eliminar esta billetera?')) {
      const result = await onDelete(wallet.id)
      if (!result.error) {
        onBack()
      } else {
        alert('Error al eliminar la billetera: ' + result.error.message)
      }
    }
  }

  const handleEditToggle = () => {
    if (isEditing) {
      // Cancelar
      setEditForm({
        name: wallet.name,
        icon: wallet.icon,
        balance: wallet.balance
      })
    }
    setIsEditing(!isEditing)
  }

  const handleSave = async () => {
    await updateWallet(wallet.id, editForm)
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
                        {iconOptions.map((icon) => (
                          <SelectItem key={icon} value={icon}>
                            {icon}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-4xl">{wallet.icon}</span>
                  )}
                  <div className="min-w-0">
                    {isEditing ? (
                      <Input
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="text-2xl font-bold"
                      />
                    ) : (
                      <CardTitle className="text-2xl">{wallet.name}</CardTitle>
                    )}
                    <CardDescription>Wallet ID: {wallet.id}</CardDescription>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-500">Balance</p>
                  {isEditing ? (
                    <Input
                      type="number"
                      value={editForm.balance}
                      onChange={(e) => setEditForm({ ...editForm, balance: parseFloat(e.target.value) })}
                      className="text-3xl font-bold"
                    />
                  ) : (
                    <p className="text-3xl font-bold text-green-600">${wallet.balance}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-500">Tipo</p>
                  <p className="text-lg">{wallet.type || 'Fiat'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Moneda</p>
                  <p className="text-lg">USD</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Última actividad</p>
                  <p className="text-lg">Hace 2 días</p>
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
                <p>Cargando transacciones...</p>
              ) : walletTransactions.length > 0 ? (
                <div className="space-y-3">
                  {walletTransactions.map(transaction => (
                    <div key={transaction.id} className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">
                          {transaction.type === 'transfer' ? 'Transferencia' : transaction.type}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(transaction.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <p className={`font-bold ${transaction.to_wallet === wallet.id ? 'text-green-600' : 'text-red-600'}`}>
                        {transaction.to_wallet === wallet.id ? '+' : '-'}${transaction.amount}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No hay transacciones recientes</p>
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
              <p className="text-sm text-gray-600 mb-4">
                Tu wallet está protegida con encriptación de nivel bancario.
              </p>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Autenticación 2FA</span>
                  <span className="text-green-600">Activada</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Encriptación</span>
                  <span className="text-green-600">AES-256</span>
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
                <div className="w-32 h-32 bg-gray-200 flex items-center justify-center rounded-lg">
                  <QrCode className="w-16 h-16 text-gray-400" />
                </div>
              </div>
              <p className="text-xs text-center text-gray-500 mt-2">
                Escanea para compartir dirección
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
