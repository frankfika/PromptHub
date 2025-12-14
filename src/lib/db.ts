import Dexie, { type EntityTable } from 'dexie'
import type { Prompt, Settings, PromptVersion } from '../types/prompt'
import { parseTemplateVariables } from './ai'
import { embed } from './embedding'

const db = new Dexie('PromptHub') as Dexie & {
  prompts: EntityTable<Prompt, 'id'>
  settings: EntityTable<Settings, 'id'>
}

db.version(1).stores({
  prompts: '++id, title, category, *tags, createdAt, updatedAt, usageCount, isFavorite',
  settings: '++id'
})

export { db }

// ========== 数据同步机制 ==========
// 用于在 Web 应用和浏览器扩展之间同步数据

// BroadcastChannel 用于同源页面间通信
const syncChannel = typeof BroadcastChannel !== 'undefined'
  ? new BroadcastChannel('prompthub-sync')
  : null

// 防抖同步：避免频繁操作时多次同步
let syncTimer: ReturnType<typeof setTimeout> | null = null
let syncPending = false

// 同步数据到扩展（带防抖）
async function syncToExtension() {
  // 标记有待同步
  syncPending = true

  // 如果已有定时器在等待，让它处理
  if (syncTimer) return

  // 设置防抖：100ms 内的多次调用合并为一次
  syncTimer = setTimeout(async () => {
    syncTimer = null
    if (!syncPending) return
    syncPending = false

    try {
      const prompts = await db.prompts.toArray()
      // 简化数据，移除大字段（如 embedding）以减少存储
      const syncData = prompts.map(p => ({
        id: p.id,
        title: p.title,
        content: p.content,
        description: p.description,
        tags: p.tags,
        category: p.category,
        usageCount: p.usageCount,
        isFavorite: p.isFavorite,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt
      }))

      // 通过 BroadcastChannel 通知其他页面
      syncChannel?.postMessage({ type: 'prompts-updated', data: syncData })

      // 尝试通过 chrome.storage 同步到扩展
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chromeAPI = (globalThis as any).chrome
      if (chromeAPI?.storage?.local) {
        await chromeAPI.storage.local.set({
          promptsCache: syncData,
          lastSyncTime: Date.now()
        })
      }

      // 也存到 localStorage 作为备份（扩展可以通过 content script 读取）
      try {
        localStorage.setItem('prompthub-cache', JSON.stringify({
          prompts: syncData,
          timestamp: Date.now()
        }))
      } catch {
        // localStorage 可能满或被禁用
      }
    } catch (e) {
      console.warn('同步到扩展失败:', e)
    }
  }, 100)
}

// 监听来自扩展的同步请求
syncChannel?.addEventListener('message', async (event) => {
  if (event.data.type === 'request-sync') {
    await syncToExtension()
  }
})

// 导出同步函数供外部调用
export { syncToExtension }

// ========== 嵌入向量后台重试机制 ==========
let embeddingRetryTimer: ReturnType<typeof setTimeout> | null = null
let isRetrying = false

async function scheduleEmbeddingRetry() {
  // 防止重复调度
  if (embeddingRetryTimer || isRetrying) return

  embeddingRetryTimer = setTimeout(async () => {
    embeddingRetryTimer = null
    isRetrying = true

    try {
      // 找出所有没有 embedding 的提示词
      const prompts = await db.prompts.filter(p => !p.embedding || p.embedding.length === 0).toArray()

      for (const prompt of prompts) {
        try {
          const text = `${prompt.title} ${prompt.description} ${prompt.category} ${prompt.tags.join(' ')} ${prompt.content.slice(0, 500)}`
          const embedding = await embed(text)
          await db.prompts.update(prompt.id!, { embedding })
          console.log(`嵌入向量生成成功: ${prompt.title}`)
        } catch (e) {
          console.warn(`嵌入向量生成失败: ${prompt.title}`, e)
          // 继续处理下一个
        }
      }
    } catch (e) {
      console.warn('嵌入重试批次失败:', e)
    } finally {
      isRetrying = false
    }
  }, 5000) // 5秒后重试
}

// 页面加载时检查是否有未完成的嵌入
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    setTimeout(scheduleEmbeddingRetry, 3000)
  })
}

// 生成提示词的文本表示（用于嵌入）
function getPromptText(prompt: { title: string; description: string; content: string; tags: string[]; category: string }): string {
  return `${prompt.title} ${prompt.description} ${prompt.category} ${prompt.tags.join(' ')} ${prompt.content.slice(0, 500)}`
}

// Prompt CRUD
export const promptDB = {
  async add(prompt: Omit<Prompt, 'id' | 'createdAt' | 'updatedAt' | 'usageCount' | 'versions' | 'variables'>) {
    const now = new Date()
    const variables = parseTemplateVariables(prompt.content)

    // 生成嵌入向量（后台异步，不阻塞保存）
    let embedding: number[] | undefined
    try {
      embedding = await embed(getPromptText(prompt))
    } catch (e) {
      console.warn('嵌入生成失败，将在后台重试', e)
      // 添加到重试队列
      scheduleEmbeddingRetry()
    }

    const id = await db.prompts.add({
      ...prompt,
      variables,
      embedding,
      versions: [],
      createdAt: now,
      updatedAt: now,
      usageCount: 0,
    })

    // 同步到扩展
    await syncToExtension()
    return id
  },

  async getAll() {
    return db.prompts.orderBy('updatedAt').reverse().toArray()
  },

  async getById(id: number) {
    return db.prompts.get(id)
  },

  async update(id: number, changes: Partial<Prompt>, saveVersion = true) {
    const prompt = await db.prompts.get(id)
    if (!prompt) return

    const now = new Date()
    const updates: Partial<Prompt> = { ...changes, updatedAt: now }

    // 如果内容变化，保存版本历史并重新生成 embedding
    if (saveVersion && changes.content && changes.content !== prompt.content) {
      const newVersion: PromptVersion = {
        content: prompt.content,
        updatedAt: prompt.updatedAt
      }
      updates.versions = [...(prompt.versions || []), newVersion].slice(-10) // 保留最近10个版本
      updates.variables = parseTemplateVariables(changes.content)

      // 重新生成 embedding（内容变了，语义向量也需要更新）
      try {
        const newPrompt = { ...prompt, ...changes }
        updates.embedding = await embed(getPromptText(newPrompt))
      } catch (e) {
        console.warn('更新时嵌入生成失败，将在后台重试', e)
        updates.embedding = undefined // 清空旧的，等待重试
        scheduleEmbeddingRetry()
      }
    }

    const result = await db.prompts.update(id, updates)
    // 同步到扩展
    await syncToExtension()
    return result
  },

  async delete(id: number) {
    const result = await db.prompts.delete(id)
    // 同步到扩展
    await syncToExtension()
    return result
  },

  async search(query: string) {
    const q = query.toLowerCase()
    return db.prompts
      .filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.content.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.tags.some(t => t.toLowerCase().includes(q))
      )
      .toArray()
  },

  async getByCategory(category: string) {
    return db.prompts.where('category').equals(category).toArray()
  },

  async getFavorites() {
    // isFavorite 是 boolean 类型，使用 filter 而非 where
    return db.prompts.filter(p => p.isFavorite === true).toArray()
  },

  async incrementUsage(id: number) {
    const prompt = await db.prompts.get(id)
    if (prompt) {
      const result = await db.prompts.update(id, {
        usageCount: prompt.usageCount + 1,
        updatedAt: new Date()
      })
      // 同步到扩展（使用次数变化也需要同步）
      await syncToExtension()
      return result
    }
  },

  async getAllTags() {
    const prompts = await db.prompts.toArray()
    const tagSet = new Set<string>()
    prompts.forEach(p => p.tags.forEach(t => tagSet.add(t)))
    return Array.from(tagSet)
  },

  async getAllCategories() {
    const prompts = await db.prompts.toArray()
    const catSet = new Set<string>()
    prompts.forEach(p => catSet.add(p.category))
    return Array.from(catSet)
  },

  // 恢复到历史版本
  async restoreVersion(id: number, versionIndex: number) {
    const prompt = await db.prompts.get(id)
    if (!prompt || !prompt.versions || !prompt.versions[versionIndex]) return

    const version = prompt.versions[versionIndex]
    return this.update(id, { content: version.content })
  },

  // 批量导入
  async bulkAdd(prompts: Omit<Prompt, 'id' | 'createdAt' | 'updatedAt' | 'usageCount' | 'versions' | 'variables'>[]) {
    const now = new Date()
    const prepared = prompts.map(p => ({
      ...p,
      variables: parseTemplateVariables(p.content),
      versions: [],
      createdAt: now,
      updatedAt: now,
      usageCount: 0
    }))
    const result = await db.prompts.bulkAdd(prepared)
    // 同步到扩展
    await syncToExtension()
    // 调度嵌入生成
    scheduleEmbeddingRetry()
    return result
  },

  // 统计
  async getStats() {
    const prompts = await db.prompts.toArray()
    return {
      total: prompts.length,
      favorites: prompts.filter(p => p.isFavorite).length,
      totalUsage: prompts.reduce((sum, p) => sum + p.usageCount, 0),
      categories: [...new Set(prompts.map(p => p.category))].length,
      tags: [...new Set(prompts.flatMap(p => p.tags))].length
    }
  }
}

// Settings
export const settingsDB = {
  async get(): Promise<Settings> {
    const settings = await db.settings.toArray()
    // 默认使用亮色主题
    const defaultSettings = { aiProvider: 'deepseek' as const, theme: 'light' as const, autoAnalyze: true, language: 'zh' as const }
    if (settings[0]) {
      // 强制使用 light 主题（覆盖旧的 dark 设置）
      return { ...settings[0], theme: 'light' }
    }
    return defaultSettings
  },

  async save(settings: Partial<Settings>) {
    const existing = await db.settings.toArray()
    if (existing.length > 0) {
      return db.settings.update(existing[0].id!, settings)
    } else {
      return db.settings.add(settings as Settings)
    }
  }
}
