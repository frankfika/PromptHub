import { useState } from 'react'
import { Copy, Star, Trash2, Edit3, Check, ExternalLink, Banana, ImageIcon } from 'lucide-react'
import type { Prompt } from '../types/prompt'

// 分类颜色
const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  '写作': { bg: '#EEF2FF', text: '#6366F1' },
  '编程': { bg: '#ECFDF5', text: '#10B981' },
  '翻译': { bg: '#F5F3FF', text: '#8B5CF6' },
  '分析': { bg: '#FFFBEB', text: '#F59E0B' },
  '图像': { bg: '#FDF2F8', text: '#EC4899' },
  '创意': { bg: '#FFF7ED', text: '#F97316' },
  '效率': { bg: '#ECFEFF', text: '#06B6D4' },
  '角色扮演': { bg: '#EEF2FF', text: '#6366F1' },
  '其他': { bg: '#F1F5F9', text: '#64748B' },
}

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

  const categoryColor = CATEGORY_COLORS[prompt.category] || CATEGORY_COLORS['其他']
  const isNanoBanana = prompt.source?.url?.toLowerCase().includes('nanobanana2')
  const isImageModel = prompt.targetModel?.toLowerCase().includes('nanobanana') ||
    prompt.targetModel?.toLowerCase().includes('midjourney') ||
    prompt.targetModel?.toLowerCase().includes('dall-e') ||
    prompt.targetModel?.toLowerCase().includes('flux') ||
    prompt.targetModel?.toLowerCase().includes('stable')

  return (
    <div
      className="group cursor-pointer"
      onClick={onView}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '14px',
        boxShadow: isHovered ? 'var(--shadow-card-hover)' : 'var(--shadow-card)',
        transform: isHovered ? 'translateY(-2px)' : 'none',
        transition: 'all 0.2s ease'
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
                  background: isImageModel ? '#FDF2F8' : 'var(--bg-tertiary)',
                  color: isImageModel ? '#EC4899' : 'var(--text-muted)'
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
              className="flex items-center gap-1 mr-1"
              style={{ opacity: isHovered ? 1 : 0, transition: 'opacity 0.15s' }}
            >
              <button
                onClick={e => { e.stopPropagation(); onEdit() }}
                className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)]"
                style={{ color: 'var(--text-muted)' }}
              >
                <Edit3 size={14} />
              </button>
              <button
                onClick={e => { e.stopPropagation(); onDelete() }}
                className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-500"
                style={{ color: 'var(--text-muted)' }}
              >
                <Trash2 size={14} />
              </button>
            </div>

            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                background: copied ? 'var(--success-light)' : 'var(--accent)',
                color: copied ? 'var(--success)' : 'white'
              }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? '已复制' : '复制'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
