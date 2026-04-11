import { supabase } from '../supabaseClient'

export const transactionsService = {
  async getByAccount(accountId) {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('account_id', accountId)
      .order('occurred_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
    return { data, error }
  },

  async create(transaction) {
    // La actualización de saldos en la tabla 'wallets' ahora es automática
    // gracias al trigger de base de datos 'trg_update_wallet_balance'.
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
    // El trigger en la DB también se encarga de revertir el saldo al eliminar.
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)
    return { error }
  },
}

