import { useState, useCallback } from 'react'
import type { ToastMessage } from '../types'

export function useToasts() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const [alertados, setAlertados] = useState<Set<string>>(new Set())

  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const chave = `${toast.comandaNumero}-${toast.tipo}`
    if (alertados.has(chave)) return

    const id = crypto.randomUUID()
    setAlertados(prev => new Set(prev).add(chave))
    setToasts(prev => [...prev, { ...toast, id }])

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 8000)
  }, [alertados])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const resetAlerta = useCallback((comandaNumero: string) => {
    setAlertados(prev => {
      const next = new Set(prev)
      next.forEach(key => {
        if (key.startsWith(comandaNumero + '-')) next.delete(key)
      })
      return next
    })
  }, [])

  return { toasts, addToast, removeToast, resetAlerta }
}
