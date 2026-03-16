import { supabase } from '../supabaseClient'

export const walletsService = {
  async getByAccount(accountId) {
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('account_id', accountId)
    return { data, error }
  },

  async create(wallet) {
    const { data, error } = await supabase
      .from('wallets')
      .insert(wallet)
      .select()
    return { data, error }
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('wallets')
      .update(updates)
      .eq('id', id)
      .select()
    return { data, error }
  },

  async delete(id) {
    const response = await supabase
      .from('wallets')
      .delete()
      .eq('id', id)

    // Supabase returns 204 (No Content) on successful deletion
    // In this case, error is null and data is null, which is success
    return { error: response.error, success: !response.error }
  },
}