import { Layers, Star, Settings, Plus, ArrowDownUp } from 'lucide-react'

interface Props {
  categories: string[]
  activeCategory: string | null
  onCategoryChange: (category: string | null) => void
  onAddNew: () => void
  onOpenSettings: () => void
  onOpenImportExport: () => void
  theme?: 'dark' | 'light'
  onToggleTheme?: () => void
}

export function Sidebar({ categories, activeCategory, onCategoryChange, onAddNew, onOpenSettings, onOpenImportExport }: Props) {
  return (
    <aside
      className="w-64 h-screen flex flex-col"
      style={{
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border)'
      }}
    >
      {/* Logo */}
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--accent)', color: 'white' }}
          >
            <Layers size={18} />
          </div>
          <div>
            <h1
              style={{
                fontSize: '18px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                letterSpacing: '-0.01em'
              }}
            >
              PromptHub
            </h1>
            <p
              style={{
                fontSize: '12px',
                color: 'var(--text-caption)',
                marginTop: '1px'
              }}
            >
              提示词管理
            </p>
          </div>
        </div>
      </div>

      {/* New Button */}
      <div className="px-4 pb-6">
        <button
          onClick={onAddNew}
          className="w-full flex items-center justify-center gap-2 transition-all hover:shadow-lg"
          style={{
            padding: '12px 16px',
            background: 'var(--accent)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontSize: '14px',
            fontWeight: 500,
            boxShadow: '0 2px 8px var(--accent-glow)'
          }}
        >
          <Plus size={18} strokeWidth={2} />
          <span>新建 Prompt</span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 overflow-auto">
        {/* Main Nav */}
        <div className="mb-6">
          <button
            onClick={() => onCategoryChange(null)}
            className="sidebar-item w-full"
            style={{
              background: activeCategory === null ? 'var(--accent-light)' : 'transparent',
              color: activeCategory === null ? 'var(--accent)' : 'var(--text-muted)'
            }}
          >
            <Layers size={18} />
            <span>全部</span>
          </button>

          <button
            onClick={() => onCategoryChange('favorites')}
            className="sidebar-item w-full"
            style={{
              background: activeCategory === 'favorites' ? 'var(--accent-light)' : 'transparent',
              color: activeCategory === 'favorites' ? 'var(--accent)' : 'var(--text-muted)'
            }}
          >
            <Star size={18} fill={activeCategory === 'favorites' ? 'currentColor' : 'none'} />
            <span>收藏</span>
          </button>
        </div>

        {/* Categories */}
        {categories.length > 0 && (
          <div>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                color: 'var(--text-caption)',
                marginBottom: '10px',
                paddingLeft: '14px'
              }}
            >
              分类
            </div>
            <div className="space-y-1">
              {categories.map(cat => {
                const isActive = activeCategory === cat
                return (
                  <button
                    key={cat}
                    onClick={() => onCategoryChange(cat)}
                    className="sidebar-item w-full"
                    style={{
                      background: isActive ? 'var(--accent-light)' : 'transparent',
                      color: isActive ? 'var(--accent)' : 'var(--text-muted)'
                    }}
                  >
                    {cat}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </nav>

      {/* Footer */}
      <div
        className="p-4"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <button
          onClick={onOpenImportExport}
          className="sidebar-item w-full"
        >
          <ArrowDownUp size={16} />
          <span>导入 / 导出</span>
        </button>
        <button
          onClick={onOpenSettings}
          className="sidebar-item w-full"
        >
          <Settings size={16} />
          <span>设置</span>
        </button>
      </div>
    </aside>
  )
}
