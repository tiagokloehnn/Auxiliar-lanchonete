import { useLiveQuery } from 'dexie-react-hooks'
import db from '../db'
import type { Comanda, Item, TipoAtendimento } from '../types'

export function useComandas() {
  const ativas = useLiveQuery(() =>
    db.comandas.where('status').equals('ativa').sortBy('criadaEm')
  )

  const filaEntrega = useLiveQuery(() =>
    db.comandas.where('status').equals('aguardando_entrega').sortBy('finalizadaEm')
  )

  const historico = useLiveQuery(() =>
    db.comandas
      .where('status')
      .anyOf(['finalizada', 'cancelada'])
      .reverse()
      .sortBy('finalizadaEm')
  )

  async function criarComanda(dados: {
    cliente: string
    tipoAtendimento?: TipoAtendimento
    mesa?: string
    enderecoEntrega?: string
    itens: Item[]
    tempoLimiteMins: number
    observacaoGeral?: string
  }): Promise<string> {
    const count = await db.comandas.count()
    const numero = String(count + 1).padStart(3, '0')

    await db.comandas.add({
      numero,
      cliente: dados.cliente,
      tipoAtendimento: dados.tipoAtendimento ?? 'mesa',
      mesa: dados.mesa,
      enderecoEntrega: dados.enderecoEntrega,
      itens: dados.itens,
      tempoLimiteMins: dados.tempoLimiteMins,
      criadaEm: new Date(),
      status: 'ativa',
      observacaoGeral: dados.observacaoGeral,
    })

    return numero
  }

  async function finalizarComanda(id: number) {
    const comanda = await db.comandas.get(id)
    if (!comanda) return
    const alerta = calcularAlerta(comanda)
    const update: Partial<Comanda> = {
      finalizadaEm: new Date(),
      status: comanda.tipoAtendimento === 'entrega' ? 'aguardando_entrega' : 'finalizada',
    }
    if (alerta.level === 'expirada') {
      update.tempoExpiradoMins = Math.abs(Math.min(0, alerta.minutosRestantes))
    }
    await db.comandas.update(id, update)
  }

  async function confirmarEntregaRealizada(id: number) {
    await db.comandas.update(id, { status: 'finalizada' })
  }

  async function cancelarComanda(id: number) {
    const comanda = await db.comandas.get(id)
    const update: Partial<Comanda> = {
      status: 'cancelada',
      finalizadaEm: new Date(),
    }
    if (comanda) {
      const alerta = calcularAlerta(comanda)
      if (alerta.level === 'expirada') {
        update.tempoExpiradoMins = Math.abs(Math.min(0, alerta.minutosRestantes))
      }
    }
    await db.comandas.update(id, update)
  }

  async function excluirComanda(id: number) {
    await db.comandas.delete(id)
  }

  async function limparHistorico() {
    await db.comandas.where('status').anyOf(['finalizada', 'cancelada']).delete()
  }

  return {
    ativas: ativas ?? [],
    filaEntrega: filaEntrega ?? [],
    historico: historico ?? [],
    criarComanda,
    finalizarComanda,
    confirmarEntregaRealizada,
    cancelarComanda,
    excluirComanda,
    limparHistorico,
  }
}

export function calcularAlerta(comanda: Comanda): {
  level: 'normal' | 'atencao' | 'urgente' | 'expirada'
  minutosRestantes: number
  percentualRestante: number
} {
  const agora = new Date()
  const inicio = new Date(comanda.criadaEm)
  const limiteMilis = comanda.tempoLimiteMins * 60 * 1000
  const decorridoMilis = agora.getTime() - inicio.getTime()
  const restanteMilis = limiteMilis - decorridoMilis
  const minutosRestantes = Math.ceil(restanteMilis / 60000)
  const percentualRestante = Math.max(0, (restanteMilis / limiteMilis) * 100)

  let level: 'normal' | 'atencao' | 'urgente' | 'expirada'
  if (restanteMilis <= 0) {
    level = 'expirada'
  } else if (percentualRestante <= 20) {
    level = 'urgente'
  } else if (percentualRestante <= 40) {
    level = 'atencao'
  } else {
    level = 'normal'
  }

  return { level, minutosRestantes, percentualRestante }
}
