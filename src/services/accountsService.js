import { supabase } from '../supabaseClient'

export const accountsService = {
  async getAll(userId) {
    // Get accounts where user is owner
    const { data: owned, error: ownedError } = await supabase
      .from('accounts')
      .select('*')
      .eq('owner_id', userId)

    if (ownedError) return { data: null, error: ownedError }

    // Get accounts where user is member
    const { data: memberAccounts, error: memberError } = await supabase
      .from('account_members')
      .select('accounts(*)')
      .eq('user_id', userId)

    if (memberError) return { data: null, error: memberError }

    const memberAccountData = (memberAccounts || [])
      .map(member => member?.accounts)
      .filter(account => account?.id)

    // Combine and remove duplicates
    const allAccounts = [...(owned || []), ...memberAccountData].filter(account => account?.id)
    const uniqueAccounts = allAccounts.filter((acc, index, self) =>
      index === self.findIndex(a => a.id === acc.id)
    )

    return { data: uniqueAccounts, error: null }
  },

  async create(account) {
    const { data, error } = await supabase
      .from('accounts')
      .insert(account)
      .select('*')
      .single()
    return { data, error }
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('accounts')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single()
    return { data, error }
  },

  async delete(id) {
    const { error } = await supabase
      .from('accounts')
      .delete()
      .eq('id', id)
    return { error }
  },
}
