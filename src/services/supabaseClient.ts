import { createClient } from '@supabase/supabase-js';

const fallbackSupabaseUrl = 'https://tqkuynpcwovnfraedsen.supabase.co';
const fallbackSupabaseAnonKey =
  'sb_publishable_ofS0WlV81mRDAOJ0jjGj2g_8cDEmjBd';

const supabaseUrl = ((import.meta.env.VITE_SUPABASE_URL as string) ?? '').trim() || fallbackSupabaseUrl;
const supabaseAnonKey =
  ((import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY as string) ?? '').trim() || fallbackSupabaseAnonKey;

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
