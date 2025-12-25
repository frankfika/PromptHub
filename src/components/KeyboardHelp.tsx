import { useEffect } from 'react'
import { X, Command } from 'lucide-react'

interface KeyboardHelpProps {
  isOpen: boolean
  onClose: () => void
}

const SHORTCUTS = [
  { keys: ['⌘', 'K'], description: '聚焦搜索框', category: '导航' },
  { keys: ['⌘', 'N'], description: '新建 Prompt', category: '导航' },
  { keys: ['Esc'], description: '关闭弹窗', category: '导航' },
  { keys: ['?'], description: '显示快捷键帮助', category: '帮助' },
]

export function KeyboardHelp({ isOpen, onClose }: KeyboardHelpProps) {
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  // 按分类分组
  const groupedShortcuts = SHORTCUTS.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = []
    }
    acc[shortcut.category].push(shortcut)
    return acc
  }, {} as Record<string, typeof SHORTCUTS>)

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-[70] p-4"
      style={{ background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md animate-scaleIn"
        style={{
          background: 'var(--bg-card)',
          borderRadius: '20px',
          boxShadow: 'var(--shadow-lg)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* 头部 */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--accent-light)' }}
            >
              <Command size={20} style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <h2
                className="text-lg font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                快捷键
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                键盘操作指南
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors hover:bg-[var(--bg-tertiary)]"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* 快捷键列表 */}
        <div className="p-6 space-y-6">
          {Object.entries(groupedShortcuts).map(([category, shortcuts]) => (
            <div key={category}>
              <h3
                className="text-xs font-semibold uppercase tracking-wider mb-3"
                style={{ color: 'var(--text-caption)' }}
              >
                {category}
              </h3>
              <div className="space-y-2">
                {shortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2"
                  >
                    <span
                      className="text-sm"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {shortcut.description}
                    </span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIndex) => (
                        <kbd
                          key={keyIndex}
                          className="px-2 py-1 rounded-lg text-xs font-medium min-w-[28px] text-center"
                          style={{
                            background: 'var(--bg-tertiary)',
                            border: '1px solid var(--border)',
                            color: 'var(--text-primary)',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                          }}
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* 底部提示 */}
        <div
          className="px-6 py-4 text-center"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            按 <kbd className="px-1.5 py-0.5 rounded text-xs" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>Esc</kbd> 关闭
          </p>
        </div>
      </div>
    </div>
  )
}
