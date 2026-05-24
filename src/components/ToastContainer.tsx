import type { ToastMessage } from '../types'

interface Props {
  toasts: ToastMessage[]
  onRemove: (id: string) => void
}

const tipoConfig = {
  atencao: {
    bg: 'bg-yellow-500',
    border: 'border-yellow-400',
    icon: '⚠️',
    label: 'Atenção',
  },
  urgente: {
    bg: 'bg-orange-500',
    border: 'border-orange-400',
    icon: '🔴',
    label: 'Urgente',
  },
  expirada: {
    bg: 'bg-red-600',
    border: 'border-red-500',
    icon: '🚨',
    label: 'Tempo Esgotado',
  },
}

export function ToastContainer({ toasts, onRemove }: Props) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-xs w-full pointer-events-none">
      {toasts.map(toast => {
        const cfg = tipoConfig[toast.tipo]
        return (
          <div
            key={toast.id}
            className={`
              ${cfg.bg} ${cfg.border} border-l-4
              text-white rounded-lg shadow-2xl p-4
              pointer-events-auto cursor-pointer
              animate-slide-in
            `}
            onClick={() => onRemove(toast.id)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <span>{cfg.icon}</span>
                  <span>{cfg.label} — Comanda #{toast.comandaNumero}</span>
                </div>
                <p className="text-sm mt-1 opacity-90">
                  {toast.cliente}
                  {toast.mesa ? ` • Mesa ${toast.mesa}` : ''}
                </p>
                <p className="text-xs mt-1 font-medium">
                  {toast.tipo === 'expirada'
                    ? 'O tempo de preparo foi excedido!'
                    : `${toast.minutosRestantes} min restantes`}
                </p>
              </div>
              <button
                className="text-white/70 hover:text-white text-lg leading-none"
                onClick={e => { e.stopPropagation(); onRemove(toast.id) }}
              >
                ×
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
