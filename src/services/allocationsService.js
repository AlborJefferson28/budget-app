import { supabase } from '../supabaseClient'

export const allocationsService = {
  async getByAccount(accountId) {
    const { data, error } = await supabase
      .from('allocations')
      .select('*, wallets!inner(name, account_id), budgets!inner(name, account_id)')
      .eq('wallets.account_id', accountId)
      .eq('budgets.account_id', accountId)
    return { data, error }
  },

  async create(allocation) {
    const { data, error } = await supabase
      .from('allocations')
      .insert(allocation)
      .select()
    return { data, error }
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('allocations')
      .update(updates)
      .eq('id', id)
      .select()
    return { data, error }
  },

  async delete(id) {
    const { error } = await supabase
      .from('allocations')
      .delete()
      .eq('id', id)
    return { error }
  },
}