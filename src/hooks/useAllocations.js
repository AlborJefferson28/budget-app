import { useState, useEffect } from 'react'
import { allocationsService } from '../services'

export const useAllocations = (accountId) => {
  const [allocations, setAllocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchAllocations = async () => {
    if (!accountId) return
    setLoading(true)
    const { data, error } = await allocationsService.getByAccount(accountId)
    if (error) {
      setError(error)
    } else {
      setAllocations(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchAllocations()
  }, [accountId])

  const createAllocation = async (allocation) => {
    const { data, error } = await allocationsService.create(allocation)
    if (!error && data) {
      setAllocations(prev => [...prev, data[0]])
    }
    return { data, error }
  }

  const updateAllocation = async (id, updates) => {
    const { data, error } = await allocationsService.update(id, updates)
    if (!error && data) {
      setAllocations(prev => prev.map(a => a.id === id ? data[0] : a))
    }
    return { data, error }
  }

  const deleteAllocation = async (id) => {
    const error = await allocationsService.delete(id)
    if (!error) {
      setAllocations(prev => prev.filter(a => a.id !== id))
    }
    return { error }
  }

  return {
    allocations,
    loading,
    error,
    createAllocation,
    updateAllocation,
    deleteAllocation,
    refetch: fetchAllocations,
  }
}