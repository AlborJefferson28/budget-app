import { useCallback, useEffect, useRef, useState } from 'react'
import { accountsService } from '../services'
import { useAuth } from '../contexts/AuthContext'

const sanitizeAccounts = (items = []) => items.filter(account => account?.id)
const normalizeSingleRow = (data) => (data?.id ? data : data?.[0] || null)
const ACCOUNTS_CHANGED_EVENT = 'accounts:changed'

const emitAccountsChanged = () => {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(ACCOUNTS_CHANGED_EVENT))
}

export const useAccounts = () => {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const { user } = useAuth()
  const hasLoadedOnceRef = useRef(false)
  const lastUserIdRef = useRef(null)

  const fetchAccounts = useCallback(async () => {
    const currentUserId = user?.id || null
    const didUserChange = lastUserIdRef.current !== currentUserId

    if (didUserChange) {
      lastUserIdRef.current = currentUserId
      hasLoadedOnceRef.current = false
    }

    if (!currentUserId) {
      setAccounts([])
      setError(null)
      setLoading(false)
      setRefreshing(false)
      return
    }

    const isInitialLoad = !hasLoadedOnceRef.current

    if (isInitialLoad) {
      setLoading(true)
    } else {
      setRefreshing(true)
    }

    const { data, error: fetchError } = await accountsService.getAll(currentUserId)
    if (fetchError) {
      setError(fetchError)
    } else {
      setAccounts(sanitizeAccounts(data || []))
      setError(null)
    }

    if (isInitialLoad) {
      hasLoadedOnceRef.current = true
      setLoading(false)
    } else {
      setRefreshing(false)
    }
  }, [user?.id])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const handleAccountsChanged = () => {
      fetchAccounts()
    }

    window.addEventListener(ACCOUNTS_CHANGED_EVENT, handleAccountsChanged)
    return () => window.removeEventListener(ACCOUNTS_CHANGED_EVENT, handleAccountsChanged)
  }, [fetchAccounts])

  const createAccount = async (account) => {
    const { data, error } = await accountsService.create({ ...account, owner_id: user.id })
    const createdAccount = normalizeSingleRow(data)
    if (!error) {
      if (createdAccount?.id) {
        setAccounts(prev => sanitizeAccounts([...prev, createdAccount]))
      } else {
        await fetchAccounts()
      }
      emitAccountsChanged()
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
      emitAccountsChanged()
    }
    return { data, error }
  }

  const deleteAccount = async (id) => {
    const { error } = await accountsService.delete(id)
    if (!error) {
      setAccounts(prev => sanitizeAccounts(prev).filter(acc => acc.id !== id))
      emitAccountsChanged()
    }
    return { error }
  }

  return {
    accounts,
    loading,
    refreshing,
    error,
    createAccount,
    updateAccount,
    deleteAccount,
    refetch: fetchAccounts,
  }
}
