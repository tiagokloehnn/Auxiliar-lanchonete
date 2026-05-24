import { useState } from 'react'
import type { Comanda } from '../types'

interface Props {
  historico: Comanda[]
  onExcluir: (id: number) => void
  onLimpar: () => void
}

const TIPO_ICON: Record<string, string> = {
  entrega: '🛵',
  mesa: '🪑',
  balcao: '🏪',
}

function formatarDuracao(comanda: Comanda): string {
  if (!comanda.finalizadaEm) return '-'
  const ms = new Date(comanda.finalizadaEm).getTime() - new Date(comanda.criadaEm).getTime()
  const mins = Math.floor(ms / 60000)
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h > 0) return `${h}h ${m}min`
  return `${mins}min`
}

function formatarData(data: Date): string {
  return new Date(data).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatarHorario(data: Date): string {
  return new Date(data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function Historico({ historico, onExcluir, onLimpar }: Props) {
  const [filtro, setFiltro] = useState<'todos' | 'finalizada' | 'cancelada'>('todos')
  const [confirmandoLimpar, setConfirmandoLimpar] = useState(false)

  const filtrados = historico.filter(c =>
    filtro === 'todos' ? true : c.status === filtro
  )

  function handleLimpar() {
    if (confirmandoLimpar) {
      onLimpar()
      setConfirmandoLimpar(false)
    } else {
      setConfirmandoLimpar(true)
      setTimeout(() => setConfirmandoLimpar(false), 3000)
    }
  }

  if (historico.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
        <div className="text-5xl mb-4">📋</div>
        <h2 className="text-xl font-bold text-white mb-2">Histórico vazio</h2>
        <p className="text-slate-400 text-sm">As comandas finalizadas e canceladas aparecerão aqui.</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-4">
      {/* Filtros e ações */}
      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="flex gap-1 bg-slate-800 p-1 rounded-lg">
          {(['todos', 'finalizada', 'cancelada'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors capitalize ${
                filtro === f
                  ? 'bg-slate-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {f === 'todos' ? 'Todos' : f === 'finalizada' ? 'Finalizados' : 'Cancelados'}
            </button>
          ))}
        </div>

        {historico.length > 0 && (
          <button
            onClick={handleLimpar}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
              confirmandoLimpar
                ? 'bg-red-600 text-white animate-pulse'
                : 'text-slate-500 hover:text-red-400 border border-slate-700 hover:border-red-500/50'
            }`}
          >
            {confirmandoLimpar ? 'Confirmar limpeza?' : 'Limpar histórico'}
          </button>
        )}
      </div>

      {/* Estatísticas rápidas */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-slate-800 rounded-xl p-3 text-center">
          <p className="text-xl font-black text-white">{historico.length}</p>
          <p className="text-xs text-slate-400">Total</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-3 text-center">
          <p className="text-xl font-black text-green-400">
            {historico.filter(c => c.status === 'finalizada').length}
          </p>
          <p className="text-xs text-slate-400">Finalizados</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-3 text-center">
          <p className="text-xl font-black text-red-400">
            {historico.filter(c => c.status === 'cancelada').length}
          </p>
          <p className="text-xs text-slate-400">Cancelados</p>
        </div>
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {filtrados.length === 0 ? (
          <p className="text-center text-slate-500 py-8 text-sm">
            Nenhum pedido encontrado.
          </p>
        ) : (
          filtrados.map(comanda => {
            const tipoAtendimento = comanda.tipoAtendimento ?? 'mesa'
            const isEntrega = tipoAtendimento === 'entrega'

            return (
              <div
                key={comanda.id}
                className={`rounded-xl border overflow-hidden ${
                  comanda.status === 'cancelada'
                    ? 'border-slate-700 bg-slate-800/50 opacity-70'
                    : 'border-slate-700 bg-slate-800'
                }`}
              >
                <div className="px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                      comanda.status === 'cancelada'
                        ? 'bg-slate-700 text-slate-400 border-slate-600'
                        : 'bg-green-500/20 text-green-400 border-green-500/30'
                    }`}>
                      #{comanda.numero}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-white text-sm">{comanda.cliente}</p>
                        <span className="text-sm">{TIPO_ICON[tipoAtendimento]}</span>
                      </div>
                      <p className="text-xs text-slate-400">
                        {isEntrega
                          ? (comanda.enderecoEntrega ?? 'Entrega')
                          : comanda.mesa
                            ? `Mesa ${comanda.mesa} · `
                            : tipoAtendimento === 'balcao' ? 'Balcão · ' : ''}
                        {formatarData(comanda.criadaEm)}
                        {' · '}Pedido às {formatarHorario(comanda.criadaEm)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className={`text-sm font-bold ${
                        comanda.status === 'cancelada' ? 'text-slate-500' : 'text-green-400'
                      }`}>
                        {comanda.status === 'cancelada' ? 'Cancelado' : formatarDuracao(comanda)}
                      </p>
                      {comanda.tempoExpiradoMins !== undefined && comanda.tempoExpiradoMins > 0 && (
                        <p className="text-xs text-red-400 font-semibold">
                          +{comanda.tempoExpiradoMins}min expirado
                        </p>
                      )}
                      <p className="text-xs text-slate-500">
                        {comanda.itens.length} {comanda.itens.length === 1 ? 'item' : 'itens'}
                      </p>
                    </div>
                    <button
                      onClick={() => onExcluir(comanda.id!)}
                      className="text-slate-600 hover:text-red-400 text-lg"
                      title="Excluir do histórico"
                    >
                      ×
                    </button>
                  </div>
                </div>

                {/* Itens resumidos */}
                <div className="border-t border-slate-700/50 px-4 py-2">
                  <p className="text-xs text-slate-500 truncate">
                    {comanda.itens.map(i => `${i.quantidade}× ${i.nome}`).join(', ')}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
