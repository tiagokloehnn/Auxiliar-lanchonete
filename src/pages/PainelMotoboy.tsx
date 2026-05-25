import { useEffect, useRef, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { rastreamentoLocal } from '../lib/rastreamentoLocal'
import type { EntregaRastreada } from '../types'
import { lerParadas, gravarParadas, limparParadas, abrirRotaMaps, type Parada } from '../utils/rotaMotoboy'

export function PainelMotoboy() {
  const [pendentes, setPendentes] = useState<EntregaRastreada[]>([])
  const [minhasParadas, setMinhasParadas] = useState<Parada[]>([])
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set())
  const [carregando, setCarregando] = useState(true)
  const [confirmando, setConfirmando] = useState<string | null>(null)
  const paradasRef = useRef<Parada[]>([])
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => { paradasRef.current = minhasParadas }, [minhasParadas])

  useEffect(() => {
    const paradas = lerParadas().filter(p => p.status !== 'entregue')
    setMinhasParadas(paradas)
    carregarPendentes(paradas)

    if (isSupabaseConfigured) {
      const canal = supabase
        .channel('painel_motoboy')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'rastreamento_entrega' }, () => carregarPendentes(paradasRef.current))
        .subscribe()
      return () => { supabase.removeChannel(canal); if (intervalRef.current) clearInterval(intervalRef.current) }
    } else {
      const unsub = rastreamentoLocal.onChange(() => carregarPendentes(paradasRef.current))
      function handleStorage(e: StorageEvent) {
        if (e.key === 'pizzaria_rastreamento') carregarPendentes(paradasRef.current)
      }
      window.addEventListener('storage', handleStorage)
      return () => { unsub(); window.removeEventListener('storage', handleStorage); if (intervalRef.current) clearInterval(intervalRef.current) }
    }
  }, [])

  useEffect(() => {
    if (minhasParadas.some(p => p.status === 'em_rota') && !intervalRef.current) iniciarGPS()
  }, [minhasParadas])

  async function carregarPendentes(minhas: Parada[]) {
    const minhasNumeros = new Set(minhas.map(p => p.numero))

    if (isSupabaseConfigured) {
      const { data } = await supabase
        .from('rastreamento_entrega')
        .select('*')
        .eq('status', 'aguardando')
        .order('atualizado_em', { ascending: true })
      setPendentes((data ?? []).filter(e => !minhasNumeros.has(e.comanda_numero)))
    } else {
      const todas = rastreamentoLocal.listar()
      setPendentes(todas.filter(e => e.status === 'aguardando' && !minhasNumeros.has(e.comanda_numero)))
    }
    setCarregando(false)
  }

  function iniciarGPS() {
    if (!navigator.geolocation) return

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

  function toggleSelecionada(numero: string) {
    setSelecionadas(prev => {
      const next = new Set(prev)
      if (next.has(numero)) next.delete(numero)
      else next.add(numero)
      return next
    })
  }

  async function handleIniciarEntregas() {
    const paraIniciar = pendentes.filter(e => selecionadas.has(e.comanda_numero))
    if (paraIniciar.length === 0) return

    const agora = new Date().toISOString()
    if (isSupabaseConfigured) {
      for (const e of paraIniciar)
        await supabase.from('rastreamento_entrega').update({ status: 'em_rota', iniciado_em: agora }).eq('comanda_numero', e.comanda_numero)
    } else {
      for (const e of paraIniciar)
        rastreamentoLocal.atualizar(e.comanda_numero, { status: 'em_rota', iniciado_em: agora })
    }

    const novasParadas: Parada[] = [
      ...minhasParadas,
      ...paraIniciar.map(e => ({ numero: e.comanda_numero, cliente: e.cliente, endereco: e.endereco ?? '', status: 'em_rota' as const })),
    ]

    gravarParadas(novasParadas)
    setMinhasParadas(novasParadas)
    setSelecionadas(new Set())
    iniciarGPS()
    await carregarPendentes(novasParadas)
    abrirRotaMaps(novasParadas)
  }

  async function handleConfirmar(numero: string) {
    if (confirmando !== numero) {
      setConfirmando(numero)
      setTimeout(() => setConfirmando(c => c === numero ? null : c), 3000)
      return
    }
    setConfirmando(null)

    if (isSupabaseConfigured)
      await supabase.from('rastreamento_entrega').update({ status: 'entregue' }).eq('comanda_numero', numero)
    else
      rastreamentoLocal.atualizar(numero, { status: 'entregue' })

    const atualizadas = minhasParadas.map(p => p.numero === numero ? { ...p, status: 'entregue' as const } : p)
    gravarParadas(atualizadas)
    setMinhasParadas(atualizadas)

    if (atualizadas.every(p => p.status === 'entregue')) {
      limparParadas()
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
    }
  }

  function handleLimpar() {
    limparParadas()
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
    setMinhasParadas([])
    carregarPendentes([])
  }

  const ativas = minhasParadas.filter(p => p.status !== 'entregue')
  const entregues = minhasParadas.filter(p => p.status === 'entregue')
  const emRota = ativas.some(p => p.status === 'em_rota')
  const todasEntregues = minhasParadas.length > 0 && minhasParadas.every(p => p.status === 'entregue')

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-10">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-700 px-5 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🛵</span>
          <div>
            <h1 className="font-black text-white text-base leading-tight">Painel do Motoboy</h1>
            <p className="text-xs text-slate-400">PedidoCerto</p>
          </div>
        </div>
        {minhasParadas.length > 0 && (
          <button onClick={handleLimpar} className="text-slate-600 hover:text-red-400 text-xs transition-colors">Limpar rota</button>
        )}
      </div>

      <div className="max-w-sm mx-auto px-4 pt-5 space-y-5">

        {/* Sucesso — todas entregues */}
        {todasEntregues && (
          <div className="bg-green-900/20 border border-green-500/30 rounded-2xl p-6 text-center">
            <div className="text-5xl mb-3">🎉</div>
            <p className="text-white font-black text-xl mb-1">Tudo entregue!</p>
            <p className="text-slate-400 text-sm mb-4">{entregues.length} entrega{entregues.length !== 1 ? 's' : ''} concluída{entregues.length !== 1 ? 's' : ''}.</p>
            <button onClick={handleLimpar} className="text-sm text-slate-400 underline hover:text-white">Limpar e reiniciar</button>
          </div>
        )}

        {/* GPS ativo */}
        {emRota && (
          <div className="bg-green-900/30 border border-green-500/40 rounded-xl p-3 flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
            <div>
              <p className="font-bold text-green-400 text-sm">GPS ativo</p>
              <p className="text-xs text-green-400/60">Localização sendo enviada ao estabelecimento</p>
            </div>
          </div>
        )}

        {/* Minha rota — ativas */}
        {ativas.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Minha rota</h2>
              <span className="text-xs text-slate-500">{ativas.length} parada{ativas.length !== 1 ? 's' : ''}</span>
            </div>

            {ativas.map((p, idx) => (
              <div key={p.numero} className="bg-slate-800 border border-slate-700 rounded-2xl p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <span className="w-7 h-7 rounded-full bg-red-600 text-white text-sm font-black flex items-center justify-center flex-shrink-0 mt-0.5">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white">{p.cliente}</p>
                    <p className="text-xs text-slate-400">#{p.numero}</p>
                    {p.endereco && <p className="text-xs text-slate-300 mt-1">📍 {p.endereco}</p>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(p.endereco)}`, '_blank')}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors"
                  >
                    🗺️ Navegar
                  </button>
                  <button
                    onClick={() => handleConfirmar(p.numero)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                      confirmando === p.numero
                        ? 'bg-green-500 text-white animate-pulse'
                        : 'bg-green-600/20 text-green-400 border border-green-500/30 hover:bg-green-600/40'
                    }`}
                  >
                    {confirmando === p.numero ? 'Confirmar?' : '✓ Entregue'}
                  </button>
                </div>
              </div>
            ))}

            <button
              onClick={() => abrirRotaMaps(minhasParadas)}
              className="w-full py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
            >
              🗺️ Ver rota completa no Maps
            </button>
          </div>
        )}

        {/* Entregues — colapsado */}
        {entregues.length > 0 && !todasEntregues && (
          <div className="space-y-1.5">
            <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Concluídas</h2>
            {entregues.map(p => (
              <div key={p.numero} className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-900 opacity-50">
                <span className="text-green-500 text-sm">✓</span>
                <p className="text-sm text-slate-400 flex-1">{p.cliente}</p>
                <span className="text-xs text-slate-600">#{p.numero}</span>
              </div>
            ))}
          </div>
        )}

        {/* Entregas disponíveis */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {carregando ? 'Carregando...' : `Disponíveis (${pendentes.length})`}
            </h2>
            {selecionadas.size > 0 && (
              <span className="text-xs text-red-400 font-semibold">{selecionadas.size} selecionada{selecionadas.size !== 1 ? 's' : ''}</span>
            )}
          </div>

          {!carregando && pendentes.length === 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
              <p className="text-3xl mb-3">📭</p>
              <p className="text-slate-400 text-sm">Nenhuma entrega aguardando no momento.</p>
              <p className="text-slate-600 text-xs mt-1">Atualize a página para verificar novos pedidos.</p>
            </div>
          )}

          {pendentes.map(e => {
            const sel = selecionadas.has(e.comanda_numero)
            return (
              <button
                key={e.comanda_numero}
                onClick={() => toggleSelecionada(e.comanda_numero)}
                className={`w-full text-left rounded-2xl p-4 border-2 transition-all active:scale-98 ${
                  sel ? 'bg-red-600/15 border-red-500 text-white' : 'bg-slate-800 border-slate-700 hover:border-slate-500'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white">{e.cliente}</p>
                    <p className="text-xs text-slate-400">#{e.comanda_numero}</p>
                    {e.endereco && <p className="text-xs text-slate-300 mt-1 truncate">📍 {e.endereco}</p>}
                  </div>
                  <span className={`text-xl flex-shrink-0 transition-transform ${sel ? 'scale-110' : 'opacity-30'}`}>
                    {sel ? '✅' : '⬜'}
                  </span>
                </div>
              </button>
            )
          })}

          {selecionadas.size > 0 && (
            <button
              onClick={handleIniciarEntregas}
              className="w-full py-4 rounded-2xl bg-red-600 hover:bg-red-500 active:scale-95 text-white font-black text-base transition-all flex items-center justify-center gap-2"
            >
              🚀 Iniciar {selecionadas.size} entrega{selecionadas.size !== 1 ? 's' : ''}
            </button>
          )}
        </div>

        {!isSupabaseConfigured && (
          <div className="bg-yellow-900/30 border border-yellow-500/30 rounded-xl px-4 py-2 text-yellow-400 text-xs text-center">
            Modo local — configure o Supabase para sincronização em tempo real
          </div>
        )}
      </div>
    </div>
  )
}
