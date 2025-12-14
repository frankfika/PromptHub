import { useState } from 'react'
import { Search, X, Loader2, Sparkles, ArrowRight, Command } from 'lucide-react'
import type { Prompt } from '../types/prompt'
import { smartSearch, type SmartSearchResult } from '../lib/access'

interface Props {
  value: string
  onChange: (value: string) => void
  searching?: boolean
  placeholder?: string
  prompts?: Prompt[]
  onSelectPrompt?: (prompt: Prompt) => void
}

export function SearchBar({
  value,
  onChange,
  searching = false,
  placeholder = '搜索 Prompts...',
  prompts = [],
  onSelectPrompt
}: Props) {
  const [isSmartMode, setIsSmartMode] = useState(false)
  const [smartSearching, setSmartSearching] = useState(false)
  const [smartResult, setSmartResult] = useState<SmartSearchResult | null>(null)
  const [isFocused, setIsFocused] = useState(false)

  const handleSmartSearch = async () => {
    if (!value.trim() || smartSearching || prompts.length === 0) return

    setSmartSearching(true)
    setSmartResult(null)

    try {
      const result = await smartSearch(value, prompts)
      setSmartResult(result)
    } catch (e) {
      console.error('Smart search failed:', e)
    } finally {
      setSmartSearching(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isSmartMode && value.trim()) {
      e.preventDefault()
      handleSmartSearch()
    }
  }

  const handleClear = () => {
    onChange('')
    setSmartResult(null)
  }

  return (
    <div className="space-y-4">
      {/* 搜索框 */}
      <div className="flex gap-3">
        {/* 模式切换 */}
        <div
          className="flex p-1 rounded-xl"
          style={{ background: 'var(--bg-tertiary)' }}
        >
          <button
            onClick={() => { setIsSmartMode(false); setSmartResult(null) }}
            className="px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200"
            style={{
              background: !isSmartMode ? 'var(--bg-card)' : 'transparent',
              color: !isSmartMode ? 'var(--text-primary)' : 'var(--text-muted)',
              boxShadow: !isSmartMode ? 'var(--shadow-sm)' : 'none'
            }}
          >
            搜索
          </button>
          <button
            onClick={() => setIsSmartMode(true)}
            className="px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-1.5"
            style={{
              background: isSmartMode ? 'var(--bg-card)' : 'transparent',
              color: isSmartMode ? 'var(--accent)' : 'var(--text-muted)',
              boxShadow: isSmartMode ? 'var(--shadow-sm)' : 'none'
            }}
          >
            <Sparkles size={14} />
            AI 问答
          </button>
        </div>

        {/* 搜索输入框 */}
        <div className="relative flex-1">
          <div
            className="relative flex items-center rounded-xl transition-all duration-200"
            style={{
              background: 'var(--bg-card)',
              border: `1px solid ${isFocused ? 'var(--accent)' : 'var(--border)'}`,
              boxShadow: isFocused ? '0 0 0 3px var(--accent-glow)' : 'var(--shadow-sm)'
            }}
          >
            {(searching || smartSearching) ? (
              <Loader2
                size={18}
                className="absolute left-4 animate-spin"
                style={{ color: 'var(--accent)' }}
              />
            ) : (
              <Search
                size={18}
                className="absolute left-4 transition-colors"
                style={{ color: isFocused ? 'var(--accent)' : 'var(--text-muted)' }}
              />
            )}

            <input
              id="global-search"
              type="text"
              value={value}
              onChange={e => { onChange(e.target.value); if (!isSmartMode) setSmartResult(null) }}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={isSmartMode ? '问任何关于你的 Prompts 的问题...' : placeholder}
              className="w-full bg-transparent pl-12 pr-24 py-3 text-sm focus:outline-none"
              style={{ color: 'var(--text-primary)' }}
            />

            {/* 右侧 */}
            <div className="absolute right-3 flex items-center gap-2">
              {value ? (
                <>
                  {isSmartMode && (
                    <button
                      onClick={handleSmartSearch}
                      disabled={smartSearching}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-50"
                      style={{
                        background: 'var(--accent)',
                        color: 'white'
                      }}
                    >
                      询问
                    </button>
                  )}
                  <button
                    onClick={handleClear}
                    className="p-1.5 rounded-lg transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <X size={16} />
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <kbd
                    className="px-1.5 py-0.5 rounded-md text-[10px] font-medium"
                    style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
                  >
                    <Command size={10} className="inline" />K
                  </kbd>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* AI 问答结果 */}
      {isSmartMode && smartResult && (
        <div
          className="rounded-2xl overflow-hidden animate-fadeIn"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-md)'
          }}
        >
          {/* 头部 */}
          <div
            className="flex items-center gap-2 px-5 py-3"
            style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-tertiary)' }}
          >
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--accent-light)' }}
            >
              <Sparkles size={12} style={{ color: 'var(--accent)' }} />
            </div>
            <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>AI 回答</span>
          </div>

          <div className="p-5 space-y-4">
            {/* 回答 */}
            <div
              className="text-sm leading-relaxed whitespace-pre-wrap"
              style={{ color: 'var(--text-primary)' }}
            >
              {smartResult.answer}
            </div>

            {/* 相关提示词 */}
            {smartResult.relatedPrompts.length > 0 && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                <div
                  className="text-xs font-medium uppercase tracking-wider mb-3"
                  style={{ color: 'var(--text-muted)' }}
                >
                  相关 Prompts
                </div>
                <div className="space-y-2">
                  {smartResult.relatedPrompts.slice(0, 3).map(prompt => (
                    <div
                      key={prompt.id}
                      onClick={() => onSelectPrompt?.(prompt)}
                      className="flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-200 group"
                      style={{ background: 'var(--bg-tertiary)' }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'var(--accent-light)'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'var(--bg-tertiary)'
                      }}
                    >
                      <div className="min-w-0">
                        <div
                          className="text-sm font-medium truncate"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {prompt.title}
                        </div>
                        <div
                          className="text-xs mt-0.5"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {prompt.category} · 使用 {prompt.usageCount} 次
                        </div>
                      </div>
                      <ArrowRight
                        size={16}
                        className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: 'var(--accent)' }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
