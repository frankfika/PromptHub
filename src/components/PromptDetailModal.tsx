import { useState, useEffect } from 'react'
import { X, Copy, Check, Star, Edit3, ExternalLink, Calendar, Share2, Banana, ImageIcon, ZoomIn, History, ChevronDown, RotateCcw } from 'lucide-react'
import type { Prompt } from '../types/prompt'
import { promptDB } from '../lib/db'

// 检测来源品牌
function detectSourceBrand(url?: string): boolean {
  if (!url) return false
  return url.toLowerCase().includes('nanobanana2')
}

// 生成分享文本
function generateShareText(prompt: Prompt): string {
  const lines = [
    `${prompt.title}`,
    '',
    prompt.description ? `${prompt.description}` : '',
    '',
    '---',
    prompt.content,
    '---',
    '',
    `Category: ${prompt.category}`,
    prompt.targetModel ? `Model: ${prompt.targetModel}` : '',
    '',
    'via PromptHub'
  ].filter(Boolean)
  return lines.join('\n')
}

interface Props {
  prompt: Prompt
  onClose: () => void
  onCopy: () => void
  onEdit: () => void
  onToggleFavorite: () => void
  onRestore?: () => void // 恢复版本后刷新
}

export function PromptDetailModal({ prompt, onClose, onCopy, onEdit, onToggleFavorite, onRestore }: Props) {
  const [copied, setCopied] = useState(false)
  const [shared, setShared] = useState(false)
  const [showLightbox, setShowLightbox] = useState(false)
  const [showVersions, setShowVersions] = useState(false)
  const [restoringVersion, setRestoringVersion] = useState<number | null>(null)

  const isNanoBanana = detectSourceBrand(prompt.source?.url)
  const hasVersions = prompt.versions && prompt.versions.length > 0

  // 恢复到某个版本
  const handleRestoreVersion = async (versionIndex: number) => {
    if (!prompt.id) return
    setRestoringVersion(versionIndex)
    try {
      await promptDB.restoreVersion(prompt.id, versionIndex)
      onRestore?.()
      onClose()
    } catch (error) {
      console.error('恢复版本失败:', error)
    } finally {
      setRestoringVersion(null)
    }
  }

  // 格式化版本时间
  const formatVersionTime = (date: Date) => {
    const d = new Date(date)
    return d.toLocaleString('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Lightbox 键盘事件 - Escape 关闭
  useEffect(() => {
    if (!showLightbox) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setShowLightbox(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showLightbox])

  const handleCopy = () => {
    onCopy()
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const handleShare = async () => {
    const shareText = generateShareText(prompt)

    if (navigator.share) {
      try {
        await navigator.share({
          title: prompt.title,
          text: shareText
        })
        return
      } catch {
        // fallback
      }
    }

    await navigator.clipboard.writeText(shareText)
    setShared(true)
    setTimeout(() => setShared(false), 2000)
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(4px)'
      }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-scaleIn"
        style={{
          background: 'var(--bg-card)',
          borderRadius: '20px',
          boxShadow: 'var(--shadow-lg)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* 顶部栏 */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <span
            className="px-2.5 py-1 text-xs font-medium rounded-md"
            style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}
          >
            {prompt.category}
          </span>

          <div className="flex items-center gap-0.5">
            <button
              onClick={handleShare}
              className="action-btn"
              style={{ color: shared ? 'var(--accent)' : undefined }}
              title="分享"
            >
              {shared ? <Check size={18} className="copy-success-icon" /> : <Share2 size={18} />}
            </button>
            <button
              onClick={onToggleFavorite}
              className="action-btn"
              style={{ color: prompt.isFavorite ? '#F59E0B' : undefined }}
              title="收藏"
            >
              <Star size={18} fill={prompt.isFavorite ? 'currentColor' : 'none'} />
            </button>
            <button
              onClick={onEdit}
              className="action-btn"
              title="编辑"
            >
              <Edit3 size={18} />
            </button>
            <button
              onClick={onClose}
              className="action-btn"
              title="关闭"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-auto px-6 py-6">
          {/* 标题 */}
          <h2
            style={{
              fontSize: '22px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              lineHeight: 1.3,
              letterSpacing: '-0.01em',
              marginBottom: '10px'
            }}
          >
            {prompt.title}
          </h2>

          {/* 描述 */}
          {prompt.description && (
            <p
              style={{
                fontSize: '14px',
                lineHeight: 1.6,
                color: 'var(--text-muted)',
                marginBottom: '20px'
              }}
            >
              {prompt.description}
            </p>
          )}

          {/* 元信息 */}
          <div
            className="flex flex-wrap items-center gap-3 mb-6"
            style={{ fontSize: '13px', color: 'var(--text-caption)' }}
          >
            {prompt.targetModel && (
              <span
                className="px-2 py-1 rounded-md"
                style={{ background: 'var(--bg-tertiary)' }}
              >
                {prompt.targetModel}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar size={14} />
              {formatDate(prompt.createdAt)}
            </span>
            <span>{prompt.usageCount} 次使用</span>

            {isNanoBanana && (
              <a
                href={prompt.source?.url}
                target="_blank"
                rel="noopener noreferrer"
                className="source-badge source-badge-banana"
              >
                <Banana size={12} />
                <span>nanobanana2</span>
              </a>
            )}

            {!isNanoBanana && prompt.source?.url && (
              <a
                href={prompt.source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 transition-colors hover:text-[var(--accent)]"
                style={{ color: 'var(--text-caption)' }}
              >
                <ExternalLink size={14} />
                <span>来源</span>
              </a>
            )}

            {/* 参考图缩略图 - 点击放大 */}
            {prompt.source?.screenshot && (
              <button
                onClick={() => setShowLightbox(true)}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md transition-all hover:scale-105"
                style={{ background: 'var(--bg-tertiary)' }}
                title="点击查看参考图"
              >
                <ImageIcon size={14} style={{ color: 'var(--accent)' }} />
                <span>参考图</span>
                <ZoomIn size={12} style={{ color: 'var(--text-muted)' }} />
              </button>
            )}
          </div>

          {/* 内容 */}
          <div
            className="p-4 rounded-xl mb-5"
            style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border)'
            }}
          >
            <pre
              style={{
                fontFamily: 'inherit',
                fontSize: '14px',
                lineHeight: 1.7,
                color: 'var(--text-secondary)',
                whiteSpace: 'pre-wrap',
                margin: 0
              }}
            >
              {prompt.content}
            </pre>
          </div>

          {/* 标签 */}
          {prompt.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-5">
              {prompt.tags.map(tag => (
                <span
                  key={tag}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg"
                  style={{
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-muted)'
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* 版本历史 */}
          {hasVersions && (
            <div
              className="rounded-xl overflow-hidden"
              style={{ border: '1px solid var(--border)' }}
            >
              <button
                onClick={() => setShowVersions(!showVersions)}
                className="w-full flex items-center justify-between px-4 py-3 transition-colors hover:bg-[var(--bg-tertiary)]"
                style={{ background: 'var(--bg-secondary)' }}
              >
                <span className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  <History size={16} style={{ color: 'var(--text-muted)' }} />
                  版本历史
                  <span
                    className="px-1.5 py-0.5 text-xs rounded"
                    style={{ background: 'var(--bg-tertiary)', color: 'var(--text-caption)' }}
                  >
                    {prompt.versions?.length}
                  </span>
                </span>
                <ChevronDown
                  size={16}
                  style={{
                    color: 'var(--text-muted)',
                    transform: showVersions ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s'
                  }}
                />
              </button>

              {showVersions && (
                <div
                  className="max-h-48 overflow-auto"
                  style={{ borderTop: '1px solid var(--border)' }}
                >
                  {prompt.versions?.map((version, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-[var(--bg-tertiary)]"
                      style={{ borderBottom: index < (prompt.versions?.length || 0) - 1 ? '1px solid var(--border)' : 'none' }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                            版本 {(prompt.versions?.length || 0) - index}
                          </span>
                          <span className="text-xs" style={{ color: 'var(--text-caption)' }}>
                            {formatVersionTime(version.updatedAt)}
                          </span>
                        </div>
                        <p
                          className="text-xs line-clamp-1"
                          style={{ color: 'var(--text-caption)' }}
                        >
                          {version.content.slice(0, 80)}...
                        </p>
                      </div>
                      <button
                        onClick={() => handleRestoreVersion(index)}
                        disabled={restoringVersion !== null}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors hover:bg-[var(--accent-light)]"
                        style={{ color: 'var(--accent)' }}
                        title="恢复此版本"
                      >
                        {restoringVersion === index ? (
                          <span className="animate-spin">...</span>
                        ) : (
                          <>
                            <RotateCcw size={12} />
                            恢复
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 底部 */}
        <div
          className="flex justify-end items-center gap-3 px-6 py-4"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            关闭
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

      {/* 图片 Lightbox */}
      {showLightbox && prompt.source?.screenshot && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.85)' }}
          onClick={() => setShowLightbox(false)}
        >
          <button
            className="absolute top-4 right-4 p-2 rounded-full transition-colors"
            style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}
            onClick={() => setShowLightbox(false)}
          >
            <X size={24} />
          </button>
          <img
            src={prompt.source.screenshot}
            alt="参考图"
            className="max-w-full max-h-[90vh] object-contain rounded-lg animate-scaleIn"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
