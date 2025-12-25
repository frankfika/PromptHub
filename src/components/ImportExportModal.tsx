import { useState, useRef, useCallback } from 'react'
import { X, Download, Upload, FileJson, FileText, Table, Loader2, Check } from 'lucide-react'
import { exportPrompts, importPrompts, downloadFile, type ExportFormat } from '../lib/io'

interface Props {
  onClose: () => void
  onImportComplete: () => void
}

export function ImportExportModal({ onClose, onImportComplete }: Props) {
  const [mode, setMode] = useState<'export' | 'import'>('export')
  const [format, setFormat] = useState<ExportFormat>('json')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExport = async () => {
    setLoading(true)
    try {
      const content = await exportPrompts(format)
      const mimeTypes = {
        json: 'application/json',
        markdown: 'text/markdown',
        csv: 'text/csv'
      }
      const extensions = {
        json: 'json',
        markdown: 'md',
        csv: 'csv'
      }
      downloadFile(content, `prompts-${Date.now()}.${extensions[format]}`, mimeTypes[format])
      setMessage('导出成功！')
      setTimeout(() => setMessage(''), 2000)
    } catch {
      setMessage('导出失败')
    } finally {
      setLoading(false)
    }
  }

  const processFile = useCallback(async (file: File) => {
    setLoading(true)
    try {
      const content = await file.text()

      // 自动检测格式
      let detectedFormat: ExportFormat = 'json'
      if (file.name.endsWith('.md')) {
        detectedFormat = 'markdown'
      } else if (file.name.endsWith('.csv')) {
        detectedFormat = 'csv'
      }

      const count = await importPrompts(content, detectedFormat)
      setMessage(`成功导入 ${count} 条提示词！`)
      onImportComplete()
      setTimeout(() => {
        setMessage('')
        onClose()
      }, 1500)
    } catch (error) {
      setMessage('导入失败：' + (error instanceof Error ? error.message : '未知错误'))
    } finally {
      setLoading(false)
    }
  }, [onImportComplete, onClose])

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await processFile(file)
  }

  // 拖拽处理
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      // 检查文件类型
      if (file.name.endsWith('.json') || file.name.endsWith('.md') || file.name.endsWith('.csv')) {
        await processFile(file)
      } else {
        setMessage('不支持的文件格式，请使用 JSON、Markdown 或 CSV 文件')
      }
    }
  }, [processFile])

  const formats = [
    { value: 'json' as const, label: 'JSON', icon: FileJson, desc: '完整数据，可再次导入' },
    { value: 'markdown' as const, label: 'Markdown', icon: FileText, desc: '适合阅读和分享' },
    { value: 'csv' as const, label: 'CSV', icon: Table, desc: '适合 Excel 编辑' }
  ]

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="w-full max-w-md animate-scaleIn"
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
            导入 / 导出
          </h2>
          <button onClick={onClose} className="action-btn">
            <X size={20} />
          </button>
        </div>

        <div className="p-5">
          {/* 模式切换 */}
          <div className="flex gap-2 mb-5">
            <button
              onClick={() => setMode('export')}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all duration-200"
              style={{
                background: mode === 'export' ? 'var(--accent)' : 'var(--bg-tertiary)',
                color: mode === 'export' ? 'white' : 'var(--text-secondary)',
                border: `1px solid ${mode === 'export' ? 'var(--accent)' : 'var(--border)'}`
              }}
            >
              <Download size={18} />
              导出
            </button>
            <button
              onClick={() => setMode('import')}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all duration-200"
              style={{
                background: mode === 'import' ? 'var(--accent)' : 'var(--bg-tertiary)',
                color: mode === 'import' ? 'white' : 'var(--text-secondary)',
                border: `1px solid ${mode === 'import' ? 'var(--accent)' : 'var(--border)'}`
              }}
            >
              <Upload size={18} />
              导入
            </button>
          </div>

          {mode === 'export' ? (
            <>
              <div className="text-sm text-[var(--text-secondary)] mb-3">选择导出格式：</div>
              <div className="space-y-2">
                {formats.map(f => (
                  <button
                    key={f.value}
                    onClick={() => setFormat(f.value)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200"
                    style={{
                      background: format === f.value ? 'var(--accent-light)' : 'var(--bg-tertiary)',
                      border: `1px solid ${format === f.value ? 'var(--accent)' : 'var(--border)'}`,
                      transform: format === f.value ? 'scale(1.01)' : 'none'
                    }}
                  >
                    <f.icon
                      size={20}
                      style={{ color: format === f.value ? 'var(--accent)' : 'var(--text-muted)' }}
                    />
                    <div className="text-left">
                      <div
                        className="font-medium text-sm"
                        style={{ color: format === f.value ? 'var(--accent)' : 'var(--text-primary)' }}
                      >
                        {f.label}
                      </div>
                      <div
                        className="text-xs"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {f.desc}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <button
                onClick={handleExport}
                disabled={loading}
                className="w-full mt-5 px-4 py-3 rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-all duration-200 btn-press"
                style={{
                  background: 'var(--accent)',
                  color: 'white',
                  boxShadow: '0 2px 8px var(--accent-glow)'
                }}
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                导出所有提示词
              </button>
            </>
          ) : (
            <>
              <div
                className="text-sm mb-3"
                style={{ color: 'var(--text-secondary)' }}
              >
                支持导入 JSON、Markdown、CSV 格式
              </div>

              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className="w-full px-4 py-10 border-2 border-dashed rounded-xl transition-all duration-200 flex flex-col items-center gap-2 cursor-pointer"
                style={{
                  borderColor: isDragging ? 'var(--accent)' : 'var(--border)',
                  background: isDragging ? 'var(--accent-light)' : 'var(--bg-tertiary)',
                  pointerEvents: loading ? 'none' : 'auto'
                }}
              >
                {loading ? (
                  <Loader2 size={32} className="animate-spin" style={{ color: 'var(--accent)' }} />
                ) : (
                  <>
                    <Upload
                      size={32}
                      style={{ color: isDragging ? 'var(--accent)' : 'var(--text-muted)' }}
                    />
                    <span
                      className="text-sm font-medium"
                      style={{ color: isDragging ? 'var(--accent)' : 'var(--text-secondary)' }}
                    >
                      {isDragging ? '释放文件以导入' : '点击选择文件'}
                    </span>
                    <span
                      className="text-xs"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      或拖拽文件到这里
                    </span>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.md,.csv"
                onChange={handleImport}
                className="hidden"
              />
            </>
          )}

          {/* 消息提示 */}
          {message && (
            <div
              className="mt-4 px-4 py-3 rounded-xl text-sm flex items-center gap-2 animate-fadeIn"
              style={{
                background: message.includes('成功') ? 'var(--success-light)' : 'var(--error-light)',
                color: message.includes('成功') ? 'var(--success)' : 'var(--error)'
              }}
            >
              {message.includes('成功') && <Check size={16} className="copy-success-icon" />}
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
