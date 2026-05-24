import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

function isValidUrl(url: string) {
  try { new URL(url); return true } catch { return false }
}

export const isSupabaseConfigured =
  isValidUrl(supabaseUrl) && supabaseAnonKey?.length > 10

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient('https://placeholder.supabase.co', 'placeholder')

export interface RastreamentoEntrega {
  id?: string
  comanda_numero: string
  cliente: string
  endereco?: string
  latitude?: number
  longitude?: number
  status: 'aguardando' | 'em_rota' | 'entregue'
  iniciado_em?: string
  atualizado_em?: string
}
