import { createClient } from "@supabase/supabase-js"

const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL || "").trim()
const supabaseAnonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim()

export const supabaseConfigError = !supabaseUrl || !supabaseAnonKey
  ? "饭圈尚未配置 Supabase。请先在 .env 中填写 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY。"
  : ""

export const supabase = supabaseConfigError
  ? null
  : createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })

export function requireSupabase() {
  if (!supabase) throw new Error(supabaseConfigError)
  return supabase
}
