import { supabase } from '../supabaseClient'

export const profilesService = {
  async get(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    return { data, error }
  },

  async create(profile) {
    const { data, error } = await supabase
      .from('profiles')
      .insert(profile)
      .select()
    return { data, error }
  },

  async update(userId, updates) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
    return { data, error }
  },
}