import { supabase } from '../supabaseClient'

export const budgetEventsService = {
  async getByBudget(budgetId) {
    const { data, error } = await supabase
      .from('budget_events')
      .select('*')
      .eq('budget_id', budgetId)
      .order('changed_at', { ascending: false })
    return { data, error }
  },
}
