import { useState, useEffect } from 'react'
import { Sidebar } from './components/Sidebar'
import { SearchBar } from './components/SearchBar'
import { PromptCard } from './components/PromptCard'
import { PromptModal } from './components/PromptModal'
import { PromptDetailModal } from './components/PromptDetailModal'
import { SettingsModal } from './components/SettingsModal'
import { EmptyState } from './components/EmptyState'
import { ImportExportModal } from './components/ImportExportModal'
import { UsePromptModal } from './components/UsePromptModal'
import { StatsPanel } from './components/StatsPanel'
import { Toast } from './components/Toast'
import { useToast } from './hooks/useToast'
import { ConfirmModal } from './components/ConfirmModal'
import { KeyboardHelp } from './components/KeyboardHelp'
import { PromptGridSkeleton } from './components/Skeleton'
import { usePrompts } from './hooks/usePrompts'
import { useSettings } from './hooks/useSettings'
import type { Prompt } from './types/prompt'
import { Clock, TrendingUp, SortAsc, Menu, X as CloseIcon, Search } from 'lucide-react'
import { parseTemplateVariables } from './lib/ai'
import type { SortOption } from './hooks/usePrompts'

const SORT_OPTIONS: { value: SortOption; label: string; icon: typeof Clock }[] = [
  { value: 'newest', label: '最新', icon: Clock },
  { value: 'oldest', label: '最早', icon: Clock },
  { value: 'most-used', label: '最常用', icon: TrendingUp },
  { value: 'least-used', label: '最少用', icon: TrendingUp },
  { value: 'alphabetical', label: '按名称', icon: SortAsc },
]

function App() {
  const {
    prompts,
    loading,
    searching,
    searchQuery,
    setSearchQuery,
    activeCategory,
    setActiveCategory,
    categories,
    sortBy,
    setSortBy,
    addPrompt,
    updatePrompt,
    deletePrompt,
    toggleFavorite,
    copyPrompt,
    refresh
  } = usePrompts()

  const { settings, updateSettings, toggleTheme } = useSettings()
  const toast = useToast()

  const [showPromptModal, setShowPromptModal] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showImportExport, setShowImportExport] = useState(false)
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null)
  const [viewingPrompt, setViewingPrompt] = useState<Prompt | null>(null)
  const [usingPrompt, setUsingPrompt] = useState<Prompt | null>(null)
  const [initialContent, setInitialContent] = useState<{ content: string; source: string; screenshot?: string } | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; promptId: number | null }>({
    isOpen: false,
    promptId: null
  })
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false)

  // 处理 URL 参数（从插件跳转过来）
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const action = params.get('action')
    let handled = false

    const openPromptModal = (data: { content?: string; source?: string; screenshot?: string; author?: string }) => {
      if (handled) return
      const content = (data.content || '').toString()
      const source = (data.source || '').toString()
      const screenshot = data.screenshot || undefined
      const author = (data.author || '').toString()

      if (!content && !screenshot) return
      handled = true

      queueMicrotask(() => {
        setInitialContent({
          content: author ? `[来自 ${author}]\n\n${content}` : content,
          source,
          screenshot
        })
        setShowPromptModal(true)
      })
      window.history.replaceState({}, '', window.location.pathname)
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.source !== window) return
      if (event.origin !== window.location.origin) return

      const msg = event.data
      if (!msg || msg.source !== 'prompthub-extension') return
      if (msg.type !== 'pending-prompt') return

      openPromptModal(msg.payload || {})
    }

    window.addEventListener('message', handleMessage)

    if (action === 'save') {
      const content = params.get('content') || ''
      const source = params.get('source') || ''
      if (content) {
        openPromptModal({ content, source })
      }
    } else if (action === 'save-from-extension' || action === 'save-with-image') {
      // 请求 content script 从扩展 storage 转发临时数据（避免 URL 泄漏）
      window.postMessage({ source: 'prompthub-web', type: 'request-pending-prompt' }, window.location.origin)
    }

    return () => window.removeEventListener('message', handleMessage)
  }, [])

  // 监听打开设置的事件（从子组件触发）
  useEffect(() => {
    const handleOpenSettings = () => {
      setShowPromptModal(false)
      setShowSettings(true)
    }
    window.addEventListener('open-settings', handleOpenSettings)
    return () => window.removeEventListener('open-settings', handleOpenSettings)
  }, [])

  const handleAddNew = () => {
    setEditingPrompt(null)
    setShowPromptModal(true)
  }

  // 全局键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ⌘K / Ctrl+K - 聚焦搜索框
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        const searchInput = document.getElementById('global-search') as HTMLInputElement
        searchInput?.focus()
      }
      // Escape - 关闭所有弹窗
      if (e.key === 'Escape') {
        if (usingPrompt) setUsingPrompt(null)
        else if (viewingPrompt) setViewingPrompt(null)
        else if (showPromptModal) { setShowPromptModal(false); setInitialContent(null) }
        else if (showSettings) setShowSettings(false)
        else if (showImportExport) setShowImportExport(false)
      }
      // ⌘N / Ctrl+N - 新建提示词
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault()
        handleAddNew()
      }
      // ? - 显示快捷键帮助
      if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        setShowKeyboardHelp(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [usingPrompt, viewingPrompt, showPromptModal, showSettings, showImportExport])

  const handleView = (prompt: Prompt) => {
    setViewingPrompt(prompt)
  }

  const handleEdit = (prompt: Prompt) => {
    setViewingPrompt(null) // 关闭查看弹窗
    setEditingPrompt(prompt)
    setShowPromptModal(true)
  }

  const handleSavePrompt = async (data: Omit<Prompt, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>) => {
    if (editingPrompt?.id) {
      await updatePrompt(editingPrompt.id, data)
      toast.success('提示词已更新')
    } else {
      await addPrompt(data)
      toast.success('提示词已保存')
    }
  }

  const handleDelete = (id: number) => {
    setDeleteConfirm({ isOpen: true, promptId: id })
  }

  const confirmDelete = async () => {
    if (deleteConfirm.promptId) {
      await deletePrompt(deleteConfirm.promptId)
      toast.success('提示词已删除')
    }
    setDeleteConfirm({ isOpen: false, promptId: null })
  }

  // 复制时检查是否有模板变量
  const handleCopy = (prompt: Prompt) => {
    const vars = parseTemplateVariables(prompt.content)
    if (vars.length > 0) {
      setUsingPrompt(prompt)
    } else {
      copyPrompt(prompt.id!)
      toast.success('已复制到剪贴板')
    }
  }

  // prompts 已经在 usePrompts 中按分类/收藏过滤过了，直接使用
  const filteredPrompts = prompts

  // 点击分类时关闭移动端菜单
  const handleMobileCategoryChange = (category: string | null) => {
    setActiveCategory(category)
    setMobileMenuOpen(false)
  }

  return (
    <div className="flex h-screen bg-[var(--bg-primary)]">
      {/* 移动端遮罩层 */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* 侧边栏 - 桌面端始终显示，移动端抽屉式 */}
      <div className={`
        fixed lg:relative inset-y-0 left-0 z-50
        transform transition-transform duration-300 ease-in-out
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <Sidebar
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={handleMobileCategoryChange}
          onAddNew={() => { handleAddNew(); setMobileMenuOpen(false) }}
          onOpenSettings={() => { setShowSettings(true); setMobileMenuOpen(false) }}
          onOpenImportExport={() => { setShowImportExport(true); setMobileMenuOpen(false) }}
          onOpenKeyboardHelp={() => { setShowKeyboardHelp(true); setMobileMenuOpen(false) }}
          theme={settings.theme}
          onToggleTheme={toggleTheme}
        />
      </div>

      <main className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
        {/* 头部搜索区域 */}
        <header
          className="p-4 md:p-6"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-4">
            {/* 移动端菜单按钮 */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 -ml-2 transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              {mobileMenuOpen ? <CloseIcon size={20} /> : <Menu size={20} />}
            </button>

            <div className="flex-1 max-w-xl">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                searching={searching}
                prompts={prompts}
                onSelectPrompt={handleView}
              />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-8">
          {/* 统计面板 */}
          {!loading && !searchQuery && !activeCategory && filteredPrompts.length > 0 && (
            <div className="hidden md:block mb-12">
              <StatsPanel refreshKey={filteredPrompts.length} />
            </div>
          )}

          {/* 页面标题 */}
          {!loading && filteredPrompts.length > 0 && (
            <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2
                  style={{
                    fontSize: '24px',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    letterSpacing: '-0.01em'
                  }}
                >
                  {searchQuery ? '搜索结果' : activeCategory === 'favorites' ? '收藏' : activeCategory || '全部 Prompt'}
                </h2>
                <p
                  style={{
                    fontSize: '14px',
                    color: 'var(--text-muted)',
                    marginTop: '4px'
                  }}
                >
                  共 {filteredPrompts.length} 个
                </p>
              </div>

              {/* 排序 */}
              <div className="flex items-center gap-2">
                <span
                  style={{
                    fontSize: '13px',
                    color: 'var(--text-muted)'
                  }}
                >
                  排序
                </span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="text-sm focus:outline-none cursor-pointer px-3 py-2 rounded-lg"
                  style={{
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border)',
                    fontWeight: 500
                  }}
                >
                  {SORT_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {loading ? (
            <PromptGridSkeleton count={6} />
          ) : filteredPrompts.length === 0 ? (
            searchQuery ? (
              <div className="text-center py-32">
                <div
                  className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--bg-tertiary)' }}
                >
                  <Search size={24} style={{ color: 'var(--text-caption)' }} />
                </div>
                <p
                  style={{
                    fontSize: '18px',
                    fontWeight: 600,
                    color: 'var(--text-primary)'
                  }}
                >
                  没有找到结果
                </p>
                <p
                  style={{
                    fontSize: '14px',
                    color: 'var(--text-muted)',
                    marginTop: '8px'
                  }}
                >
                  试试其他关键词
                </p>
              </div>
            ) : (
              <EmptyState onAddNew={handleAddNew} onOpenImport={() => setShowImportExport(true)} />
            )
          ) : (
            <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
              {filteredPrompts.map((prompt, index) => (
                <div
                  key={prompt.id}
                  className="animate-fadeIn"
                  style={{ animationDelay: `${index * 80}ms` }}
                >
                  <PromptCard
                    prompt={prompt}
                    onCopy={() => handleCopy(prompt)}
                    onToggleFavorite={() => toggleFavorite(prompt.id!)}
                    onDelete={() => handleDelete(prompt.id!)}
                    onEdit={() => handleEdit(prompt)}
                    onView={() => handleView(prompt)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {showPromptModal && (
        <PromptModal
          prompt={editingPrompt}
          initialContent={initialContent?.content}
          initialSource={initialContent?.source}
          initialScreenshot={initialContent?.screenshot}
          onSave={(data) => {
            handleSavePrompt(data)
            setInitialContent(null)
          }}
          onClose={() => {
            setShowPromptModal(false)
            setInitialContent(null)
          }}
        />
      )}

      {showSettings && (
        <SettingsModal
          settings={settings}
          onSave={updateSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showImportExport && (
        <ImportExportModal
          onClose={() => setShowImportExport(false)}
          onImportComplete={refresh}
        />
      )}

      {usingPrompt && (
        <UsePromptModal
          prompt={usingPrompt}
          onClose={() => setUsingPrompt(null)}
          onCopy={() => copyPrompt(usingPrompt.id!)}
        />
      )}

      {viewingPrompt && (
        <PromptDetailModal
          prompt={viewingPrompt}
          onClose={() => setViewingPrompt(null)}
          onCopy={() => handleCopy(viewingPrompt)}
          onEdit={() => handleEdit(viewingPrompt)}
          onToggleFavorite={() => {
            toggleFavorite(viewingPrompt.id!)
            setViewingPrompt({ ...viewingPrompt, isFavorite: !viewingPrompt.isFavorite })
          }}
          onRestore={() => {
            refresh()
            toast.success('版本已恢复')
          }}
        />
      )}

      {/* 删除确认弹窗 */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title="删除提示词"
        message="确定要删除这个提示词吗？此操作无法撤销。"
        confirmText="删除"
        cancelText="取消"
        type="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, promptId: null })}
      />

      {/* Toast 通知 */}
      <Toast toasts={toast.toasts} onRemove={toast.removeToast} />

      {/* 快捷键帮助 */}
      <KeyboardHelp
        isOpen={showKeyboardHelp}
        onClose={() => setShowKeyboardHelp(false)}
      />
    </div>
  )
}

export default App
