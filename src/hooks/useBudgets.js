import { useState, useEffect } from 'react'
import { budgetsService } from '../services'

export const useBudgets = (accountId) => {
  const [budgets, setBudgets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchBudgets = async () => {
    if (!accountId) return
    setLoading(true)
    const { data, error } = await budgetsService.getByAccount(accountId)
    if (error) {
      setError(error)
    } else {
      setBudgets(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchBudgets()
  }, [accountId])

  const createBudget = async (budget) => {
    const { data, error } = await budgetsService.create({ ...budget, account_id: accountId })
    if (!error && data) {
      setBudgets(prev => [...prev, data[0]])
    }
    return { data, error }
  }

  const updateBudget = async (id, updates) => {
    const { data, error } = await budgetsService.update(id, updates)
    if (!error && data) {
      setBudgets(prev => prev.map(b => b.id === id ? data[0] : b))
    }
    return { data, error }
  }

  const deleteBudget = async (id) => {
    const error = await budgetsService.delete(id)
    if (!error) {
      setBudgets(prev => prev.filter(b => b.id !== id))
    }
    return { error }
  }

  return {
    budgets,
    loading,
    error,
    createBudget,
    updateBudget,
    deleteBudget,
    refetch: fetchBudgets,
  }
}