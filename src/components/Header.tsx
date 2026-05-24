import { Link, useLocation } from 'react-router-dom'

interface Props {
  totalAtivas: number
  totalExpiradas: number
  onNovaComanda: () => void
}

export function Header({ totalAtivas, totalExpiradas, onNovaComanda }: Props) {
  const location = useLocation()

  return (
    <header className="bg-slate-900/95 border-b border-slate-700 backdrop-blur-sm sticky top-0 z-30">
      <div className="max-w-2xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🧾</span>
            <div>
              <h1 className="font-black text-white text-base leading-tight">PedidoCerto</h1>
              <div className="flex items-center gap-2">
                {totalAtivas > 0 && (
                  <span className="text-xs text-slate-400">
                    {totalAtivas} {totalAtivas === 1 ? 'comanda ativa' : 'comandas ativas'}
                  </span>
                )}
                {totalExpiradas > 0 && (
                  <span className="text-xs font-bold text-red-400 animate-pulse">
                    • {totalExpiradas} expirada{totalExpiradas > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onNovaComanda}
            className="bg-red-600 hover:bg-red-500 text-white font-bold px-4 py-2 rounded-xl text-sm transition-colors active:scale-95"
          >
            + Nova
          </button>
        </div>

        {/* Nav */}
        <nav className="flex gap-1 mt-3">
          <Link
            to="/"
            className={`flex-1 text-center py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              location.pathname === '/'
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Painel
          </Link>
          <Link
            to="/rastreamento"
            className={`flex-1 text-center py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              location.pathname === '/rastreamento'
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🛵 Entregas
          </Link>
          <Link
            to="/historico"
            className={`flex-1 text-center py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              location.pathname === '/historico'
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Histórico
          </Link>
        </nav>
      </div>
    </header>
  )
}
