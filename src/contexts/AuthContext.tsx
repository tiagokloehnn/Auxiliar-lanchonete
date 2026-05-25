import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

export interface Profile {
  id: string
  nome: string
  role: 'admin' | 'funcionario' | 'motoboy'
  ativo: boolean
  created_at: string
}

interface AuthContextType {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  isAdmin: boolean
  isMotoboy: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

async function fetchProfile(userId: string): Promise<Profile | null> {
  try {
    const { data } = await Promise.race([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      new Promise<{ data: null }>((resolve) => setTimeout(() => resolve({ data: null }), 3000)),
    ])
    return data as Profile | null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }

    // Garante que loading nunca trava para sempre (rede lenta, Supabase fora, etc.)
    const fallback = setTimeout(() => setLoading(false), 3000)

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'INITIAL_SESSION') {
        // Libera a tela imediatamente sem esperar o perfil carregar
        setSession(session)
        setUser(session?.user ?? null)
        clearTimeout(fallback)
        setLoading(false)
        if (session?.user) {
          setProfile(await fetchProfile(session.user.id))
        }
      } else {
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) {
          setProfile(await fetchProfile(session.user.id))
        } else {
          setProfile(null)
        }
      }
    })

    return () => {
      subscription.unsubscribe()
      clearTimeout(fallback)
    }
  }, [])

  async function signIn(email: string, password: string): Promise<{ error: string | null }> {
    const { error, data } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }

    if (data.user) {
      const p = await fetchProfile(data.user.id)
      if (p && !p.ativo) {
        await supabase.auth.signOut()
        return { error: 'Usuário desativado. Contate o administrador.' }
      }
    }

    return { error: null }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      session,
      loading,
      isAdmin: profile?.role === 'admin',
      isMotoboy: profile?.role === 'motoboy',
      signIn,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
