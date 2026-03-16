import { useState, useEffect } from 'react'
import { accountsService } from '../services'
import { useAuth } from '../contexts/AuthContext'

export const useAccounts = () => {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { user } = useAuth()

  const fetchAccounts = async () => {
    if (!user) return
    setLoading(true)
    const { data, error } = await accountsService.getAll(user.id)
    if (error) {
      setError(error)
    } else {
      setAccounts(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchAccounts()
  }, [user])

  const createAccount = async (account) => {
    const { data, error } = await accountsService.create({ ...account, owner_id: user.id })
    if (!error && data) {
      setAccounts(prev => [...prev, data[0]])
    }
    return { data, error }
  }

  const updateAccount = async (id, updates) => {
    const { data, error } = await accountsService.update(id, updates)
    if (!error && data) {
      setAccounts(prev => prev.map(acc => acc.id === id ? data[0] : acc))
    }
    return { data, error }
  }

  const deleteAccount = async (id) => {
    const error = await accountsService.delete(id)
    if (!error) {
      setAccounts(prev => prev.filter(acc => acc.id !== id))
    }
    return { error }
  }

  return {
    accounts,
    loading,
    error,
    createAccount,
    updateAccount,
    deleteAccount,
    refetch: fetchAccounts,
  }
}