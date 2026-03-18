import { useState, useEffect } from 'react'
import { accountsService } from '../services'
import { useAuth } from '../contexts/AuthContext'

const sanitizeAccounts = (items = []) => items.filter(account => account?.id)
const normalizeSingleRow = (data) => (data?.id ? data : data?.[0] || null)

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
      setAccounts(sanitizeAccounts(data || []))
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchAccounts()
  }, [user])

  const createAccount = async (account) => {
    const { data, error } = await accountsService.create({ ...account, owner_id: user.id })
    const createdAccount = normalizeSingleRow(data)
    if (!error && createdAccount?.id) {
      setAccounts(prev => sanitizeAccounts([...prev, createdAccount]))
    } else if (!error) {
      await fetchAccounts()
    }
    return { data, error }
  }

  const updateAccount = async (id, updates) => {
    const { data, error } = await accountsService.update(id, updates)
    const updatedAccount = normalizeSingleRow(data)
    if (!error) {
      setAccounts(prev => sanitizeAccounts(prev).map(acc => (
        acc.id === id ? (updatedAccount?.id ? updatedAccount : { ...acc, ...updates }) : acc
      )))
      if (!updatedAccount?.id) {
        await fetchAccounts()
      }
    }
    return { data, error }
  }

  const deleteAccount = async (id) => {
    const error = await accountsService.delete(id)
    if (!error) {
      setAccounts(prev => sanitizeAccounts(prev).filter(acc => acc.id !== id))
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
