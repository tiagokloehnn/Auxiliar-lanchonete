import { useEffect, useRef, useState } from 'react'
import QRCode from 'react-qr-code'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { rastreamentoLocal } from '../lib/rastreamentoLocal'
import type { Comanda, EntregaRastreada } from '../types'

// Fix default marker icon paths broken by bundlers
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const motoIcon = L.divIcon({
  className: '',
  html: '<div style="font-size:28px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,.5))">🛵</div>',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
})

function FlyToMarkers({ entregas }: { entregas: EntregaRastreada[] }) {
  const map = useMap()
  useEffect(() => {
    const com = entregas.filter(e => e.latitude && e.longitude)
    if (com.length === 0) return
    if (com.length === 1) {
      map.flyTo([com[0].latitude!, com[0].longitude!], 15, { duration: 1.2 })
    } else {
      const bounds = L.latLngBounds(com.map(e => [e.latitude!, e.longitude!]))
      map.flyToBounds(bounds, { padding: [60, 60], duration: 1.2 })
    }
  }, [entregas.length])
  return null
}

const STATUS_LABEL: Record<string, string> = {
  aguardando: 'Aguardando',
  em_rota: 'Em rota',
  entregue: 'Entregue',
}

const STATUS_COLOR: Record<string, string> = {
  aguardando: 'text-yellow-400',
  em_rota: 'text-green-400',
  entregue: 'text-blue-400',
}

function LinkMotoboy() {
  const url = `${window.location.origin}/painel-motoboy`
  const [copiado, setCopiado] = useState(false)
  const [qrAberto, setQrAberto] = useState(false)

  function copiar() {
    navigator.clipboard.writeText(url).then(() => {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    })
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-bold text-white text-sm">Painel do Motoboy</p>
          <p className="text-xs text-slate-400">Compartilhe este link com seus motoboys</p>
        </div>
        <span className="text-2xl">🛵</span>
      </div>

      <div className="bg-slate-900 rounded-xl px-3 py-2">
        <span className="text-xs text-slate-400 break-all">{url}</span>
      </div>

      <div className="flex gap-2">
        <button
          onClick={copiar}
          className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${copiado ? 'bg-green-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'}`}
        >
          {copiado ? '✓ Copiado!' : '📋 Copiar link'}
        </button>
        <button
          onClick={() => setQrAberto(true)}
          className="flex-1 py-2 rounded-xl text-sm font-semibold bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600/30 transition-colors"
        >
          📱 Mostrar QR
        </button>
      </div>

      {qrAberto && (
        <div className="fixed inset-0 bg-black/80 z-[1001] flex items-center justify-center p-6" onClick={() => setQrAberto(false)}>
          <div className="bg-white rounded-3xl p-6 max-w-xs w-full text-center shadow-2xl" onClick={e => e.stopPropagation()}>
            <p className="text-slate-800 font-black text-base mb-1">Painel do Motoboy</p>
            <p className="text-slate-500 text-xs mb-4">Motoboy escaneia uma vez e bookmarks a página</p>
            <div className="flex justify-center mb-4">
              <QRCode value={url} size={200} />
            </div>
            <p className="text-slate-400 text-xs break-all mb-4">{url}</p>
            <button onClick={() => setQrAberto(false)} className="w-full bg-slate-800 text-white font-bold py-2.5 rounded-xl">Fechar</button>
          </div>
        </div>
      )}
    </div>
  )
}

function FilaCard({ comanda, onConfirmar }: { comanda: Comanda; onConfirmar: () => void }) {
  const [qrAberto, setQrAberto] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const motoUrl = `${window.location.origin}/motoboy/${comanda.numero}`

  function handleAbrirQr() {
    setQrAberto(true)
  }

  function handleConfirmar() {
    if (confirmando) {
      onConfirmar()
    } else {
      setConfirmando(true)
      setTimeout(() => setConfirmando(false), 3000)
    }
  }

  const horario = new Date(comanda.finalizadaEm ?? comanda.criadaEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-bold text-slate-400">#{comanda.numero}</span>
            <span className="text-xs font-semibold text-yellow-400 bg-yellow-500/10 border border-yellow-500/30 px-2 py-0.5 rounded-full">
              Aguardando motoboy
            </span>
          </div>
          <p className="font-semibold text-white">{comanda.cliente}</p>
          {comanda.enderecoEntrega && <p className="text-xs text-slate-400 mt-0.5">📍 {comanda.enderecoEntrega}</p>}
          <p className="text-xs text-slate-500 mt-0.5">Finalizado às {horario}</p>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleAbrirQr}
          className="flex-1 py-2 rounded-lg text-sm font-semibold bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/40 transition-colors"
        >
          📱 QR Code
        </button>
        <button
          onClick={handleConfirmar}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
            confirmando ? 'bg-green-500 text-white animate-pulse' : 'bg-green-600/20 text-green-400 border border-green-500/30 hover:bg-green-600/40'
          }`}
        >
          {confirmando ? 'Confirmar?' : '✓ Entregue'}
        </button>
      </div>

      {qrAberto && (
        <div className="fixed inset-0 bg-black/80 z-[1001] flex items-center justify-center p-6" onClick={() => setQrAberto(false)}>
          <div className="bg-white rounded-3xl p-6 max-w-xs w-full text-center shadow-2xl" onClick={e => e.stopPropagation()}>
            <p className="text-slate-800 font-black text-base mb-1">QR Code — #{comanda.numero}</p>
            <p className="text-slate-500 text-xs mb-1 font-semibold">{comanda.cliente}</p>
            {comanda.enderecoEntrega && <p className="text-slate-400 text-xs mb-4">📍 {comanda.enderecoEntrega}</p>}
            <div className="flex justify-center mb-4">
              <QRCode value={motoUrl} size={200} />
            </div>
            <p className="text-slate-400 text-xs break-all mb-4">{motoUrl}</p>
            <button onClick={() => setQrAberto(false)} className="w-full bg-slate-800 text-white font-bold py-2.5 rounded-xl">Fechar</button>
          </div>
        </div>
      )}
    </div>
  )
}

interface Props {
  filaEntrega: Comanda[]
  onConfirmarEntrega: (id: number) => void
}

export function Rastreamento({ filaEntrega, onConfirmarEntrega }: Props) {
  const [entregas, setEntregas] = useState<EntregaRastreada[]>([])
  const [carregando, setCarregando] = useState(true)

  // Refs para sempre ter valores atuais dentro do callback do realtime
  const filaRef = useRef(filaEntrega)
  const confirmarRef = useRef(onConfirmarEntrega)
  useEffect(() => { filaRef.current = filaEntrega }, [filaEntrega])
  useEffect(() => { confirmarRef.current = onConfirmarEntrega }, [onConfirmarEntrega])

  useEffect(() => {
    if (isSupabaseConfigured) {
      carregarSupabase()
      const canal = supabase
        .channel('rastreamento_entrega')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rastreamento_entrega' }, (payload) => {
          if (payload.new.status === 'entregue') {
            const comanda = filaRef.current.find(c => c.numero === payload.new.comanda_numero)
            if (comanda?.id) confirmarRef.current(comanda.id)
          }
          carregarSupabase()
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'rastreamento_entrega' }, carregarSupabase)
        .subscribe()
      return () => { supabase.removeChannel(canal) }
    } else {
      setEntregas(rastreamentoLocal.listar())
      setCarregando(false)
      return rastreamentoLocal.onChange(() => setEntregas(rastreamentoLocal.listar()))
    }
  }, [])

  async function carregarSupabase() {
    const { data } = await supabase
      .from('rastreamento_entrega')
      .select('*')
      .neq('status', 'entregue')
      .order('atualizado_em', { ascending: false })
    setEntregas(data ?? [])
    setCarregando(false)
  }

  const emRota = entregas.filter(e => e.status === 'em_rota')
  const aguardando = entregas.filter(e => e.status === 'aguardando')

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <span className="animate-spin text-2xl mr-2">⏳</span> Carregando...
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
      {!isSupabaseConfigured && (
        <div className="bg-yellow-900/30 border border-yellow-500/40 rounded-xl px-4 py-2 text-yellow-400 text-xs text-center">
          Modo local — dados salvos apenas neste navegador
        </div>
      )}

      <LinkMotoboy />

      {filaEntrega.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider px-1">
            🛵 Fila de entrega ({filaEntrega.length})
          </h2>
          {filaEntrega.map(c => (
            <FilaCard key={c.id} comanda={c} onConfirmar={() => onConfirmarEntrega(c.id!)} />
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-800 rounded-xl p-3 text-center">
          <p className="text-2xl font-black text-green-400">{emRota.length}</p>
          <p className="text-xs text-slate-400 mt-0.5">Em rota</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-3 text-center">
          <p className="text-2xl font-black text-yellow-400">{aguardando.length}</p>
          <p className="text-xs text-slate-400 mt-0.5">Aguardando</p>
        </div>
      </div>

      {entregas.length === 0 ? (
        <div className="bg-slate-800 rounded-2xl p-10 text-center">
          <p className="text-4xl mb-3">🛵</p>
          <p className="text-slate-400 text-sm">Nenhuma entrega ativa no momento.</p>
        </div>
      ) : (
        <>
          <div className="rounded-2xl overflow-hidden border border-slate-700" style={{ height: 320, isolation: 'isolate' }}>
            <MapContainer center={[-23.55, -46.63]} zoom={12} style={{ height: '100%', width: '100%' }} zoomControl={true}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <FlyToMarkers entregas={entregas} />
              {entregas.filter(e => e.latitude && e.longitude).map(e => (
                <Marker key={e.comanda_numero} position={[e.latitude!, e.longitude!]} icon={motoIcon}>
                  <Popup>
                    <div className="text-sm font-semibold">{e.cliente}</div>
                    <div className="text-xs text-gray-500">#{e.comanda_numero}</div>
                    {e.endereco && <div className="text-xs mt-1">{e.endereco}</div>}
                    {e.atualizado_em && (
                      <div className="text-xs text-gray-400 mt-1">
                        Atualizado: {new Date(e.atualizado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          <div className="space-y-2">
            {entregas.map(e => (
              <div key={e.comanda_numero} className="bg-slate-800 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400">#{e.comanda_numero}</span>
                    <span className={`text-xs font-semibold ${STATUS_COLOR[e.status]}`}>
                      {e.status === 'em_rota' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse mr-1" />}
                      {STATUS_LABEL[e.status]}
                    </span>
                  </div>
                  <p className="font-semibold text-white text-sm">{e.cliente}</p>
                  {e.endereco && <p className="text-xs text-slate-400">{e.endereco}</p>}
                </div>
                <div className="text-right text-xs text-slate-500">
                  {e.latitude && e.longitude
                    ? <span className="text-green-400">📍 GPS ativo</span>
                    : <span className="text-slate-500">Sem localização</span>}
                  {e.atualizado_em && (
                    <p className="mt-0.5">{new Date(e.atualizado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
