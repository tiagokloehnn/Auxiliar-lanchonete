import { useState, useEffect } from 'react'
import QRCode from 'react-qr-code'
import type { Comanda } from '../types'
import { calcularAlerta } from '../hooks/useComandas'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { rastreamentoLocal } from '../lib/rastreamentoLocal'
import { imprimirComanda } from '../utils/impressao'

interface Props {
  comanda: Comanda
  onFinalizar: (id: number) => void
  onCancelar: (id: number) => void
  onAlerta: (comanda: Comanda, minutosRestantes: number, tipo: 'atencao' | 'urgente' | 'expirada') => void
}

const alertStyles = {
  normal: {
    card: 'border-slate-700 bg-slate-800',
    header: 'bg-slate-700',
    badge: 'bg-green-500/20 text-green-400 border-green-500/30',
    timer: 'text-green-400',
    bar: 'bg-green-500',
    pulse: '',
  },
  atencao: {
    card: 'border-yellow-500/50 bg-slate-800',
    header: 'bg-yellow-900/40',
    badge: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    timer: 'text-yellow-400',
    bar: 'bg-yellow-500',
    pulse: '',
  },
  urgente: {
    card: 'border-orange-500 bg-slate-800 shadow-orange-500/20 shadow-lg',
    header: 'bg-orange-900/40',
    badge: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    timer: 'text-orange-400 animate-pulse-fast',
    bar: 'bg-orange-500',
    pulse: 'animate-pulse-fast',
  },
  expirada: {
    card: 'border-red-500 bg-red-950/30 shadow-red-500/30 shadow-xl',
    header: 'bg-red-900/50',
    badge: 'bg-red-500/20 text-red-400 border-red-500/30',
    timer: 'text-red-400 animate-pulse-fast font-black',
    bar: 'bg-red-500',
    pulse: 'animate-pulse-fast',
  },
}

const TIPO_ICON: Record<string, string> = {
  entrega: '🛵',
  mesa: '🪑',
  balcao: '🏪',
}

function formatarTempo(mins: number): string {
  if (mins <= 0) {
    const expiradoMins = Math.abs(mins)
    if (expiradoMins === 0) return 'EXPIRADO'
    if (expiradoMins < 60) return `+${expiradoMins}min`
    const h = Math.floor(expiradoMins / 60)
    const m = expiradoMins % 60
    return m > 0 ? `+${h}h ${m}min` : `+${h}h`
  }
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h > 0) return `${h}h ${m}min`
  return `${m}min`
}

export function ComandaCard({ comanda, onFinalizar, onCancelar, onAlerta }: Props) {
  const [alertInfo, setAlertInfo] = useState(() => calcularAlerta(comanda))
  const [expandido, setExpandido] = useState(false)
  const [confirmando, setConfirmando] = useState<'finalizar' | 'cancelar' | null>(null)
  const [qrAberto, setQrAberto] = useState(false)
  const [qrCriando, setQrCriando] = useState(false)

  const motoUrl = `${window.location.origin}/motoboy/${comanda.numero}`

  async function handleAbrirQr() {
    setQrCriando(true)
    const payload = {
      comanda_numero: comanda.numero,
      cliente: comanda.cliente,
      endereco: comanda.enderecoEntrega ?? '',
      status: 'aguardando' as const,
      atualizado_em: new Date().toISOString(),
    }
    if (isSupabaseConfigured) {
      await supabase
        .from('rastreamento_entrega')
        .upsert(payload, { onConflict: 'comanda_numero' })
    } else {
      rastreamentoLocal.criar(payload)
    }
    setQrCriando(false)
    setQrAberto(true)
  }

  useEffect(() => {
    const interval = setInterval(() => {
      const info = calcularAlerta(comanda)
      setAlertInfo(info)

      if (info.level === 'atencao') {
        onAlerta(comanda, info.minutosRestantes, 'atencao')
      } else if (info.level === 'urgente') {
        onAlerta(comanda, info.minutosRestantes, 'urgente')
      } else if (info.level === 'expirada') {
        onAlerta(comanda, info.minutosRestantes, 'expirada')
      }
    }, 10000)

    return () => clearInterval(interval)
  }, [comanda, onAlerta])

  const styles = alertStyles[alertInfo.level]
  const tipoAtendimento = comanda.tipoAtendimento ?? 'mesa'
  const isEntrega = tipoAtendimento === 'entrega'
  const horarioPedido = new Date(comanda.criadaEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  function handleAcao(tipo: 'finalizar' | 'cancelar') {
    if (confirmando === tipo) {
      if (tipo === 'finalizar') onFinalizar(comanda.id!)
      else onCancelar(comanda.id!)
    } else {
      setConfirmando(tipo)
      setTimeout(() => setConfirmando(null), 3000)
    }
  }

  return (
    <div className={`rounded-xl border-2 overflow-hidden transition-all duration-300 ${styles.card}`}>
      {/* Header */}
      <div
        className={`${styles.header} px-4 py-3 flex items-center justify-between cursor-pointer`}
        onClick={() => setExpandido(e => !e)}
      >
        <div className="flex items-center gap-3">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${styles.badge}`}>
            #{comanda.numero}
          </span>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="font-semibold text-white text-sm leading-tight">{comanda.cliente}</p>
              <span className="text-base" title={TIPO_ICON[tipoAtendimento] === '🛵' ? 'Entrega' : tipoAtendimento === 'balcao' ? 'Balcão' : 'Mesa'}>
                {TIPO_ICON[tipoAtendimento]}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {isEntrega
                ? (comanda.enderecoEntrega ?? 'Entrega')
                : comanda.mesa
                  ? `Mesa ${comanda.mesa}`
                  : tipoAtendimento === 'balcao' ? 'Balcão' : ''}
              {' · '}Pedido às {horarioPedido}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className={`text-lg font-black tabular-nums ${styles.timer}`}>
              {formatarTempo(alertInfo.minutosRestantes)}
            </p>
            <p className="text-xs text-slate-500">
              {comanda.itens.length} {comanda.itens.length === 1 ? 'item' : 'itens'}
            </p>
          </div>
          <span className="text-slate-500 text-xs">{expandido ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Barra de progresso */}
      <div className="h-1.5 bg-slate-700">
        <div
          className={`h-full transition-all duration-1000 ${styles.bar} ${alertInfo.level === 'expirada' ? 'w-full' : ''}`}
          style={{ width: alertInfo.level !== 'expirada' ? `${alertInfo.percentualRestante}%` : '100%' }}
        />
      </div>

      {/* Detalhes expandidos */}
      {expandido && (
        <div className="px-4 py-3 space-y-3">
          {/* Itens */}
          <div className="space-y-1.5">
            {comanda.itens.map(item => (
              <div key={item.id} className="flex items-start justify-between text-sm">
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-white tabular-nums min-w-[1.5rem]">
                    {item.quantidade}×
                  </span>
                  <div>
                    <span className="text-slate-200">{item.nome}</span>
                    {item.observacao && (
                      <p className="text-xs text-slate-500 italic">• {item.observacao}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {comanda.observacaoGeral && (
            <div className="bg-slate-700/50 rounded-lg px-3 py-2">
              <p className="text-xs text-slate-400">
                <span className="font-semibold text-slate-300">Obs: </span>
                {comanda.observacaoGeral}
              </p>
            </div>
          )}

          <div className="text-xs text-slate-500 flex justify-between">
            <span>Pedido às {horarioPedido}</span>
            <span>Limite: {comanda.tempoLimiteMins} min</span>
          </div>

          {/* Ações */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => imprimirComanda(comanda)}
              className="px-3 py-2 rounded-lg text-sm font-semibold transition-colors bg-slate-600/30 text-slate-300 border border-slate-500/30 hover:bg-slate-600/50"
              title="Reimprimir pedido"
            >
              🖨️
            </button>
            {isEntrega && (
              <button
                onClick={handleAbrirQr}
                disabled={qrCriando}
                className="px-3 py-2 rounded-lg text-sm font-semibold transition-colors bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/40 disabled:opacity-50"
                title="QR Code para o motoboy"
              >
                {qrCriando ? '...' : '📱 QR'}
              </button>
            )}
            <button
              onClick={() => handleAcao('finalizar')}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                confirmando === 'finalizar'
                  ? 'bg-green-500 text-white animate-pulse'
                  : 'bg-green-600/20 text-green-400 border border-green-500/30 hover:bg-green-600/40'
              }`}
            >
              {confirmando === 'finalizar' ? 'Confirmar?' : '✓ Finalizar'}
            </button>
            <button
              onClick={() => handleAcao('cancelar')}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                confirmando === 'cancelar'
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600/40'
              }`}
            >
              {confirmando === 'cancelar' ? 'Confirmar?' : '✕ Cancelar'}
            </button>
          </div>
        </div>
      )}

      {/* Modal QR Code */}
      {qrAberto && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6"
          onClick={() => setQrAberto(false)}
        >
          <div
            className="bg-white rounded-3xl p-6 max-w-xs w-full text-center shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <p className="text-slate-800 font-black text-base mb-1">QR Code — #{comanda.numero}</p>
            <p className="text-slate-500 text-xs mb-4">
              O motoboy escaneia para iniciar o rastreamento
            </p>
            <div className="flex justify-center mb-4">
              <QRCode value={motoUrl} size={200} />
            </div>
            <p className="text-slate-400 text-xs break-all mb-4">{motoUrl}</p>
            <button
              onClick={() => setQrAberto(false)}
              className="w-full bg-slate-800 text-white font-bold py-2.5 rounded-xl"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
