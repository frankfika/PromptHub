import { useEffect, useRef } from 'react'
import { AlertTriangle, X } from 'lucide-react'

interface ConfirmModalProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'warning' | 'info'
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = '确定',
  cancelText = '取消',
  type = 'danger',
  onConfirm,
  onCancel
}: ConfirmModalProps) {
  const confirmButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (isOpen) {
      // 聚焦到确认按钮
      confirmButtonRef.current?.focus()

      // 监听 Escape 关闭
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onCancel()
        }
      }
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onCancel])

  if (!isOpen) return null

  const colors = {
    danger: {
      icon: 'var(--error)',
      iconBg: 'var(--error-light)',
      button: 'var(--error)',
      buttonHover: '#DC2626'
    },
    warning: {
      icon: 'var(--warning)',
      iconBg: 'var(--warning-light)',
      button: 'var(--warning)',
      buttonHover: '#D97706'
    },
    info: {
      icon: 'var(--accent)',
      iconBg: 'var(--accent-light)',
      button: 'var(--accent)',
      buttonHover: 'var(--accent-hover)'
    }
  }

  const color = colors[type]

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-[60] p-4"
      style={{ background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm animate-scaleIn"
        style={{
          background: 'var(--bg-card)',
          borderRadius: '16px',
          boxShadow: 'var(--shadow-lg)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-start gap-4 p-5">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0"
            style={{ background: color.iconBg }}
          >
            <AlertTriangle size={20} style={{ color: color.icon }} />
          </div>
          <div className="flex-1 min-w-0">
            <h3
              className="text-base font-semibold mb-1"
              style={{ color: 'var(--text-primary)' }}
            >
              {title}
            </h3>
            <p
              className="text-sm"
              style={{ color: 'var(--text-muted)', lineHeight: 1.5 }}
            >
              {message}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--bg-tertiary)]"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* 底部按钮 */}
        <div
          className="flex justify-end gap-3 px-5 py-4"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-[var(--bg-tertiary)]"
            style={{ color: 'var(--text-secondary)' }}
          >
            {cancelText}
          </button>
          <button
            ref={confirmButtonRef}
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
            style={{ background: color.button }}
            onMouseEnter={e => e.currentTarget.style.background = color.buttonHover}
            onMouseLeave={e => e.currentTarget.style.background = color.button}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
