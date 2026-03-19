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
    const accountIds = uniqueAccounts.map(account => account.id)
    if (accountIds.length === 0) {
      return { data: uniqueAccounts, error: null }
    }

    const { data: membersData, error: membersError } = await supabase
      .from('account_members')
      .select('account_id, user_id')
      .in('account_id', accountIds)

    // Si no se pueden cargar miembros, devolver cuentas sin bloquear la app.
    if (membersError) {
      return { data: uniqueAccounts, error: null }
    }

    const membersByAccount = {}
    ;(membersData || []).forEach((member) => {
      if (!member?.account_id) return
      if (!membersByAccount[member.account_id]) {
        membersByAccount[member.account_id] = []
      }
      membersByAccount[member.account_id].push(member.user_id)
    })

    const accountsWithParticipantCount = uniqueAccounts.map((account) => {
      const participantIds = new Set(membersByAccount[account.id] || [])
      if (account.owner_id) {
        participantIds.add(account.owner_id)
      }
      return {
        ...account,
        participants_count: participantIds.size || 1,
      }
    })

    return { data: accountsWithParticipantCount, error: null }
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
