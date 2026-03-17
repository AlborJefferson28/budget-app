import { supabase } from '../supabaseClient'

export const accountTransfersService = {
  async getRecent(limit = 100) {
    const { data, error } = await supabase
      .from('account_transfers')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    return { data, error }
  },

  async contributeToSharedAccount({ fromWalletId, toWalletId, amount, note = '' }) {
    const { data, error } = await supabase.rpc('contribute_to_shared_account', {
      p_from_wallet: fromWalletId,
      p_to_wallet: toWalletId,
      p_amount: amount,
      p_note: note || null,
    })

    return { data, error }
  },
}
