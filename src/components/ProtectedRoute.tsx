import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface Props {
  children: React.ReactNode
  adminOnly?: boolean
}

const ROTAS_MOTOBOY = ['/rastreamento']

export function ProtectedRoute({ children, adminOnly = false }: Props) {
  const { user, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-400 text-sm">Carregando...</p>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (adminOnly && profile?.role !== 'admin') return <Navigate to="/" replace />

  // Motoboy só acessa /rastreamento
  if (profile?.role === 'motoboy' && !ROTAS_MOTOBOY.includes(location.pathname)) {
    return <Navigate to="/rastreamento" replace />
  }

  return <>{children}</>
}
