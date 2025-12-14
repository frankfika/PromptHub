import type { Prompt } from '../types/prompt'
import { promptDB } from './db'

// 导出格式
export type ExportFormat = 'json' | 'markdown' | 'csv'

// 导出提示词
export async function exportPrompts(format: ExportFormat = 'json'): Promise<string> {
  const prompts = await promptDB.getAll()

  switch (format) {
    case 'json':
      return exportToJSON(prompts)
    case 'markdown':
      return exportToMarkdown(prompts)
    case 'csv':
      return exportToCSV(prompts)
    default:
      return exportToJSON(prompts)
  }
}

// 导出为 JSON
function exportToJSON(prompts: Prompt[]): string {
  const exportData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    count: prompts.length,
    prompts: prompts.map(p => ({
      title: p.title,
      content: p.content,
      description: p.description,
      tags: p.tags,
      category: p.category,
      isFavorite: p.isFavorite,
      source: p.source
    }))
  }
  return JSON.stringify(exportData, null, 2)
}

// 导出为 Markdown
function exportToMarkdown(prompts: Prompt[]): string {
  const lines: string[] = [
    '# PromptHub 提示词导出',
    '',
    `> 导出时间: ${new Date().toLocaleString()}`,
    `> 共 ${prompts.length} 条提示词`,
    '',
    '---',
    ''
  ]

  // 按分类分组
  const byCategory = new Map<string, Prompt[]>()
  prompts.forEach(p => {
    const cat = p.category || '未分类'
    if (!byCategory.has(cat)) byCategory.set(cat, [])
    byCategory.get(cat)!.push(p)
  })

  byCategory.forEach((list, category) => {
    lines.push(`## ${category}`)
    lines.push('')
    list.forEach(p => {
      lines.push(`### ${p.isFavorite ? '⭐ ' : ''}${p.title}`)
      lines.push('')
      if (p.description) lines.push(`> ${p.description}`)
      lines.push('')
      lines.push('```')
      lines.push(p.content)
      lines.push('```')
      lines.push('')
      if (p.tags.length) lines.push(`**标签:** ${p.tags.join(', ')}`)
      if (p.source?.url) lines.push(`**来源:** ${p.source.url}`)
      lines.push('')
      lines.push('---')
      lines.push('')
    })
  })

  return lines.join('\n')
}

// 导出为 CSV
function exportToCSV(prompts: Prompt[]): string {
  const header = ['标题', '内容', '描述', '分类', '标签', '收藏', '来源']
  const rows = prompts.map(p => [
    escapeCSV(p.title),
    escapeCSV(p.content),
    escapeCSV(p.description),
    escapeCSV(p.category),
    escapeCSV(p.tags.join(';')),
    p.isFavorite ? '是' : '否',
    escapeCSV(p.source?.url || '')
  ])

  return [header.join(','), ...rows.map(r => r.join(','))].join('\n')
}

function escapeCSV(str: string): string {
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

// 导入提示词
export async function importPrompts(content: string, format: ExportFormat = 'json'): Promise<number> {
  let prompts: Partial<Prompt>[] = []

  try {
    switch (format) {
      case 'json':
        prompts = parseJSON(content)
        break
      case 'markdown':
        prompts = parseMarkdown(content)
        break
      case 'csv':
        prompts = parseCSV(content)
        break
    }
  } catch (error) {
    console.error('导入解析失败:', error)
    throw new Error('文件格式解析失败')
  }

  // 批量导入
  let imported = 0
  for (const p of prompts) {
    if (p.content) {
      await promptDB.add({
        content: p.content,
        title: p.title || p.content.slice(0, 50),
        description: p.description || '',
        tags: p.tags || [],
        category: p.category || '导入',
        source: p.source || { type: 'text' },
        isFavorite: p.isFavorite || false
      })
      imported++
    }
  }

  return imported
}

// 解析 JSON
function parseJSON(content: string): Partial<Prompt>[] {
  const data = JSON.parse(content)

  // 兼容多种格式
  if (Array.isArray(data)) {
    return data
  }
  if (data.prompts && Array.isArray(data.prompts)) {
    return data.prompts
  }
  if (data.content) {
    return [data]
  }

  throw new Error('无法识别的 JSON 格式')
}

// 解析 Markdown
function parseMarkdown(content: string): Partial<Prompt>[] {
  const prompts: Partial<Prompt>[] = []
  const lines = content.split('\n')

  let current: Partial<Prompt> | null = null
  let currentCategory = '导入'  // 当前分类
  let inCodeBlock = false
  let codeContent: string[] = []

  for (const line of lines) {
    // 二级标题作为分类
    if (line.startsWith('## ') && !line.startsWith('### ')) {
      currentCategory = line.replace('## ', '').trim()
      continue
    }

    // 三级标题作为提示词标题
    if (line.startsWith('### ')) {
      if (current && current.content) {
        prompts.push(current)
      }
      const title = line.replace('### ', '').replace('⭐ ', '')
      current = {
        title,
        isFavorite: line.includes('⭐'),
        content: '',
        tags: [],
        category: currentCategory  // 使用当前分类
      }
      continue
    }

    // 代码块
    if (line.startsWith('```')) {
      if (inCodeBlock && current) {
        current.content = codeContent.join('\n')
        codeContent = []
      }
      inCodeBlock = !inCodeBlock
      continue
    }

    if (inCodeBlock) {
      codeContent.push(line)
      continue
    }

    // 描述
    if (line.startsWith('> ') && current) {
      current.description = line.replace('> ', '')
      continue
    }

    // 标签
    if (line.startsWith('**标签:**') && current) {
      current.tags = line.replace('**标签:**', '').trim().split(', ')
      continue
    }
  }

  if (current && current.content) {
    prompts.push(current)
  }

  return prompts
}

// 解析 CSV
function parseCSV(content: string): Partial<Prompt>[] {
  const lines = content.split('\n').filter(l => l.trim())
  if (lines.length < 2) return []

  // 跳过表头
  return lines.slice(1).map(line => {
    const cols = parseCSVLine(line)
    return {
      title: cols[0] || '',
      content: cols[1] || '',
      description: cols[2] || '',
      category: cols[3] || '导入',
      tags: cols[4] ? cols[4].split(';') : [],
      isFavorite: cols[5] === '是',
      source: { type: 'text' as const, url: cols[6] }
    }
  })
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)
  return result
}

// 下载文件
export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// 生成分享链接（Base64 编码）
export function generateShareLink(prompt: Prompt): string {
  const data = {
    t: prompt.title,
    c: prompt.content,
    d: prompt.description,
    tags: prompt.tags,
    cat: prompt.category
  }
  const encoded = btoa(encodeURIComponent(JSON.stringify(data)))
  return `${window.location.origin}?import=${encoded}`
}

// 解析分享链接
export function parseShareLink(url: string): Partial<Prompt> | null {
  try {
    const params = new URLSearchParams(new URL(url).search)
    const encoded = params.get('import')
    if (!encoded) return null

    const data = JSON.parse(decodeURIComponent(atob(encoded)))
    return {
      title: data.t,
      content: data.c,
      description: data.d,
      tags: data.tags,
      category: data.cat
    }
  } catch {
    return null
  }
}
