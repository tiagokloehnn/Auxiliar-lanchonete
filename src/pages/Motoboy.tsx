import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { rastreamentoLocal } from '../lib/rastreamentoLocal'
import { lerParadas, gravarParadas, limparParadas, abrirRotaMaps, type Parada } from '../utils/rotaMotoboy'

function StatusBadge({ status }: { status: Parada['status'] }) {
  if (status === 'entregue')
    return <span className="text-xs font-bold text-blue-400 bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 rounded-full">✓ Entregue</span>
  if (status === 'em_rota')
    return (
      <span className="text-xs font-bold text-green-400 bg-green-500/10 border border-green-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
        Em rota
      </span>
    )
  return <span className="text-xs font-bold text-yellow-400 bg-yellow-500/10 border border-yellow-500/30 px-2 py-0.5 rounded-full">Aguardando</span>
}

export function Motoboy() {
  const { numero } = useParams<{ numero: string }>()
  const [paradas, setParadas] = useState<Parada[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erroMsg, setErroMsg] = useState('')
  const [confirmando, setConfirmando] = useState<string | null>(null)
  const paradasRef = useRef<Parada[]>([])
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => { paradasRef.current = paradas }, [paradas])

  useEffect(() => {
    if (!numero) return
    inicializar()
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [numero])

  async function inicializar() {
    setCarregando(true)

    let entregaAtual: { comanda_numero: string; cliente: string; endereco?: string; status: string } | null = null

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('rastreamento_entrega')
        .select('*')
        .eq('comanda_numero', numero)
        .single()
      if (error || !data) {
        setErroMsg('Entrega não encontrada. Verifique o QR code.')
        setCarregando(false)
        return
      }
      entregaAtual = data
    } else {
      const data = rastreamentoLocal.buscar(numero!)
      if (!data) {
        setErroMsg('Entrega não encontrada.')
        setCarregando(false)
        return
      }
      entregaAtual = data
    }

    const statusNormalizado = (s: string): Parada['status'] =>
      s === 'entregue' ? 'entregue' : s === 'em_rota' ? 'em_rota' : 'aguardando'

    const existentes = lerParadas()
    const jaExiste = existentes.find(p => p.numero === numero)

    const novasParadas = jaExiste
      ? existentes.map(p => p.numero === numero ? { ...p, status: statusNormalizado(entregaAtual!.status) } : p)
      : [...existentes, { numero: entregaAtual.comanda_numero, cliente: entregaAtual.cliente, endereco: entregaAtual.endereco ?? '', status: statusNormalizado(entregaAtual.status) }]

    gravarParadas(novasParadas)
    setParadas(novasParadas)
    setCarregando(false)

    if (novasParadas.some(p => p.status === 'em_rota')) iniciarGPS()
  }

  function iniciarGPS() {
    if (!navigator.geolocation) return
    if (intervalRef.current) clearInterval(intervalRef.current)

    function enviar() {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const emRota = paradasRef.current.filter(p => p.status === 'em_rota')
          if (isSupabaseConfigured) {
            for (const p of emRota)
              await supabase.from('rastreamento_entrega').update({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, atualizado_em: new Date().toISOString() }).eq('comanda_numero', p.numero)
          } else {
            for (const p of emRota)
              rastreamentoLocal.atualizar(p.numero, { latitude: pos.coords.latitude, longitude: pos.coords.longitude })
          }
        },
        (err) => console.error('GPS:', err),
        { enableHighAccuracy: true, timeout: 10000 }
      )
    }

    enviar()
    intervalRef.current = setInterval(enviar, 10000)
  }

  async function handleIniciarRota() {
    const atualizadas = paradas.map(p => p.status === 'aguardando' ? { ...p, status: 'em_rota' as const } : p)

    if (isSupabaseConfigured) {
      for (const p of atualizadas.filter(p => p.status === 'em_rota'))
        await supabase.from('rastreamento_entrega').update({ status: 'em_rota', iniciado_em: new Date().toISOString() }).eq('comanda_numero', p.numero)
    } else {
      for (const p of atualizadas.filter(p => p.status === 'em_rota'))
        rastreamentoLocal.atualizar(p.numero, { status: 'em_rota', iniciado_em: new Date().toISOString() })
    }

    gravarParadas(atualizadas)
    setParadas(atualizadas)
    iniciarGPS()
    abrirRotaMaps(atualizadas)
  }

  async function handleConfirmar(num: string) {
    if (confirmando !== num) {
      setConfirmando(num)
      setTimeout(() => setConfirmando(c => c === num ? null : c), 3000)
      return
    }
    setConfirmando(null)

    if (isSupabaseConfigured)
      await supabase.from('rastreamento_entrega').update({ status: 'entregue' }).eq('comanda_numero', num)
    else
      rastreamentoLocal.atualizar(num, { status: 'entregue' })

    const atualizadas = paradas.map(p => p.numero === num ? { ...p, status: 'entregue' as const } : p)
    gravarParadas(atualizadas)
    setParadas(atualizadas)

    if (atualizadas.every(p => p.status === 'entregue')) {
      limparParadas()
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }

  if (carregando) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center text-slate-400"><div className="text-4xl mb-3 animate-spin">⏳</div><p>Carregando...</p></div>
    </div>
  )

  if (erroMsg) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="text-center"><div className="text-5xl mb-4">❌</div><p className="text-white font-bold text-lg mb-2">Ops!</p><p className="text-slate-400 text-sm">{erroMsg}</p></div>
    </div>
  )

  const ativas = paradas.filter(p => p.status !== 'entregue')
  const entregues = paradas.filter(p => p.status === 'entregue')
  const emRota = paradas.some(p => p.status === 'em_rota')
  const todasEntregues = paradas.length > 0 && paradas.every(p => p.status === 'entregue')

  if (todasEntregues) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="text-center">
        <div className="text-6xl mb-4">🎉</div>
        <p className="text-white font-black text-2xl mb-2">Todas entregues!</p>
        <p className="text-slate-400 text-sm mb-6">{paradas.length} entrega{paradas.length !== 1 ? 's' : ''} concluída{paradas.length !== 1 ? 's' : ''}.</p>
        <button onClick={() => { limparParadas(); setParadas([]) }} className="text-slate-500 text-sm underline">Limpar e fechar</button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-8">
      <div className="bg-slate-900 border-b border-slate-700 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🛵</span>
          <div>
            <h1 className="font-black text-white text-base leading-tight">Rota de Entregas</h1>
            <p className="text-xs text-slate-400">{ativas.length} ativa{ativas.length !== 1 ? 's' : ''}{entregues.length > 0 ? ` · ${entregues.length} entregue${entregues.length !== 1 ? 's' : ''}` : ''}</p>
          </div>
        </div>
        <button onClick={() => { limparParadas(); setParadas([]) }} className="text-slate-600 hover:text-slate-400 text-xs">Limpar rota</button>
      </div>

      <div className="max-w-sm mx-auto px-5 pt-5 space-y-4">
        {emRota && (
          <div className="bg-green-900/30 border border-green-500/40 rounded-xl p-3 flex items-center gap-2 text-green-400">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
            <div><p className="font-bold text-sm">GPS ativo</p><p className="text-xs text-green-400/70">Localização sendo enviada a cada 10s</p></div>
          </div>
        )}

        {ativas.map((p, idx) => (
          <div key={p.numero} className="bg-slate-800 border border-slate-700 rounded-2xl p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-red-600 text-white text-xs font-black flex items-center justify-center flex-shrink-0">{idx + 1}</span>
                <div>
                  <p className="font-bold text-white text-sm">{p.cliente}</p>
                  <p className="text-xs text-slate-400">#{p.numero}</p>
                </div>
              </div>
              <StatusBadge status={p.status} />
            </div>
            {p.endereco && <p className="text-sm text-slate-300 mb-3 pl-8">📍 {p.endereco}</p>}
            <div className="flex gap-2 pl-8">
              <button onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(p.endereco)}`, '_blank')} className="flex-1 py-2 rounded-lg text-xs font-semibold bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors">🗺️ Ver no Maps</button>
              <button
                onClick={() => handleConfirmar(p.numero)}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${confirmando === p.numero ? 'bg-blue-500 text-white animate-pulse' : 'bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/40'}`}
              >
                {confirmando === p.numero ? 'Confirmar?' : '✓ Entregue'}
              </button>
            </div>
          </div>
        ))}

        {entregues.map(p => (
          <div key={p.numero} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 opacity-50">
            <span className="text-blue-400 text-sm">✓</span>
            <p className="text-sm text-slate-400">{p.cliente}</p>
            <span className="text-xs text-slate-600 ml-auto">#{p.numero}</span>
          </div>
        ))}

        {ativas.length > 0 && !emRota && (
          <button onClick={handleIniciarRota} className="w-full bg-green-600 hover:bg-green-500 active:scale-95 text-white font-black text-base py-4 rounded-2xl transition-all">
            🚀 Iniciar Rota{paradas.length > 1 ? ` (${ativas.length} paradas)` : ''}
          </button>
        )}

        {emRota && ativas.length > 0 && (
          <button onClick={() => abrirRotaMaps(paradas)} className="w-full bg-slate-700 hover:bg-slate-600 active:scale-95 text-white font-bold text-base py-4 rounded-2xl transition-all">
            🗺️ Abrir Rota Completa
          </button>
        )}

        <p className="text-center text-xs text-slate-600 pt-1">Para adicionar mais entregas, escaneie outro QR code.</p>
      </div>
    </div>
  )
}
