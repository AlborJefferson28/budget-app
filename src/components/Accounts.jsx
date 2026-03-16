import { useState } from 'react'
import { useAccounts } from '../hooks/useAccounts'

export default function Accounts({ setPage, setSelectedAccount }) {
  const { accounts, loading, error, createAccount, updateAccount, deleteAccount } = useAccounts()
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ name: '' })
  const [editing, setEditing] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (editing) {
      await updateAccount(editing.id, formData)
      setEditing(null)
    } else {
      await createAccount(formData)
    }
    setFormData({ name: '' })
    setShowForm(false)
  }

  const handleEdit = (account) => {
    setEditing(account)
    setFormData({ name: account.name })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar esta cuenta?')) {
      await deleteAccount(id)
    }
  }

  if (loading) return <div>Cargando...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <div style={{ padding: '20px' }}>
      <h2>Cuentas Financieras</h2>
      <button onClick={() => setShowForm(true)} style={{ padding: '10px 20px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 8 }}>
        Nueva Cuenta
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ marginTop: '20px', background: '#fff', padding: '20px', borderRadius: 8 }}>
          <h3>{editing ? 'Editar Cuenta' : 'Nueva Cuenta'}</h3>
          <input
            type="text"
            placeholder="Nombre de la cuenta"
            value={formData.name}
            onChange={(e) => setFormData({ name: e.target.value })}
            required
            style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
          />
          <button type="submit" style={{ padding: '10px 20px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 8 }}>
            {editing ? 'Actualizar' : 'Crear'}
          </button>
          <button type="button" onClick={() => { setShowForm(false); setEditing(null); setFormData({ name: '' }) }} style={{ marginLeft: '10px', padding: '10px 20px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8 }}>
            Cancelar
          </button>
        </form>
      )}

      <div style={{ marginTop: '20px' }}>
        {accounts.map(account => (
          <div key={account.id} style={{ background: '#fff', padding: '16px', marginBottom: '12px', borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h3>{account.name}</h3>
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button onClick={() => handleEdit(account)} style={{ padding: '5px 10px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 4 }}>
                Editar
              </button>
              <button onClick={() => handleDelete(account.id)} style={{ padding: '5px 10px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 4 }}>
                Eliminar
              </button>
              <button onClick={() => { setSelectedAccount(account.id); setPage('wallets') }} style={{ padding: '5px 10px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 4 }}>
                Ver Detalles
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