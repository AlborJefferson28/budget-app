import { supabase } from '../supabaseClient'

export const budgetsService = {
  async getByAccount(accountId) {
    const { data, error } = await supabase
      .from('budgets')
      .select('*')
      .eq('account_id', accountId)
    return { data, error }
  },

  async create(budget) {
    const { data, error } = await supabase
      .from('budgets')
      .insert(budget)
      .select()
    return { data, error }
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('budgets')
      .update(updates)
      .eq('id', id)
      .select()
    return { data, error }
  },

  async delete(id) {
    const { error } = await supabase
      .from('budgets')
      .delete()
      .eq('id', id)
    return { error }
  },
}