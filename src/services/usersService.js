import { supabase } from '../supabaseClient'

export const usersService = {
  async getByEmail(email) {
    const normalizedEmail = email?.trim().toLowerCase()
    if (!normalizedEmail) {
      return { data: null, error: { message: 'Email is required' } }
    }

    const { data, error } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', normalizedEmail)
      .maybeSingle()

    return { data, error }
  },
}
