import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastMessage {
  id: string
  type: ToastType
  message: string
  duration?: number
}

interface ToastProps {
  toasts: ToastMessage[]
  onRemove: (id: string) => void
}

const ICONS = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info
}

const COLORS = {
  success: {
    bg: 'var(--success-light)',
    border: 'var(--success)',
    text: 'var(--success)',
    icon: 'var(--success)'
  },
  error: {
    bg: 'var(--error-light)',
    border: 'var(--error)',
    text: 'var(--error)',
    icon: 'var(--error)'
  },
  warning: {
    bg: 'var(--warning-light)',
    border: 'var(--warning)',
    text: 'var(--warning)',
    icon: 'var(--warning)'
  },
  info: {
    bg: 'var(--accent-light)',
    border: 'var(--accent)',
    text: 'var(--accent)',
    icon: 'var(--accent)'
  }
}

function ToastItem({ toast, onRemove }: { toast: ToastMessage; onRemove: () => void }) {
  const [isExiting, setIsExiting] = useState(false)
  const Icon = ICONS[toast.type]
  const colors = COLORS[toast.type]

  useEffect(() => {
    const duration = toast.duration || 3000
    const exitTimer = setTimeout(() => {
      setIsExiting(true)
    }, duration - 300)

    const removeTimer = setTimeout(() => {
      onRemove()
    }, duration)

    return () => {
      clearTimeout(exitTimer)
      clearTimeout(removeTimer)
    }
  }, [toast.duration, onRemove])

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg transition-all duration-300 ${
        isExiting ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'
      }`}
      style={{
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        minWidth: '280px',
        maxWidth: '400px'
      }}
    >
      <Icon size={18} style={{ color: colors.icon, flexShrink: 0 }} />
      <p
        className="flex-1 text-sm font-medium"
        style={{ color: colors.text }}
      >
        {toast.message}
      </p>
      <button
        onClick={() => {
          setIsExiting(true)
          setTimeout(onRemove, 200)
        }}
        className="p-1 rounded-lg transition-colors hover:bg-black/5"
        style={{ color: colors.text }}
      >
        <X size={14} />
      </button>
    </div>
  )
}

export function Toast({ toasts, onRemove }: ToastProps) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3">
      {toasts.map(toast => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onRemove={() => onRemove(toast.id)}
        />
      ))}
    </div>
  )
}

