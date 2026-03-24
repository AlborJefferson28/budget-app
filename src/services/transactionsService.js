import { supabase } from '../supabaseClient'

const toNumeric = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const applyIncomingTransferToDestinationWallet = async (transaction) => {
  const isTransfer = transaction?.type === 'transfer'
  const destinationWalletId = transaction?.to_wallet
  const amount = toNumeric(transaction?.amount)

  if (!isTransfer || !destinationWalletId || amount <= 0) {
    return { rollback: null, error: null }
  }

  const { data: destinationWallet, error: walletError } = await supabase
    .from('wallets')
    .select('id, balance')
    .eq('id', destinationWalletId)
    .single()

  if (walletError) {
    return { rollback: null, error: walletError }
  }

  const previousBalance = toNumeric(destinationWallet.balance)
  const nextBalance = previousBalance + amount

  const { error: updateError } = await supabase
    .from('wallets')
    .update({ balance: nextBalance })
    .eq('id', destinationWallet.id)

  if (updateError) {
    return { rollback: null, error: updateError }
  }

  const rollback = async () => {
    await supabase
      .from('wallets')
      .update({ balance: previousBalance })
      .eq('id', destinationWallet.id)
  }

  return { rollback, error: null }
}

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
    const { rollback, error: walletError } = await applyIncomingTransferToDestinationWallet(transaction)
    if (walletError) {
      return { data: null, error: walletError }
    }

    const { data, error } = await supabase
      .from('transactions')
      .insert(transaction)
      .select()

    if (error && rollback) {
      await rollback()
    }

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
