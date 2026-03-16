import { useState } from 'react'
import { useBudgets } from '../hooks/useBudgets'

export default function Budgets({ accountId, setPage }) {
  const { budgets, loading, error, createBudget, updateBudget, deleteBudget } = useBudgets(accountId)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ name: '', target: 0, icon: '💰' })
  const [editing, setEditing] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (editing) {
      await updateBudget(editing.id, formData)
      setEditing(null)
    } else {
      await createBudget(formData)
    }
    setFormData({ name: '', target: 0, icon: '💰' })
    setShowForm(false)
  }

  const handleEdit = (budget) => {
    setEditing(budget)
    setFormData({ name: budget.name, target: budget.target, icon: budget.icon })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este presupuesto?')) {
      await deleteBudget(id)
    }
  }

  if (loading) return <div>Cargando...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <div style={{ padding: '20px' }}>
      <h2>Presupuestos</h2>
      <button onClick={() => setShowForm(true)} style={{ padding: '10px 20px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 8 }}>
        Nuevo Presupuesto
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ marginTop: '20px', background: '#fff', padding: '20px', borderRadius: 8 }}>
          <h3>{editing ? 'Editar Presupuesto' : 'Nuevo Presupuesto'}</h3>
          <input
            type="text"
            placeholder="Nombre"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
          />
          <input
            type="number"
            placeholder="Objetivo"
            value={formData.target}
            onChange={(e) => setFormData({ ...formData, target: parseFloat(e.target.value) })}
            required
            style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
          />
          <input
            type="text"
            placeholder="Ícono"
            value={formData.icon}
            onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
            style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
          />
          <button type="submit" style={{ padding: '10px 20px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 8 }}>
            {editing ? 'Actualizar' : 'Crear'}
          </button>
          <button type="button" onClick={() => { setShowForm(false); setEditing(null); setFormData({ name: '', target: 0, icon: '💰' }) }} style={{ marginLeft: '10px', padding: '10px 20px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8 }}>
            Cancelar
          </button>
        </form>
      )}

      <div style={{ marginTop: '20px' }}>
        {budgets.map(budget => (
          <div key={budget.id} style={{ background: '#fff', padding: '16px', marginBottom: '12px', borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h3>{budget.icon} {budget.name}</h3>
            <p>Objetivo: ${budget.target}</p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button onClick={() => handleEdit(budget)} style={{ padding: '5px 10px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 4 }}>
                Editar
              </button>
              <button onClick={() => handleDelete(budget.id)} style={{ padding: '5px 10px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 4 }}>
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