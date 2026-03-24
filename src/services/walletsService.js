import { supabase } from '../supabaseClient'

export const walletsService = {
  async getByAccount(accountId) {
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('account_id', accountId)
      .is('deleted_at', null)
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
    const { data, error } = await supabase
      .from('wallets')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .select()

    return { data, error }
  },
}