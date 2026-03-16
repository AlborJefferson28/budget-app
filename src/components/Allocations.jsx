import { useState } from 'react'
import { useAllocations } from '../hooks/useAllocations'
import { useWallets } from '../hooks/useWallets'
import { useBudgets } from '../hooks/useBudgets'

export default function Allocations({ accountId, setPage }) {
  const { allocations, loading, error, createAllocation, updateAllocation, deleteAllocation } = useAllocations(accountId)
  const { wallets } = useWallets(accountId)
  const { budgets } = useBudgets(accountId)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ wallet_id: '', budget_id: '', amount: 0 })
  const [editing, setEditing] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (editing) {
      await updateAllocation(editing.id, formData)
      setEditing(null)
    } else {
      await createAllocation(formData)
    }
    setFormData({ wallet_id: '', budget_id: '', amount: 0 })
    setShowForm(false)
  }

  const handleEdit = (allocation) => {
    setEditing(allocation)
    setFormData({
      wallet_id: allocation.wallet_id,
      budget_id: allocation.budget_id,
      amount: allocation.amount
    })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar esta asignación?')) {
      await deleteAllocation(id)
    }
  }

  if (loading) return <div>Cargando...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <div style={{ padding: '20px' }}>
      <h2>Asignaciones</h2>
      <button onClick={() => setShowForm(true)} style={{ padding: '10px 20px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 8 }}>
        Nueva Asignación
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ marginTop: '20px', background: '#fff', padding: '20px', borderRadius: 8 }}>
          <h3>{editing ? 'Editar Asignación' : 'Nueva Asignación'}</h3>
          <select
            value={formData.wallet_id}
            onChange={(e) => setFormData({ ...formData, wallet_id: e.target.value })}
            required
            style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
          >
            <option value="">Seleccionar billetera</option>
            {wallets.map(wallet => (
              <option key={wallet.id} value={wallet.id}>{wallet.name}</option>
            ))}
          </select>
          <select
            value={formData.budget_id}
            onChange={(e) => setFormData({ ...formData, budget_id: e.target.value })}
            required
            style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
          >
            <option value="">Seleccionar presupuesto</option>
            {budgets.map(budget => (
              <option key={budget.id} value={budget.id}>{budget.name}</option>
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
          <button type="submit" style={{ padding: '10px 20px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 8 }}>
            {editing ? 'Actualizar' : 'Crear'}
          </button>
          <button type="button" onClick={() => { setShowForm(false); setEditing(null); setFormData({ wallet_id: '', budget_id: '', amount: 0 }) }} style={{ marginLeft: '10px', padding: '10px 20px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8 }}>
            Cancelar
          </button>
        </form>
      )}

      <div style={{ marginTop: '20px' }}>
        {allocations.map(allocation => (
          <div key={allocation.id} style={{ background: '#fff', padding: '16px', marginBottom: '12px', borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <p>Billetera: {allocation.wallets?.name}</p>
            <p>Presupuesto: {allocation.budgets?.name}</p>
            <p>Monto: ${allocation.amount}</p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button onClick={() => handleEdit(allocation)} style={{ padding: '5px 10px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 4 }}>
                Editar
              </button>
              <button onClick={() => handleDelete(allocation.id)} style={{ padding: '5px 10px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 4 }}>
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