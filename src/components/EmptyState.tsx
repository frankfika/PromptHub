import { Plus, Upload, Sparkles, Command, Zap, FileText, BookOpen } from 'lucide-react'

interface Props {
  onAddNew: () => void
  onOpenImport?: () => void
}

export function EmptyState({ onAddNew, onOpenImport }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      {/* 插图区域 */}
      <div
        className="w-32 h-32 rounded-3xl flex items-center justify-center mb-8"
        style={{
          background: 'linear-gradient(135deg, #EFF6FF 0%, #F5F3FF 100%)'
        }}
      >
        <BookOpen
          size={56}
          strokeWidth={1.5}
          style={{ color: '#2563EB' }}
        />
      </div>

      {/* 标题 */}
      <h2
        className="text-2xl font-semibold mb-3"
        style={{ color: 'var(--text-primary)' }}
      >
        开始构建你的 Prompt 库
      </h2>

      {/* 描述 */}
      <p
        className="text-base mb-8 max-w-md"
        style={{ color: 'var(--text-secondary)' }}
      >
        创建你的第一个 Prompt，或者从其他地方导入现有的收藏
      </p>

      {/* 操作按钮 */}
      <div className="flex gap-4 mb-12">
        <button
          onClick={onAddNew}
          className="px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition-all duration-200 hover:-translate-y-0.5"
          style={{
            background: 'var(--gradient-warm)',
            color: 'white',
            boxShadow: '0 4px 16px var(--accent-glow)'
          }}
        >
          <Plus size={18} />
          新建 Prompt
        </button>
        {onOpenImport && (
          <button
            onClick={onOpenImport}
            className="px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition-all duration-200 hover:-translate-y-0.5"
            style={{
              background: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)'
            }}
          >
            <Upload size={18} />
            导入
          </button>
        )}
      </div>

      {/* 特色功能卡片 */}
      <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <div
          className="p-5 rounded-2xl text-left transition-all duration-200 cursor-default"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'var(--border-hover)'
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = 'var(--shadow-md)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'var(--border)'
            e.currentTarget.style.transform = 'none'
            e.currentTarget.style.boxShadow = 'none'
          }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
            style={{ background: '#ECFDF5' }}
          >
            <Sparkles size={20} style={{ color: '#10B981' }} />
          </div>
          <h4
            className="text-sm font-semibold mb-1.5"
            style={{ color: 'var(--text-primary)' }}
          >
            AI 智能分析
          </h4>
          <p
            className="text-sm"
            style={{ color: 'var(--text-muted)' }}
          >
            粘贴任意文本，AI 自动提取并分类提示词
          </p>
        </div>

        <div
          className="p-5 rounded-2xl text-left transition-all duration-200 cursor-default"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'var(--border-hover)'
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = 'var(--shadow-md)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'var(--border)'
            e.currentTarget.style.transform = 'none'
            e.currentTarget.style.boxShadow = 'none'
          }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
            style={{ background: '#EFF6FF' }}
          >
            <Zap size={20} style={{ color: '#3B82F6' }} />
          </div>
          <h4
            className="text-sm font-semibold mb-1.5"
            style={{ color: 'var(--text-primary)' }}
          >
            语义搜索
          </h4>
          <p
            className="text-sm"
            style={{ color: 'var(--text-muted)' }}
          >
            本地向量搜索，智能找到最相关的提示词
          </p>
        </div>

        <div
          className="p-5 rounded-2xl text-left transition-all duration-200 cursor-default"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'var(--border-hover)'
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = 'var(--shadow-md)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'var(--border)'
            e.currentTarget.style.transform = 'none'
            e.currentTarget.style.boxShadow = 'none'
          }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
            style={{ background: '#F5F3FF' }}
          >
            <FileText size={20} style={{ color: '#8B5CF6' }} />
          </div>
          <h4
            className="text-sm font-semibold mb-1.5"
            style={{ color: 'var(--text-primary)' }}
          >
            模板变量
          </h4>
          <p
            className="text-sm"
            style={{ color: 'var(--text-muted)' }}
          >
            {"使用 {{变量}} 创建可复用的 Prompt 模板"}
          </p>
        </div>
      </div>

      {/* 快捷键提示 */}
      <div
        className="flex items-center gap-6 text-sm"
        style={{ color: 'var(--text-muted)' }}
      >
        <span className="flex items-center gap-2">
          <kbd
            className="px-2 py-1 rounded-lg text-xs font-medium"
            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
          >
            <Command size={12} className="inline" />N
          </kbd>
          <span>新建</span>
        </span>
        <span className="flex items-center gap-2">
          <kbd
            className="px-2 py-1 rounded-lg text-xs font-medium"
            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
          >
            <Command size={12} className="inline" />K
          </kbd>
          <span>搜索</span>
        </span>
        <span className="flex items-center gap-2">
          <kbd
            className="px-2 py-1 rounded-lg text-xs font-medium"
            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
          >
            Esc
          </kbd>
          <span>关闭</span>
        </span>
      </div>
    </div>
  )
}
