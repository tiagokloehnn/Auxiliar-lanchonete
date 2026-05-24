export type ComandaStatus = 'ativa' | 'finalizada' | 'cancelada' | 'aguardando_entrega'

export type AlertLevel = 'normal' | 'atencao' | 'urgente' | 'expirada'

export type TipoAtendimento = 'mesa' | 'entrega' | 'balcao'

export interface Item {
  id: string
  nome: string
  quantidade: number
  observacao?: string
}

export interface Comanda {
  id?: number
  numero: string
  cliente: string
  tipoAtendimento?: TipoAtendimento
  mesa?: string
  enderecoEntrega?: string
  itens: Item[]
  tempoLimiteMins: number
  criadaEm: Date
  finalizadaEm?: Date
  tempoExpiradoMins?: number
  status: ComandaStatus
  observacaoGeral?: string
}

export interface ToastMessage {
  id: string
  comandaNumero: string
  cliente: string
  mesa?: string
  minutosRestantes: number
  tipo: 'atencao' | 'urgente' | 'expirada'
}

export type StatusRastreamento = 'aguardando' | 'em_rota' | 'entregue'

export interface EntregaRastreada {
  id?: string
  comanda_numero: string
  cliente: string
  endereco?: string
  latitude?: number
  longitude?: number
  status: StatusRastreamento
  iniciado_em?: string
  atualizado_em?: string
}
