import { useEffect, useState } from 'react'
import { budgetEventsService } from '../services'

export const useBudgetEvents = (budgetId) => {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchEvents = async () => {
    if (!budgetId) {
      setEvents([])
      setError(null)
      setLoading(false)
      return
    }

    setLoading(true)
    const { data, error: fetchError } = await budgetEventsService.getByBudget(budgetId)

    if (fetchError) {
      setError(fetchError)
      setEvents([])
    } else {
      setError(null)
      setEvents(data || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchEvents()
  }, [budgetId])

  return {
    events,
    loading,
    error,
    refetch: fetchEvents,
  }
}
