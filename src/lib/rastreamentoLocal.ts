import type { EntregaRastreada } from '../types'

const KEY = 'pizzaria_rastreamento'

function getAll(): EntregaRastreada[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]')
  } catch {
    return []
  }
}

function saveAll(entregas: EntregaRastreada[]) {
  localStorage.setItem(KEY, JSON.stringify(entregas))
}

export const rastreamentoLocal = {
  listar(): EntregaRastreada[] {
    return getAll().filter(e => e.status !== 'entregue')
  },

  buscar(comanda_numero: string): EntregaRastreada | null {
    return getAll().find(e => e.comanda_numero === comanda_numero) ?? null
  },

  criar(entrega: EntregaRastreada) {
    const todas = getAll().filter(e => e.comanda_numero !== entrega.comanda_numero)
    saveAll([...todas, entrega])
  },

  atualizar(comanda_numero: string, patch: Partial<EntregaRastreada>) {
    const todas = getAll().map(e =>
      e.comanda_numero === comanda_numero
        ? { ...e, ...patch, atualizado_em: new Date().toISOString() }
        : e
    )
    saveAll(todas)
  },

  // Listeners simples para simular realtime
  _listeners: new Set<() => void>(),

  onChange(fn: () => void) {
    this._listeners.add(fn)
    return () => this._listeners.delete(fn)
  },

  _notify() {
    this._listeners.forEach(fn => fn())
  },
}

// Intercepta writes para disparar listeners
const _criar = rastreamentoLocal.criar.bind(rastreamentoLocal)
const _atualizar = rastreamentoLocal.atualizar.bind(rastreamentoLocal)

rastreamentoLocal.criar = (e) => { _criar(e); rastreamentoLocal._notify() }
rastreamentoLocal.atualizar = (n, p) => { _atualizar(n, p); rastreamentoLocal._notify() }
