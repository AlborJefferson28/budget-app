import { useState, useEffect } from 'react'
import { transactionsService } from '../services'

export const useTransactions = (accountId) => {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchTransactions = async () => {
    if (!accountId) return
    setLoading(true)
    const { data, error } = await transactionsService.getByAccount(accountId)
    if (error) {
      setError(error)
    } else {
      setTransactions(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchTransactions()
  }, [accountId])

  const createTransaction = async (transaction) => {
    const { data, error } = await transactionsService.create({ ...transaction, account_id: accountId })
    if (!error && data) {
      setTransactions(prev => [data[0], ...prev])
    }
    return { data, error }
  }

  const updateTransaction = async (id, updates) => {
    const { data, error } = await transactionsService.update(id, updates)
    if (!error && data) {
      setTransactions(prev => prev.map(t => t.id === id ? data[0] : t))
    }
    return { data, error }
  }

  const deleteTransaction = async (id) => {
    const error = await transactionsService.delete(id)
    if (!error) {
      setTransactions(prev => prev.filter(t => t.id !== id))
    }
    return { error }
  }

  return {
    transactions,
    loading,
    error,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    refetch: fetchTransactions,
  }
}