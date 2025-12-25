import { useState, useMemo } from 'react'
import { X, Copy, Check } from 'lucide-react'
import type { Prompt } from '../types/prompt'
import { parseTemplateVariables, fillTemplate } from '../lib/ai'

interface Props {
  prompt: Prompt
  onClose: () => void
  onCopy: () => void
}

export function UsePromptModal({ prompt, onClose, onCopy }: Props) {
  const templateVars = useMemo(() => parseTemplateVariables(prompt.content), [prompt.content])

  // 初始化变量状态
  const initialVars = useMemo(() => {
    const initial: Record<string, string> = {}
    templateVars.forEach(v => { initial[v] = '' })
    return initial
  }, [templateVars])

  const [variables, setVariables] = useState<Record<string, string>>(initialVars)
  const [copied, setCopied] = useState(false)

  const filledContent = fillTemplate(prompt.content, variables)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(filledContent)
    onCopy()
    setCopied(true)
    setTimeout(() => {
      setCopied(false)
      onClose()
    }, 1000)
  }

  // 无变量时直接复制
  if (templateVars.length === 0) {
    return null
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="w-full max-w-lg animate-scaleIn"
        style={{
          background: 'var(--bg-card)',
          borderRadius: '20px',
          boxShadow: 'var(--shadow-lg)'
        }}
      >
        <div
          className="flex items-center justify-between p-5"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <h2
            className="text-lg font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            填写变量
          </h2>
          <button onClick={onClose} className="action-btn">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div
            className="text-sm"
            style={{ color: 'var(--text-secondary)' }}
          >
            这个提示词包含 {templateVars.length} 个变量，请填写：
          </div>

          {templateVars.map(v => (
            <div key={v}>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'var(--text-primary)' }}
              >
                {v}
              </label>
              <input
                type="text"
                value={variables[v] || ''}
                onChange={e => setVariables(prev => ({ ...prev, [v]: e.target.value }))}
                placeholder={`请输入 ${v}`}
                className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-all input-modern"
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>
          ))}

          <div>
            <label
              className="block text-sm mb-1.5"
              style={{ color: 'var(--text-muted)' }}
            >
              预览
            </label>
            <div
              className="rounded-xl p-4 text-sm max-h-40 overflow-auto whitespace-pre-wrap"
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                fontFamily: 'inherit'
              }}
            >
              {filledContent}
            </div>
          </div>
        </div>

        <div
          className="flex justify-end gap-3 p-5"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            取消
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all btn-press"
            style={{
              background: copied ? 'var(--success-light)' : 'var(--accent)',
              color: copied ? 'var(--success)' : 'white',
              boxShadow: copied ? 'none' : '0 2px 8px var(--accent-glow)',
              minWidth: '88px'
            }}
          >
            {copied ? <Check size={16} className="copy-success-icon" /> : <Copy size={16} />}
            {copied ? '已复制' : '复制'}
          </button>
        </div>
      </div>
    </div>
  )
}
