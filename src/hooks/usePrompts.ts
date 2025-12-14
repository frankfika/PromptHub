import { useState, useEffect, useCallback, useRef } from 'react'
import type { Prompt } from '../types/prompt'
import { promptDB } from '../lib/db'
import { embed, vectorSearch, warmup, isModelLoaded } from '../lib/embedding'

export type SortOption = 'newest' | 'oldest' | 'most-used' | 'least-used' | 'alphabetical'

export function usePrompts() {
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [allPrompts, setAllPrompts] = useState<Prompt[]>([]) // 缓存所有提示词用于搜索
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [categories, setCategories] = useState<string[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warmupStarted = useRef(false)

  // 排序函数
  const sortPrompts = useCallback((promptList: Prompt[], sort: SortOption): Prompt[] => {
    const sorted = [...promptList]
    switch (sort) {
      case 'newest':
        return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      case 'oldest':
        return sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      case 'most-used':
        return sorted.sort((a, b) => b.usageCount - a.usageCount)
      case 'least-used':
        return sorted.sort((a, b) => a.usageCount - b.usageCount)
      case 'alphabetical':
        return sorted.sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'))
      default:
        return sorted
    }
  }, [])

  // 预热向量搜索模型（在空闲时间加载）
  useEffect(() => {
    if (warmupStarted.current) return
    warmupStarted.current = true

    // 使用 requestIdleCallback 在空闲时预热，避免阻塞首屏渲染
    const startWarmup = () => {
      if (!isModelLoaded()) {
        warmup().catch(e => console.warn('模型预热失败:', e))
      }
    }

    if ('requestIdleCallback' in window) {
      (window as unknown as { requestIdleCallback: (cb: () => void, opts: { timeout: number }) => void }).requestIdleCallback(startWarmup, { timeout: 5000 })
    } else {
      // fallback: 3秒后开始预热
      setTimeout(startWarmup, 3000)
    }
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const all = await promptDB.getAll()
      setAllPrompts(sortPrompts(all, sortBy))

      let result: Prompt[]
      if (activeCategory === 'favorites') {
        // 收藏分类特殊处理
        result = await promptDB.getFavorites()
      } else if (activeCategory) {
        result = await promptDB.getByCategory(activeCategory)
      } else {
        result = all
      }
      setPrompts(sortPrompts(result, sortBy))

      const allCats = await promptDB.getAllCategories()
      setCategories(allCats)

      const allTags = await promptDB.getAllTags()
      setTags(allTags)
    } finally {
      setLoading(false)
    }
  }, [activeCategory, sortBy, sortPrompts])

  // 搜索逻辑 - 防抖 + 本地向量搜索
  useEffect(() => {
    if (!searchQuery.trim()) {
      // 清空搜索时恢复原列表
      if (activeCategory === 'favorites') {
        promptDB.getFavorites().then(result => setPrompts(sortPrompts(result, sortBy)))
      } else if (activeCategory) {
        promptDB.getByCategory(activeCategory).then(result => setPrompts(sortPrompts(result, sortBy)))
      } else {
        setPrompts(allPrompts)
      }
      return
    }

    // 防抖 300ms
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setSearching(true)
      const q = searchQuery.toLowerCase()

      // 文本搜索函数（复用）
      const textSearch = () => {
        return allPrompts.filter(p =>
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.content.toLowerCase().includes(q) ||
          p.tags.some(t => t.toLowerCase().includes(q))
        )
      }

      try {
        // 如果向量模型还没加载，先用文本搜索（响应更快）
        if (!isModelLoaded()) {
          setPrompts(textSearch())
          setSearching(false)
          // 后台继续加载模型，下次搜索就可以用了
          warmup().catch(() => {})
          return
        }

        // 本地向量搜索
        const queryEmbedding = await embed(searchQuery)
        const results = vectorSearch(
          queryEmbedding,
          allPrompts,
          (p) => p.embedding,
          20,  // topK
          0.2  // threshold
        )

        if (results.length > 0) {
          setPrompts(results.map(r => r.item))
        } else {
          // fallback: 简单文本搜索
          setPrompts(textSearch())
        }
      } catch (e) {
        console.error('搜索失败:', e)
        // fallback: 简单文本搜索
        setPrompts(textSearch())
      } finally {
        setSearching(false)
      }
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery, allPrompts, activeCategory, sortBy, sortPrompts])

  useEffect(() => {
    refresh()
  }, [refresh])

  const addPrompt = async (prompt: Omit<Prompt, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>) => {
    await promptDB.add(prompt)
    await refresh()
  }

  const updatePrompt = async (id: number, changes: Partial<Prompt>) => {
    await promptDB.update(id, changes)
    await refresh()
  }

  const deletePrompt = async (id: number) => {
    await promptDB.delete(id)
    await refresh()
  }

  const toggleFavorite = async (id: number) => {
    const prompt = prompts.find(p => p.id === id)
    if (prompt) {
      await promptDB.update(id, { isFavorite: !prompt.isFavorite })
      await refresh()
    }
  }

  const copyPrompt = async (id: number) => {
    const prompt = prompts.find(p => p.id === id)
    if (prompt) {
      await navigator.clipboard.writeText(prompt.content)
      await promptDB.incrementUsage(id)
      await refresh()
    }
  }

  return {
    prompts,
    loading,
    searching,
    searchQuery,
    setSearchQuery,
    activeCategory,
    setActiveCategory,
    categories,
    tags,
    sortBy,
    setSortBy,
    addPrompt,
    updatePrompt,
    deletePrompt,
    toggleFavorite,
    copyPrompt,
    refresh
  }
}
