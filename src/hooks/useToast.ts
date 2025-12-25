import { useState } from 'react'
import type { ToastType, ToastMessage } from '../components/Toast'

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const addToast = (type: ToastType, message: string, duration = 3000) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    setToasts(prev => [...prev, { id, type, message, duration }])
    return id
  }

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  const success = (message: string, duration?: number) => addToast('success', message, duration)
  const error = (message: string, duration?: number) => addToast('error', message, duration)
  const warning = (message: string, duration?: number) => addToast('warning', message, duration)
  const info = (message: string, duration?: number) => addToast('info', message, duration)

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info
  }
}
