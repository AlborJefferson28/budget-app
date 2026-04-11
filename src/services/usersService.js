import { supabase } from '../supabaseClient'

export const usersService = {
  async getByEmail(email) {
    const normalizedEmail = email?.trim().toLowerCase()
    if (!normalizedEmail) {
      return { data: null, error: { message: 'Email is required' } }
    }

    const { data, error } = await supabase
      .rpc('find_user_by_email', { p_email: normalizedEmail })

    if (error) return { data: null, error }

    if (!data || data.length === 0) {
      return { data: null, error: null }
    }

    return { data: data[0], error: null }
  },
}
