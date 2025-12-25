import { useState } from 'react'
import { Copy, Star, Trash2, Edit3, Check, ExternalLink, Banana, ImageIcon } from 'lucide-react'
import type { Prompt } from '../types/prompt'
import { getCategoryColor, isImageModel, MODEL_COLORS } from '../lib/constants'

interface Props {
  prompt: Prompt
  onCopy: () => void
  onToggleFavorite: () => void
  onDelete: () => void
  onEdit: () => void
  onView: () => void
}

export function PromptCard({ prompt, onCopy, onToggleFavorite, onDelete, onEdit, onView }: Props) {
  const [copied, setCopied] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    onCopy()
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  // 检测是否为深色模式
  const isDark = document.documentElement.classList.contains('dark')
  const categoryColor = getCategoryColor(prompt.category, isDark)
  const isNanoBanana = prompt.source?.url?.toLowerCase().includes('nanobanana2')
  const isImageModelType = isImageModel(prompt.targetModel)

  return (
    <div
      className="group cursor-pointer hover-lift"
      onClick={onView}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: 'var(--bg-card)',
        border: `1px solid ${isHovered ? 'var(--border-hover)' : 'var(--border)'}`,
        borderRadius: '16px',
        boxShadow: isHovered ? 'var(--shadow-card-hover)' : 'var(--shadow-card)',
        transform: isHovered ? 'translateY(-4px) scale(1.01)' : 'none',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
    >
      <div className="p-5">
        {/* 头部 */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            {prompt.targetModel && (
              <span
                className="px-2.5 py-1 text-xs font-medium rounded-md"
                style={{
                  background: isImageModelType
                    ? (isDark ? MODEL_COLORS.image.darkBg : MODEL_COLORS.image.bg)
                    : MODEL_COLORS.text.bg,
                  color: isImageModelType
                    ? (isDark ? MODEL_COLORS.image.darkText : MODEL_COLORS.image.text)
                    : MODEL_COLORS.text.text
                }}
              >
                {prompt.targetModel}
              </span>
            )}
            <span
              className="px-2 py-1 text-xs rounded-md"
              style={{ background: categoryColor.bg, color: categoryColor.text }}
            >
              {prompt.category}
            </span>
          </div>
          <button
            onClick={e => { e.stopPropagation(); onToggleFavorite() }}
            className="p-1.5 rounded-lg transition-all"
            style={{
              color: prompt.isFavorite ? '#F59E0B' : 'var(--text-caption)',
              opacity: prompt.isFavorite || isHovered ? 1 : 0
            }}
          >
            <Star size={16} fill={prompt.isFavorite ? 'currentColor' : 'none'} />
          </button>
        </div>

        {/* 标题 */}
        <h3
          className="font-semibold text-base mb-2 line-clamp-1"
          style={{ color: 'var(--text-primary)' }}
        >
          {prompt.title}
        </h3>

        {/* 描述 */}
        <p
          className="text-sm mb-3 line-clamp-2"
          style={{ color: 'var(--text-muted)', lineHeight: 1.5 }}
        >
          {prompt.description || prompt.content.slice(0, 100)}
        </p>

        {/* 内容预览 */}
        <div
          className="p-3 rounded-lg mb-4 line-clamp-2"
          style={{
            background: 'var(--bg-tertiary)',
            fontSize: '13px',
            lineHeight: 1.6,
            color: 'var(--text-secondary)'
          }}
        >
          {prompt.content}
        </div>

        {/* 底部 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-caption)' }}>
            <span>{prompt.usageCount} 次使用</span>
            {prompt.source?.screenshot && (
              <span
                className="flex items-center gap-1 px-1.5 py-0.5 rounded"
                style={{ background: 'var(--bg-tertiary)' }}
                title="含参考图"
              >
                <ImageIcon size={11} />
              </span>
            )}
            {isNanoBanana ? (
              <a
                href={prompt.source?.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="source-badge source-badge-banana"
              >
                <Banana size={12} />
                <span>nanobanana2</span>
              </a>
            ) : prompt.source?.url && (
              <a
                href={prompt.source.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="flex items-center gap-1 hover:text-[var(--accent)]"
              >
                <ExternalLink size={12} />
                <span>来源</span>
              </a>
            )}
          </div>

          <div className="flex items-center gap-1">
            <div
              className="flex items-center gap-0.5 mr-1"
              style={{ opacity: isHovered ? 1 : 0, transition: 'opacity 0.2s ease' }}
            >
              <button
                onClick={e => { e.stopPropagation(); onEdit() }}
                className="action-btn"
                title="编辑"
              >
                <Edit3 size={14} />
              </button>
              <button
                onClick={e => { e.stopPropagation(); onDelete() }}
                className="action-btn action-btn-danger"
                title="删除"
              >
                <Trash2 size={14} />
              </button>
            </div>

            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium btn-press transition-all duration-200"
              style={{
                background: copied ? 'var(--success-light)' : 'var(--accent)',
                color: copied ? 'var(--success)' : 'white',
                boxShadow: copied ? 'none' : '0 2px 6px var(--accent-glow)',
                minWidth: '72px'
              }}
            >
              {copied ? <Check size={14} className="copy-success-icon" /> : <Copy size={14} />}
              {copied ? '已复制' : '复制'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
