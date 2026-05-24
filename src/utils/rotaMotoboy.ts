export const PARADAS_KEY = 'pedidocerto_paradas'

export interface Parada {
  numero: string
  cliente: string
  endereco: string
  status: 'aguardando' | 'em_rota' | 'entregue'
}

export function lerParadas(): Parada[] {
  try { return JSON.parse(localStorage.getItem(PARADAS_KEY) ?? '[]') } catch { return [] }
}

export function gravarParadas(paradas: Parada[]) {
  localStorage.setItem(PARADAS_KEY, JSON.stringify(paradas))
}

export function limparParadas() {
  localStorage.removeItem(PARADAS_KEY)
}

export function abrirRotaMaps(paradas: Parada[]) {
  const ativas = paradas.filter(p => p.status !== 'entregue' && p.endereco)
  if (ativas.length === 0) return

  if (ativas.length === 1) {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(ativas[0].endereco)}`,
      '_blank'
    )
    return
  }

  const destino = encodeURIComponent(ativas[ativas.length - 1].endereco)
  const waypoints = ativas.slice(0, -1).map(p => encodeURIComponent(p.endereco)).join('|')
  window.open(
    `https://www.google.com/maps/dir/?api=1&destination=${destino}&waypoints=${waypoints}`,
    '_blank'
  )
}
