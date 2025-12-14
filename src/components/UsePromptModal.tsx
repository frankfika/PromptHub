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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--bg-secondary)] rounded-xl w-full max-w-lg">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <h2 className="text-lg font-semibold">填写变量</h2>
          <button onClick={onClose} className="p-1 hover:bg-[var(--bg-tertiary)] rounded">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="text-sm text-[var(--text-secondary)]">
            这个提示词包含 {templateVars.length} 个变量，请填写：
          </div>

          {templateVars.map(v => (
            <div key={v}>
              <label className="block text-sm font-medium mb-1.5 text-[var(--text-primary)]">
                {v}
              </label>
              <input
                type="text"
                value={variables[v] || ''}
                onChange={e => setVariables(prev => ({ ...prev, [v]: e.target.value }))}
                placeholder={`请输入 ${v}`}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
          ))}

          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1.5">预览</label>
            <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg p-3 font-mono text-sm text-[var(--text-primary)] max-h-40 overflow-auto whitespace-pre-wrap">
              {filledContent}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-4 border-t border-[var(--border)]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] rounded-lg"
          >
            取消
          </button>
          <button
            onClick={handleCopy}
            className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg flex items-center gap-2"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? '已复制' : '复制'}
          </button>
        </div>
      </div>
    </div>
  )
}
