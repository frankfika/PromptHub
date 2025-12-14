import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Sparkles, Loader2, ChevronDown, Link, ExternalLink, ImageIcon, Trash2 } from 'lucide-react'
import type { Prompt } from '../types/prompt'
import { AI_MODELS, HOT_MODELS } from '../types/prompt'
import { parseTemplateVariables, isURL, extractPromptFromText } from '../lib/ai'

interface Props {
  prompt?: Prompt | null
  initialContent?: string
  initialSource?: string
  initialScreenshot?: string
  onSave: (data: Omit<Prompt, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>) => void
  onClose: () => void
}

export function PromptModal({ prompt, initialContent, initialSource, initialScreenshot, onSave, onClose }: Props) {
  const [content, setContent] = useState(initialContent || '')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')
  const [category, setCategory] = useState('')
  const [targetModel, setTargetModel] = useState('')
  const [sourceUrl, setSourceUrl] = useState(initialSource || '')
  const [processing, setProcessing] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [variables, setVariables] = useState<string[]>([])
  const [screenshot, setScreenshot] = useState<string | null>(null) // 参考图
  const fileInputRef = useRef<HTMLInputElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  // 处理初始截图（可能是 base64 或 URL）
  useEffect(() => {
    if (initialScreenshot) {
      if (initialScreenshot.startsWith('data:')) {
        setScreenshot(initialScreenshot)
      } else if (initialScreenshot.startsWith('http')) {
        // URL 形式，需要下载转换为 base64
        fetch(initialScreenshot)
          .then(res => res.blob())
          .then(blob => {
            const reader = new FileReader()
            reader.onload = () => setScreenshot(reader.result as string)
            reader.readAsDataURL(blob)
          })
          .catch(() => setScreenshot(null))
      }
    }
  }, [initialScreenshot])

  useEffect(() => {
    if (prompt) {
      setContent(prompt.content)
      setTitle(prompt.title)
      setDescription(prompt.description)
      setTags(prompt.tags.join(', '))
      setCategory(prompt.category)
      setTargetModel(prompt.targetModel || '')
      setSourceUrl(prompt.source?.url || '')
      setScreenshot(prompt.source?.screenshot || null)
      setShowAdvanced(true)
    }
  }, [prompt])

  useEffect(() => {
    const vars = parseTemplateVariables(content)
    setVariables(vars)
  }, [content])

  // 压缩图片 - 限制最大尺寸以节省存储空间
  const compressImage = useCallback((file: File, maxWidth = 1200, quality = 0.8): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image()
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!

      img.onload = () => {
        let { width, height } = img

        // 如果图片较小，直接使用原图
        if (width <= maxWidth && file.size < 500 * 1024) {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.readAsDataURL(file)
          return
        }

        // 按比例缩放
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }

        canvas.width = width
        canvas.height = height
        ctx.drawImage(img, 0, 0, width, height)

        resolve(canvas.toDataURL('image/jpeg', quality))
      }

      img.src = URL.createObjectURL(file)
    })
  }, [])

  // 处理粘贴/上传的图片 - 压缩后保存为参考图
  const handleImageFile = useCallback(async (file: File) => {
    const compressed = await compressImage(file)
    setScreenshot(compressed)
  }, [compressImage])

  // 监听粘贴事件 (Cmd+V / Ctrl+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault()
          const file = item.getAsFile()
          if (file) {
            handleImageFile(file)
          }
          return
        }
      }
    }

    const modal = modalRef.current
    if (modal) {
      modal.addEventListener('paste', handlePaste)
      return () => modal.removeEventListener('paste', handlePaste)
    }
  }, [handleImageFile])

  const handleAIProcess = async () => {
    if (!content.trim()) return
    setProcessing(true)
    try {
      const result = await extractPromptFromText(content, sourceUrl)
      setContent(result.content)
      if (result.title) setTitle(result.title)
      if (result.description) setDescription(result.description)
      if (result.tags) setTags(result.tags.join(', '))
      if (result.category) setCategory(result.category)
      if (result.targetModel) setTargetModel(result.targetModel)
      setShowAdvanced(true)
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : 'AI 处理失败')
    } finally {
      setProcessing(false)
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleImageFile(file)
    }
  }

  const handleSave = () => {
    if (!content.trim()) return
    onSave({
      content,
      title: title.trim() || content.slice(0, 50),
      description: description.trim(),
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      category: category.trim() || '未分类',
      targetModel: targetModel.trim() || undefined,
      source: {
        type: screenshot ? 'image' : 'text',
        url: sourceUrl.trim() || undefined,
        screenshot: screenshot || undefined
      },
      isFavorite: prompt?.isFavorite || false
    })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(4px)' }}
    >
      <div
        ref={modalRef}
        className="w-full max-w-xl max-h-[85vh] overflow-hidden flex flex-col animate-scaleIn"
        style={{
          background: 'var(--bg-card)',
          borderRadius: '20px',
          boxShadow: 'var(--shadow-lg)'
        }}
      >
        {/* 头部 */}
        <div
          className="flex items-center justify-between p-5"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <h2
            className="text-lg font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            {prompt ? '编辑 Prompt' : '新建 Prompt'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-5 space-y-5">
          {/* 参考图预览 - 紧凑显示 */}
          {screenshot && (
            <div
              className="flex items-center gap-3 p-3 rounded-xl"
              style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
            >
              <img
                src={screenshot}
                alt="参考图"
                className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                style={{ border: '1px solid var(--border)' }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  <ImageIcon size={14} style={{ color: 'var(--accent)' }} />
                  已添加参考图
                </div>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  保存时会一起存储
                </p>
              </div>
              <button
                onClick={() => setScreenshot(null)}
                className="p-2 rounded-lg transition-colors hover:bg-[var(--bg-secondary)]"
                style={{ color: 'var(--text-muted)' }}
                title="移除参考图"
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}

          {/* 内容输入 */}
          <div>
            <textarea
              value={content}
              onChange={e => {
                const val = e.target.value.trim()
                // 检测是否粘贴了社交媒体链接
                const socialPatterns = [
                  { pattern: /^https?:\/\/(twitter\.com|x\.com)\/\w+\/status\/\d+/, name: 'Twitter' },
                  { pattern: /^https?:\/\/(www\.)?xiaohongshu\.com\//, name: '小红书' },
                  { pattern: /^https?:\/\/(www\.)?weibo\.(com|cn)\//, name: '微博' },
                ]

                for (const { pattern, name } of socialPatterns) {
                  if (val.match(pattern)) {
                    if (confirm(`检测到 ${name} 链接！\n\n推荐：打开页面后用扩展 ⚡ 一键保存（自动提取图片+文字）\n\n点击「确定」打开页面\n点击「取消」手动粘贴内容`)) {
                      window.open(val, '_blank')
                      return
                    }
                    break
                  }
                }
                setContent(e.target.value)
              }}
              placeholder="粘贴 Prompt 内容...&#10;&#10;💡 粘贴 Twitter 链接会自动跳转，用扩展一键保存&#10;📷 也可以直接粘贴截图 (⌘V) 作为参考图"
              rows={8}
              autoFocus
              className="w-full rounded-xl p-4 text-sm resize-none focus:outline-none transition-all"
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)'
              }}
            />

            {/* 模板变量提示 */}
            {variables.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>变量:</span>
                {variables.map(v => (
                  <span
                    key={v}
                    className="px-2.5 py-1 text-xs rounded-full font-medium"
                    style={{ background: '#ECFDF5', color: '#10B981' }}
                  >
                    {`{{${v}}}`}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 模型选择 - 重要！*/}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                适用模型
              </span>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg transition-all"
                style={{
                  background: screenshot ? 'var(--accent-light)' : 'var(--bg-tertiary)',
                  color: screenshot ? 'var(--accent)' : 'var(--text-muted)'
                }}
                title="添加参考图 (⌘V)"
              >
                <ImageIcon size={14} />
                {screenshot ? '已添加参考图' : '参考图'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {HOT_MODELS.map(model => (
                <button
                  key={model}
                  onClick={() => setTargetModel(model)}
                  className="px-3 py-1.5 text-sm rounded-lg transition-all"
                  style={{
                    background: targetModel === model ? 'var(--accent)' : 'var(--bg-tertiary)',
                    color: targetModel === model ? 'white' : 'var(--text-secondary)',
                    border: `1px solid ${targetModel === model ? 'var(--accent)' : 'var(--border)'}`
                  }}
                >
                  {model}
                </button>
              ))}
              <input
                type="text"
                value={targetModel}
                onChange={e => setTargetModel(e.target.value)}
                placeholder="其他模型..."
                list="model-suggestions"
                className="px-3 py-1.5 text-sm rounded-lg focus:outline-none"
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  width: '120px'
                }}
              />
              <datalist id="model-suggestions">
                {AI_MODELS.map(model => (
                  <option key={model} value={model} />
                ))}
              </datalist>
            </div>
          </div>

          {/* AI 处理按钮 */}
          <button
            onClick={handleAIProcess}
            disabled={!content.trim() || processing}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm rounded-xl disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all duration-200"
            style={{
              background: 'var(--gradient-warm)',
              color: 'white',
              boxShadow: '0 2px 8px var(--accent-glow)'
            }}
          >
            {processing ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                AI 处理中...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                AI 自动填写标题和分类
              </>
            )}
          </button>

          {/* 高级选项 - 折叠 */}
          <div>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-xs transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              <ChevronDown
                size={14}
                className="transition-transform"
                style={{ transform: showAdvanced ? 'none' : 'rotate(-90deg)' }}
              />
              {showAdvanced ? '收起更多选项' : '更多选项（标题、描述、来源等）'}
            </button>

            {showAdvanced && (
              <div className="mt-3 space-y-3">
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="标题（AI自动生成）"
                  className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                  style={{
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)'
                  }}
                />
                <input
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="描述（AI自动生成）"
                  className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                  style={{
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)'
                  }}
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    placeholder="分类（AI自动）"
                    className="rounded-lg px-3 py-2 text-sm focus:outline-none"
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-primary)'
                    }}
                  />
                  <input
                    type="text"
                    value={tags}
                    onChange={e => setTags(e.target.value)}
                    placeholder="标签（逗号分隔）"
                    className="rounded-lg px-3 py-2 text-sm focus:outline-none"
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
                <div
                  className="flex items-center gap-2 rounded-lg px-3 py-2"
                  style={{
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border)'
                  }}
                >
                  <Link size={14} style={{ color: 'var(--text-muted)' }} />
                  <input
                    type="url"
                    value={sourceUrl}
                    onChange={e => setSourceUrl(e.target.value)}
                    placeholder="来源链接"
                    className="flex-1 bg-transparent text-sm focus:outline-none"
                    style={{ color: 'var(--text-primary)' }}
                  />
                  {sourceUrl && isURL(sourceUrl) && (
                    <a
                      href={sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 底部按钮 */}
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
            onClick={handleSave}
            disabled={!content.trim()}
            className="px-6 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            style={{
              background: 'var(--accent)',
              color: 'white',
              boxShadow: '0 2px 8px var(--accent-glow)'
            }}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  )
}
