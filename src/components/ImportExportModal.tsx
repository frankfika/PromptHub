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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--bg-secondary)] rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <h2 className="text-lg font-semibold">导入 / 导出</h2>
          <button onClick={onClose} className="p-1 hover:bg-[var(--bg-tertiary)] rounded">
            <X size={20} />
          </button>
        </div>

        <div className="p-4">
          {/* 模式切换 */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setMode('export')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                mode === 'export'
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
              }`}
            >
              <Download size={18} />
              导出
            </button>
            <button
              onClick={() => setMode('import')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                mode === 'import'
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
              }`}
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
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors ${
                      format === f.value
                        ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                        : 'border-[var(--border)] hover:border-[var(--text-secondary)]'
                    }`}
                  >
                    <f.icon size={20} className={format === f.value ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'} />
                    <div className="text-left">
                      <div className="font-medium">{f.label}</div>
                      <div className="text-xs text-[var(--text-secondary)]">{f.desc}</div>
                    </div>
                  </button>
                ))}
              </div>

              <button
                onClick={handleExport}
                disabled={loading}
                className="w-full mt-4 px-4 py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                导出所有提示词
              </button>
            </>
          ) : (
            <>
              <div className="text-sm text-[var(--text-secondary)] mb-3">
                支持导入 JSON、Markdown、CSV 格式
              </div>

              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`w-full px-4 py-8 border-2 border-dashed rounded-lg transition-colors flex flex-col items-center gap-2 cursor-pointer ${
                  isDragging
                    ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                    : 'border-[var(--border)] hover:border-[var(--accent)]'
                } ${loading ? 'pointer-events-none' : ''}`}
              >
                {loading ? (
                  <Loader2 size={32} className="animate-spin text-[var(--accent)]" />
                ) : (
                  <>
                    <Upload size={32} className={isDragging ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'} />
                    <span className={isDragging ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'}>
                      {isDragging ? '释放文件以导入' : '点击选择文件'}
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">或拖拽文件到这里</span>
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
            <div className={`mt-4 px-4 py-2 rounded-lg text-sm flex items-center gap-2 ${
              message.includes('成功')
                ? 'bg-green-500/20 text-green-400'
                : 'bg-red-500/20 text-red-400'
            }`}>
              {message.includes('成功') && <Check size={16} />}
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
