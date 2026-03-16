import { useState } from 'react'
import { useTransactions } from '../hooks/useTransactions'
import { useWallets } from '../hooks/useWallets'

export default function Transactions({ accountId, setPage }) {
  const { transactions, loading, error, createTransaction, updateTransaction, deleteTransaction } = useTransactions(accountId)
  const { wallets } = useWallets(accountId)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ from_wallet: '', to_wallet: '', amount: 0, type: 'transfer' })
  const [editing, setEditing] = useState(null)

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

  if (loading) return <div>Cargando...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <div style={{ padding: '20px' }}>
      <h2>Transacciones</h2>
      <button onClick={() => setShowForm(true)} style={{ padding: '10px 20px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 8 }}>
        Nueva Transacción
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ marginTop: '20px', background: '#fff', padding: '20px', borderRadius: 8 }}>
          <h3>{editing ? 'Editar Transacción' : 'Nueva Transacción'}</h3>
          <select
            value={formData.from_wallet}
            onChange={(e) => setFormData({ ...formData, from_wallet: e.target.value })}
            required
            style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
          >
            <option value="">Seleccionar billetera origen</option>
            {wallets.map(wallet => (
              <option key={wallet.id} value={wallet.id}>{wallet.name}</option>
            ))}
          </select>
          <select
            value={formData.to_wallet}
            onChange={(e) => setFormData({ ...formData, to_wallet: e.target.value })}
            required
            style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
          >
            <option value="">Seleccionar billetera destino</option>
            {wallets.map(wallet => (
              <option key={wallet.id} value={wallet.id}>{wallet.name}</option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Monto"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
            required
            style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
          />
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
          >
            <option value="transfer">Transferencia</option>
            <option value="income">Ingreso</option>
            <option value="expense">Gasto</option>
          </select>
          <button type="submit" style={{ padding: '10px 20px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 8 }}>
            {editing ? 'Actualizar' : 'Crear'}
          </button>
          <button type="button" onClick={() => { setShowForm(false); setEditing(null); setFormData({ from_wallet: '', to_wallet: '', amount: 0, type: 'transfer' }) }} style={{ marginLeft: '10px', padding: '10px 20px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8 }}>
            Cancelar
          </button>
        </form>
      )}

      <div style={{ marginTop: '20px' }}>
        {transactions.map(transaction => (
          <div key={transaction.id} style={{ background: '#fff', padding: '16px', marginBottom: '12px', borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <p>De: {wallets.find(w => w.id === transaction.from_wallet)?.name} A: {wallets.find(w => w.id === transaction.to_wallet)?.name}</p>
            <p>Monto: ${transaction.amount} - Tipo: {transaction.type}</p>
            <p>Fecha: {new Date(transaction.created_at).toLocaleDateString()}</p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button onClick={() => handleEdit(transaction)} style={{ padding: '5px 10px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 4 }}>
                Editar
              </button>
              <button onClick={() => handleDelete(transaction.id)} style={{ padding: '5px 10px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 4 }}>
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>

      <button onClick={() => setPage('dashboard')} style={{ marginTop: '20px', padding: '10px 20px', background: '#6b7280', color: '#fff', border: 'none', borderRadius: 8 }}>
        Volver al Dashboard
      </button>
    </div>
  )
}