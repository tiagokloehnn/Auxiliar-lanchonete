import { useCallback, useEffect } from 'react'
import { ComandaCard } from '../components/ComandaCard'
import type { Comanda } from '../types'
import { calcularAlerta } from '../hooks/useComandas'

interface Props {
  ativas: Comanda[]
  onFinalizar: (id: number) => void
  onCancelar: (id: number) => void
  onAlerta: (comanda: Comanda, minutosRestantes: number, tipo: 'atencao' | 'urgente' | 'expirada') => void
  onNovaComanda: () => void
}

export function Dashboard({ ativas, onFinalizar, onCancelar, onAlerta, onNovaComanda }: Props) {
  const handleAlerta = useCallback(onAlerta, [onAlerta])

  // Verificação imediata ao montar ou quando a lista muda
  useEffect(() => {
    ativas.forEach(comanda => {
      const info = calcularAlerta(comanda)
      if (info.level === 'atencao' || info.level === 'urgente' || info.level === 'expirada') {
        onAlerta(comanda, info.minutosRestantes, info.level)
      }
    })
  }, [ativas, onAlerta])

  const expiradas = ativas.filter(c => calcularAlerta(c).level === 'expirada')
  const urgentes = ativas.filter(c => calcularAlerta(c).level === 'urgente')
  const atencao = ativas.filter(c => calcularAlerta(c).level === 'atencao')
  const normais = ativas.filter(c => calcularAlerta(c).level === 'normal')

  const ordenadas = [...expiradas, ...urgentes, ...atencao, ...normais]

  if (ativas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
        <div className="text-6xl mb-4">🧾</div>
        <h2 className="text-xl font-bold text-white mb-2">Nenhuma comanda ativa</h2>
        <p className="text-slate-400 text-sm mb-6">Abra uma nova comanda para começar a monitorar os pedidos.</p>
        <button
          onClick={onNovaComanda}
          className="bg-red-600 hover:bg-red-500 text-white font-bold px-6 py-3 rounded-xl transition-colors"
        >
          + Abrir Primeira Comanda
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
      {/* Resumo rápido */}
      {(expiradas.length > 0 || urgentes.length > 0) && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {expiradas.length > 0 && (
            <div className="bg-red-950/50 border border-red-500/30 rounded-xl p-3 text-center">
              <p className="text-2xl font-black text-red-400">{expiradas.length}</p>
              <p className="text-xs text-red-400/70 font-medium">Expirada{expiradas.length > 1 ? 's' : ''}</p>
            </div>
          )}
          {urgentes.length > 0 && (
            <div className="bg-orange-950/50 border border-orange-500/30 rounded-xl p-3 text-center">
              <p className="text-2xl font-black text-orange-400">{urgentes.length}</p>
              <p className="text-xs text-orange-400/70 font-medium">Urgente{urgentes.length > 1 ? 's' : ''}</p>
            </div>
          )}
          {atencao.length > 0 && (
            <div className="bg-yellow-950/50 border border-yellow-500/30 rounded-xl p-3 text-center">
              <p className="text-2xl font-black text-yellow-400">{atencao.length}</p>
              <p className="text-xs text-yellow-400/70 font-medium">Atenção</p>
            </div>
          )}
          {normais.length > 0 && (
            <div className="bg-slate-800/50 border border-slate-600/30 rounded-xl p-3 text-center">
              <p className="text-2xl font-black text-green-400">{normais.length}</p>
              <p className="text-xs text-slate-400 font-medium">Normal{normais.length > 1 ? 'is' : ''}</p>
            </div>
          )}
        </div>
      )}

      {ordenadas.map(comanda => (
        <ComandaCard
          key={comanda.id}
          comanda={comanda}
          onFinalizar={onFinalizar}
          onCancelar={onCancelar}
          onAlerta={handleAlerta}
        />
      ))}
    </div>
  )
}
