import { useState, useEffect } from 'react'
import { walletsService } from '../services'

export const useWallets = (accountId) => {
  const [wallets, setWallets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchWallets = async () => {
    if (!accountId) return
    setLoading(true)
    const { data, error } = await walletsService.getByAccount(accountId)
    if (error) {
      setError(error)
    } else {
      setWallets(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchWallets()
  }, [accountId])

  const createWallet = async (wallet) => {
    const { data, error } = await walletsService.create({ ...wallet, account_id: accountId })
    if (!error && data) {
      setWallets(prev => [...prev, data[0]])
    }
    return { data, error }
  }

  const updateWallet = async (id, updates) => {
    const { data, error } = await walletsService.update(id, updates)
    if (!error && data) {
      setWallets(prev => prev.map(w => w.id === id ? data[0] : w))
    }
    return { data, error }
  }

  const deleteWallet = async (id) => {
    const { data, error } = await walletsService.delete(id)
    if (!error && data) {
      setWallets(prev => prev.filter(w => w.id !== id))
    }
    return { error }
  }

  return {
    wallets,
    loading,
    error,
    createWallet,
    updateWallet,
    deleteWallet,
    refetch: fetchWallets,
  }
}