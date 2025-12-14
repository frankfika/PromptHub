import { useState, useRef } from 'react'
import { Search, Sparkles, Loader2, MessageSquare, ArrowRight } from 'lucide-react'
import type { Prompt } from '../types/prompt'
import { smartSearch, type SmartSearchResult } from '../lib/access'

interface Props {
  prompts: Prompt[]
  onSelectPrompt?: (prompt: Prompt) => void
}

export function SmartSearch({ prompts, onSelectPrompt }: Props) {
  const [query, setQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [result, setResult] = useState<SmartSearchResult | null>(null)
  const [mode, setMode] = useState<'simple' | 'smart'>('simple')
  const inputRef = useRef<HTMLInputElement>(null)

  // 智能搜索
  const handleSmartSearch = async () => {
    if (!query.trim() || isSearching) return

    setIsSearching(true)
    setResult(null)

    try {
      const searchResult = await smartSearch(query, prompts)
      setResult(searchResult)
    } catch (e) {
      console.error('搜索失败:', e)
    } finally {
      setIsSearching(false)
    }
  }

  // 回车触发搜索
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && mode === 'smart') {
      handleSmartSearch()
    }
  }

  return (
    <div className="space-y-4">
      {/* 搜索模式切换 */}
      <div className="flex gap-2 mb-2">
        <button
          onClick={() => setMode('simple')}
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
            mode === 'simple'
              ? 'bg-[var(--accent)] text-white'
              : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--border)]'
          }`}
        >
          <Search size={14} className="inline mr-1" />
          普通搜索
        </button>
        <button
          onClick={() => setMode('smart')}
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
            mode === 'smart'
              ? 'bg-[var(--accent)] text-white'
              : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--border)]'
          }`}
        >
          <Sparkles size={14} className="inline mr-1" />
          智能问答
        </button>
      </div>

      {/* 搜索框 */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={mode === 'smart'
            ? '问我任何问题，如"有没有写周报的提示词？"'
            : '搜索提示词...'
          }
          className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl px-4 py-3 pl-11 text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 focus:outline-none focus:border-[var(--accent)]"
        />
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />

        {mode === 'smart' && (
          <button
            onClick={handleSmartSearch}
            disabled={!query.trim() || isSearching}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            {isSearching ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <>
                <Sparkles size={14} />
                搜索
              </>
            )}
          </button>
        )}
      </div>

      {/* 智能搜索结果 */}
      {mode === 'smart' && result && (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-4 space-y-4">
          {/* AI 回答 */}
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-[var(--accent)]/20 flex items-center justify-center flex-shrink-0">
              <MessageSquare size={16} className="text-[var(--accent)]" />
            </div>
            <div className="flex-1">
              <div className="text-sm text-[var(--text-secondary)] mb-1">AI 回答</div>
              <div className="text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
                {result.answer}
              </div>
              {result.confidence > 0 && (
                <div className="mt-2 text-xs text-[var(--text-secondary)]">
                  置信度: {Math.round(result.confidence * 100)}%
                </div>
              )}
            </div>
          </div>

          {/* 相关提示词 */}
          {result.relatedPrompts.length > 0 && (
            <div className="border-t border-[var(--border)] pt-4">
              <div className="text-sm text-[var(--text-secondary)] mb-2">相关提示词</div>
              <div className="space-y-2">
                {result.relatedPrompts.map(prompt => (
                  <div
                    key={prompt.id}
                    onClick={() => onSelectPrompt?.(prompt)}
                    className="flex items-center justify-between p-3 bg-[var(--bg-primary)] rounded-lg hover:bg-[var(--bg-tertiary)] cursor-pointer group"
                  >
                    <div>
                      <div className="font-medium text-[var(--text-primary)]">{prompt.title}</div>
                      <div className="text-sm text-[var(--text-secondary)]">
                        {prompt.category} · 使用 {prompt.usageCount} 次
                      </div>
                    </div>
                    <ArrowRight size={16} className="text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 搜索中状态 */}
      {mode === 'smart' && isSearching && (
        <div className="flex items-center justify-center py-8 text-[var(--text-secondary)]">
          <Loader2 size={24} className="animate-spin mr-2" />
          AI 正在思考...
        </div>
      )}
    </div>
  )
}
