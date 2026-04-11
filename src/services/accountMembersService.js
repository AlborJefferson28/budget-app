import { supabase } from '../supabaseClient'

export const accountMembersService = {
  async getByAccount(accountId) {
    const { data, error } = await supabase
      .from('account_members')
      .select('*, profiles(name)')
      .eq('account_id', accountId)
    return { data, error }
  },

  async addMember(accountId, userId, role = 'member', idempotencyKey = null) {
    const { data, error } = await supabase
      .from('account_members')
      .insert({ account_id: accountId, user_id: userId, role, idempotency_key: idempotencyKey })
      .select()
    return { data, error }
  },

  async updateRole(accountId, userId, role) {
    const { data, error } = await supabase
      .from('account_members')
      .update({ role })
      .eq('account_id', accountId)
      .eq('user_id', userId)
      .select()
    return { data, error }
  },

  async removeMember(accountId, userId) {
    const { error } = await supabase
      .from('account_members')
      .delete()
      .eq('account_id', accountId)
      .eq('user_id', userId)
    return { error }
  },
}