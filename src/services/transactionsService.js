import { supabase } from '../supabaseClient'

export const transactionsService = {
  async getByAccount(accountId) {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })
    return { data, error }
  },

  async create(transaction) {
    const { data, error } = await supabase
      .from('transactions')
      .insert(transaction)
      .select()
    return { data, error }
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', id)
      .select()
    return { data, error }
  },

  async delete(id) {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)
    return { error }
  },
}