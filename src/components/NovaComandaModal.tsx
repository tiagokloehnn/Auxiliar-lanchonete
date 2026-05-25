import { useState } from 'react'
import type { Item, TipoAtendimento } from '../types'
import { imprimirComanda } from '../utils/impressao'

interface Props {
  onSalvar: (dados: {
    cliente: string
    tipoAtendimento: TipoAtendimento
    mesa?: string
    enderecoEntrega?: string
    itens: Item[]
    tempoLimiteMins: number
    observacaoGeral?: string
  }) => Promise<string>
  onFechar: () => void
}

const TEMPOS_RAPIDOS = [15, 20, 30, 40, 45, 60]

const TIPO_LABELS: Record<TipoAtendimento, { label: string; icon: string }> = {
  mesa: { label: 'Mesa', icon: '🪑' },
  entrega: { label: 'Entrega', icon: '🛵' },
  balcao: { label: 'Balcão', icon: '🏪' },
}

function novoItem(): Item {
  return { id: crypto.randomUUID(), nome: '', quantidade: 1 }
}

export function NovaComandaModal({ onSalvar, onFechar }: Props) {
  const [cliente, setCliente] = useState('')
  const [tipoAtendimento, setTipoAtendimento] = useState<TipoAtendimento>('mesa')
  const [mesa, setMesa] = useState('')
  const [enderecoEntrega, setEnderecoEntrega] = useState('')
  const [tempoLimiteMins, setTempoLimiteMins] = useState(30)
  const [tempoCustom, setTempoCustom] = useState(false)
  const [itens, setItens] = useState<Item[]>([novoItem()])
  const [observacaoGeral, setObservacaoGeral] = useState('')
  const [erro, setErro] = useState('')
  const [comandaCriada, setComandaCriada] = useState<{ numero: string } | null>(null)

  function addItem() {
    setItens(prev => [...prev, novoItem()])
  }

  function removeItem(id: string) {
    setItens(prev => prev.filter(i => i.id !== id))
  }

  function updateItem(id: string, campo: Partial<Item>) {
    setItens(prev => prev.map(i => i.id === id ? { ...i, ...campo } : i))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')

    if (!cliente.trim()) {
      setErro('Informe o nome do cliente ou identificador.')
      return
    }
    if (tipoAtendimento === 'entrega' && !enderecoEntrega.trim()) {
      setErro('Informe o endereço de entrega.')
      return
    }
    const itensValidos = itens.filter(i => i.nome.trim())
    if (itensValidos.length === 0) {
      setErro('Adicione pelo menos um item ao pedido.')
      return
    }

    const numero = await onSalvar({
      cliente: cliente.trim(),
      tipoAtendimento,
      mesa: tipoAtendimento === 'mesa' ? (mesa.trim() || undefined) : undefined,
      enderecoEntrega: tipoAtendimento === 'entrega' ? enderecoEntrega.trim() : undefined,
      itens: itensValidos,
      tempoLimiteMins,
      observacaoGeral: observacaoGeral.trim() || undefined,
    })
    setComandaCriada({ numero })
  }

  function handleImprimir() {
    imprimirComanda({
      numero: comandaCriada!.numero,
      cliente: cliente.trim(),
      tipoAtendimento,
      mesa: tipoAtendimento === 'mesa' ? (mesa.trim() || undefined) : undefined,
      enderecoEntrega: tipoAtendimento === 'entrega' ? enderecoEntrega.trim() : undefined,
      itens: itens.filter(i => i.nome.trim()),
      observacaoGeral: observacaoGeral.trim() || undefined,
      criadaEm: new Date(),
    })
  }

  if (comandaCriada) {
    return (
      <div className="fixed inset-0 bg-black/70 z-40 flex items-end sm:items-center justify-center p-4 backdrop-blur-sm">
        <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center space-y-5">
          <div>
            <div className="text-5xl mb-3">✅</div>
            <h2 className="text-lg font-black text-white">Comanda Aberta!</h2>
            <p className="text-slate-400 text-sm mt-1">
              #{comandaCriada.numero} — {cliente.trim()}
            </p>
          </div>

          <button
            onClick={handleImprimir}
            className="w-full py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
          >
            🖨️ Imprimir Pedido
          </button>

          <button
            onClick={onFechar}
            className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-40 flex items-end sm:items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-slate-900 border-b border-slate-700 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-bold text-white">Nova Comanda</h2>
          <button
            onClick={onFechar}
            className="text-slate-400 hover:text-white text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {/* Tipo de Atendimento */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
              Tipo de Atendimento
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(TIPO_LABELS) as TipoAtendimento[]).map(tipo => (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => setTipoAtendimento(tipo)}
                  className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${
                    tipoAtendimento === tipo
                      ? 'bg-red-600 border-red-500 text-white'
                      : 'bg-slate-800 border-slate-600 text-slate-300 hover:border-red-500'
                  }`}
                >
                  <span className="text-lg">{TIPO_LABELS[tipo].icon}</span>
                  <span>{TIPO_LABELS[tipo].label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Cliente e Mesa/Endereço */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                Cliente / Identificador *
              </label>
              <input
                type="text"
                value={cliente}
                onChange={e => setCliente(e.target.value)}
                placeholder="Ex: João, Apto 12..."
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-red-500 text-sm"
              />
            </div>

            {tipoAtendimento === 'mesa' && (
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                  Mesa (opcional)
                </label>
                <input
                  type="text"
                  value={mesa}
                  onChange={e => setMesa(e.target.value)}
                  placeholder="Ex: 4, Varanda..."
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-red-500 text-sm"
                />
              </div>
            )}

            {tipoAtendimento === 'entrega' && (
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                  Endereço de Entrega *
                </label>
                <input
                  type="text"
                  value={enderecoEntrega}
                  onChange={e => setEnderecoEntrega(e.target.value)}
                  placeholder="Rua, número, bairro..."
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-red-500 text-sm"
                />
              </div>
            )}
          </div>

          {/* Tempo limite */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
              Tempo de Preparo
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {TEMPOS_RAPIDOS.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setTempoLimiteMins(t); setTempoCustom(false) }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${
                    !tempoCustom && tempoLimiteMins === t
                      ? 'bg-red-600 border-red-500 text-white'
                      : 'bg-slate-800 border-slate-600 text-slate-300 hover:border-red-500'
                  }`}
                >
                  {t}min
                </button>
              ))}
              <button
                type="button"
                onClick={() => setTempoCustom(true)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${
                  tempoCustom
                    ? 'bg-red-600 border-red-500 text-white'
                    : 'bg-slate-800 border-slate-600 text-slate-300 hover:border-red-500'
                }`}
              >
                Outro
              </button>
            </div>
            {tempoCustom && (
              <input
                type="number"
                min={1}
                max={300}
                value={tempoLimiteMins}
                onChange={e => setTempoLimiteMins(Number(e.target.value))}
                placeholder="Minutos"
                className="w-32 bg-slate-800 border border-red-500 rounded-lg px-3 py-2 text-white focus:outline-none text-sm"
              />
            )}
          </div>

          {/* Itens */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">
              Itens do Pedido *
            </label>
            <div className="space-y-2">
              {itens.map((item, idx) => (
                <div key={item.id} className="flex gap-2 items-start">
                  <input
                    type="number"
                    min={1}
                    value={item.quantidade}
                    onChange={e => updateItem(item.id, { quantidade: Number(e.target.value) })}
                    className="w-14 bg-slate-800 border border-slate-600 rounded-lg px-2 py-2 text-white text-center focus:outline-none focus:border-red-500 text-sm"
                  />
                  <div className="flex-1 space-y-1">
                    <input
                      type="text"
                      value={item.nome}
                      onChange={e => updateItem(item.id, { nome: e.target.value })}
                      placeholder={`Item ${idx + 1}...`}
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-red-500 text-sm"
                    />
                    <input
                      type="text"
                      value={item.observacao ?? ''}
                      onChange={e => updateItem(item.id, { observacao: e.target.value })}
                      placeholder="Observação (ex: sem cebola)"
                      className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-1.5 text-white placeholder-slate-600 focus:outline-none focus:border-slate-500 text-xs"
                    />
                  </div>
                  {itens.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="text-slate-500 hover:text-red-400 text-xl leading-none mt-2"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addItem}
              className="mt-2 text-sm text-slate-400 hover:text-red-400 font-medium"
            >
              + Adicionar item
            </button>
          </div>

          {/* Observação geral */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
              Observação Geral (opcional)
            </label>
            <textarea
              value={observacaoGeral}
              onChange={e => setObservacaoGeral(e.target.value)}
              placeholder="Ex: Cliente com pressa, pagamento separado..."
              rows={2}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-red-500 text-sm resize-none"
            />
          </div>

          {erro && (
            <p className="text-red-400 text-sm font-medium">{erro}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onFechar}
              className="flex-1 py-3 rounded-xl border border-slate-600 text-slate-300 font-semibold hover:border-slate-400 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold transition-colors"
            >
              Abrir Comanda
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
