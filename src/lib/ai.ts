import type { Prompt, AIProvider } from '../types/prompt'
import { settingsDB } from './db'

interface AnalysisResult {
  title: string
  description: string
  tags: string[]
  category: string
}

interface OCRResult {
  text: string
  confidence: number
}

// AI 服务配置
const AI_CONFIGS: Record<AIProvider, { baseUrl: string; models: { default: string; vision: string } }> = {
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    models: { default: 'gpt-4o-mini', vision: 'gpt-4o' }
  },
  deepseek: {
    baseUrl: 'https://api.deepseek.com',
    models: { default: 'deepseek-chat', vision: 'deepseek-chat' }
  }
}

// 获取当前 AI 配置
async function getAIConfig() {
  const settings = await settingsDB.get()
  const provider = settings.aiProvider || 'deepseek'
  const config = AI_CONFIGS[provider]

  // 优先使用用户配置的 key，其次使用环境变量
  let apiKey: string | undefined
  if (provider === 'openai') {
    apiKey = settings.openaiKey || import.meta.env.VITE_OPENAI_API_KEY
  } else {
    apiKey = settings.deepseekKey || import.meta.env.VITE_DEEPSEEK_API_KEY
  }

  return { provider, config, apiKey }
}

// 消息类型
interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string | { type: string; text?: string; image_url?: { url: string } }[]
}

// 通用 AI 请求（带超时）
async function aiRequest(messages: ChatMessage[], useVision = false, timeoutMs = 30000): Promise<string> {
  const { provider, config, apiKey } = await getAIConfig()

  if (!apiKey) {
    throw new Error(`请先配置 ${provider === 'openai' ? 'OpenAI' : 'DeepSeek'} API Key`)
  }

  const model = useVision ? config.models.vision : config.models.default

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.1,  // 降低温度加快响应
        max_tokens: 1000   // 减少 token 加快响应
      }),
      signal: controller.signal
    })

    const data = await response.json()
    if (data.error) {
      throw new Error(data.error.message)
    }

    return data.choices[0].message.content
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('请求超时，请重试')
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

// 图片 OCR 识别提示词 (仅 OpenAI 支持视觉)
export async function extractTextFromImage(imageBase64: string): Promise<OCRResult> {
  const { provider, apiKey } = await getAIConfig()

  // DeepSeek 暂不支持视觉，提示用户
  if (provider === 'deepseek') {
    throw new Error('DeepSeek 暂不支持图片识别，请切换到 OpenAI 或手动输入')
  }

  if (!apiKey) {
    throw new Error('请先配置 API Key')
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `你是一个 OCR 专家。从图片中提取文字内容，特别是提示词（Prompt）。
返回 JSON 格式：
{
  "text": "提取的完整文字内容",
  "confidence": 0.95
}
只返回 JSON，不要其他内容。如果图片中没有文字，text 返回空字符串。`
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: '请提取这张图片中的提示词或文字内容：' },
              { type: 'image_url', image_url: { url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/png;base64,${imageBase64}` } }
            ]
          }
        ],
        temperature: 0.1,
        max_tokens: 2000
      })
    })

    const data = await response.json()
    if (data.error) {
      throw new Error(data.error.message)
    }
    return JSON.parse(data.choices[0].message.content)
  } catch (error) {
    console.error('OCR 失败:', error)
    throw error
  }
}

// 分析提示词
export async function analyzePrompt(content: string): Promise<AnalysisResult> {
  const { apiKey } = await getAIConfig()

  if (!apiKey) {
    return {
      title: content.slice(0, 50) + (content.length > 50 ? '...' : ''),
      description: '请配置 API Key 以启用自动分析',
      tags: [],
      category: '未分类'
    }
  }

  try {
    const result = await aiRequest([
      {
        role: 'system',
        content: `你是一个提示词分析专家。分析用户提供的提示词内容，返回JSON格式：
{
  "title": "简洁的标题（10字以内）",
  "description": "一句话描述这个提示词的用途和效果",
  "tags": ["标签1", "标签2", "标签3"],
  "category": "分类名（如：写作、编程、翻译、分析、创意、图像、效率等）"
}
只返回JSON，不要markdown代码块。`
      },
      {
        role: 'user',
        content: `分析这个提示词：\n${content}`
      }
    ])

    // 清理可能的 markdown 代码块
    const cleanJson = result.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim()
    return JSON.parse(cleanJson)
  } catch (error) {
    console.error('AI 分析失败:', error)
    return {
      title: content.slice(0, 50) + (content.length > 50 ? '...' : ''),
      description: '自动分析失败，请手动编辑',
      tags: [],
      category: '未分类'
    }
  }
}

// 解析模板变量
export function parseTemplateVariables(content: string): string[] {
  const regex = /\{\{([^}]+)\}\}/g
  const variables: string[] = []
  let match
  while ((match = regex.exec(content)) !== null) {
    variables.push(match[1].trim())
  }
  return [...new Set(variables)]
}

// 填充模板变量
export function fillTemplate(content: string, variables: Record<string, string>): string {
  return content.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
    const trimmedKey = key.trim()
    return variables[trimmedKey] ?? `{{${trimmedKey}}}`
  })
}

// 计算文本相似度
export function calculateSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/))
  const words2 = new Set(text2.toLowerCase().split(/\s+/))

  const intersection = new Set([...words1].filter(x => words2.has(x)))
  const union = new Set([...words1, ...words2])

  return intersection.size / union.size
}

// 网站场景映射
const siteCategories: Record<string, string[]> = {
  'chat.openai.com': ['编程', '写作', '分析', '翻译', '效率'],
  'chatgpt.com': ['编程', '写作', '分析', '翻译', '效率'],
  'claude.ai': ['编程', '写作', '分析', '翻译', '效率'],
  'poe.com': ['编程', '写作', '分析', '翻译', '效率'],
  'midjourney.com': ['图像', '创意', '设计'],
  'discord.com': ['图像', '创意', '设计'], // Midjourney 在 Discord
  'leonardo.ai': ['图像', '创意', '设计'],
  'stable-diffusion': ['图像', '创意', '设计'],
  'perplexity.ai': ['搜索', '分析', '研究'],
  'notion.so': ['写作', '效率', '笔记'],
  'gamma.app': ['PPT', '演示', '创意'],
}

// 根据网站匹配提示词
export function matchPromptsBysite(url: string, prompts: Prompt[]): Prompt[] {
  const host = new URL(url).host

  let preferredCategories: string[] = []
  for (const [site, categories] of Object.entries(siteCategories)) {
    if (host.includes(site)) {
      preferredCategories = categories
      break
    }
  }

  if (preferredCategories.length === 0) {
    return prompts.slice(0, 10)
  }

  // 优先匹配类别
  const matched = prompts.filter(p =>
    preferredCategories.some(cat =>
      p.category.includes(cat) || p.tags.some(t => t.includes(cat))
    )
  )

  // 补充其他
  const others = prompts.filter(p => !matched.includes(p))
  return [...matched, ...others].slice(0, 10)
}

// 从 URL 提取内容
export interface URLExtractResult {
  content: string
  title?: string
  description?: string
  tags?: string[]
  category?: string
  promptType?: 'text' | 'image' | 'code' | 'video' | 'audio' | 'other'
  targetModel?: string  // 适用模型
  sourceUrl: string
}

// 检测是否是 URL
export function isURL(text: string): boolean {
  try {
    const url = new URL(text.trim())
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

// 从 URL 提取提示词内容
export async function extractFromURL(url: string): Promise<URLExtractResult> {
  const { provider, config, apiKey } = await getAIConfig()

  if (!apiKey) {
    throw new Error(`请先配置 ${provider === 'openai' ? 'OpenAI' : 'DeepSeek'} API Key`)
  }

  // 使用代理服务或直接抓取（这里用 AI 来理解页面）
  // 对于 Twitter/X，我们可以用一个简单的方式：让用户粘贴 URL，然后我们告诉 AI 这是什么类型的链接

  const host = new URL(url).host
  let contextHint = ''
  let promptTypeHint: URLExtractResult['promptType'] = 'text'

  if (host.includes('twitter.com') || host.includes('x.com')) {
    contextHint = '这是一条 Twitter/X 推文链接，通常包含 AI 提示词分享。'
  } else if (host.includes('xiaohongshu.com')) {
    contextHint = '这是一个小红书帖子链接，可能包含 AI 提示词分享。'
  } else if (host.includes('weibo.com')) {
    contextHint = '这是一条微博链接，可能包含 AI 提示词分享。'
  } else if (host.includes('midjourney.com') || host.includes('civitai.com')) {
    contextHint = '这是一个 AI 图像生成相关的链接。'
    promptTypeHint = 'image'
  } else if (host.includes('github.com')) {
    contextHint = '这是一个 GitHub 链接，可能包含代码相关的提示词。'
    promptTypeHint = 'code'
  }

  try {
    // 尝试获取 URL 内容（通过 CORS 代理或直接请求）
    // 由于浏览器 CORS 限制，我们使用 AI 来"理解"这个 URL 应该包含什么
    // 实际生产中可以使用后端服务或 browserless 等方案

    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: config.models.default,
        messages: [
          {
            role: 'system',
            content: `你是一个提示词提取专家。用户会给你一个 URL 链接。
${contextHint}

请根据 URL 分析这可能是什么类型的内容，并返回 JSON 格式：
{
  "needsContent": true,
  "hint": "请粘贴该链接页面中的提示词内容，我来帮你整理",
  "suggestedType": "${promptTypeHint}",
  "suggestedCategory": "根据URL猜测的分类"
}

如果你能从 URL 本身推断出一些信息（如推文 ID、用户名等），也可以提供。
只返回 JSON。`
          },
          {
            role: 'user',
            content: `请分析这个链接：${url}`
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      })
    })

    const data = await response.json()
    if (data.error) {
      throw new Error(data.error.message)
    }

    const result = JSON.parse(data.choices[0].message.content)

    return {
      content: '',
      title: '',
      description: result.hint || '请粘贴链接中的提示词内容',
      category: result.suggestedCategory || '未分类',
      promptType: result.suggestedType || promptTypeHint,
      sourceUrl: url
    }
  } catch (error) {
    console.error('URL 分析失败:', error)
    return {
      content: '',
      sourceUrl: url,
      promptType: promptTypeHint
    }
  }
}

// 模型检测模式
const MODEL_PATTERNS = [
  { keywords: ['nanobanana', 'nano banana'], model: 'nanobanana2' },
  { keywords: ['midjourney', '--v 6', '--v 5', '--ar ', '--style'], model: 'Midjourney' },
  { keywords: ['dall-e', 'dalle', 'dall·e'], model: 'DALL-E' },
  { keywords: ['stable diffusion', 'sdxl', 'comfyui', 'a]#'], model: 'Stable Diffusion' },
  { keywords: ['flux'], model: 'Flux' },
]

// 根据内容和来源检测模型
export function detectTargetModel(content: string, sourceUrl?: string, author?: string): string | null {
  const lower = content.toLowerCase()

  // 1. 从来源 URL 检测
  if (sourceUrl?.toLowerCase().includes('nanobanana')) return 'nanobanana2'

  // 2. 从作者检测
  if (author?.includes('qisi_ai')) return 'nanobanana2'

  // 3. 从内容关键词检测
  for (const { keywords, model } of MODEL_PATTERNS) {
    if (keywords.some(kw => lower.includes(kw))) {
      return model
    }
  }

  // 4. 图像类 prompt 特征检测
  const imagePatterns = [/cinematic/i, /portrait/i, /anime style/i, /digital art/i, /#风格|#镜头/]
  if (imagePatterns.some(p => p.test(content))) {
    return 'Midjourney'
  }

  return null
}

// 从粘贴的文本中提取提示词（可能包含很多无关内容）
export async function extractPromptFromText(rawText: string, sourceUrl?: string): Promise<URLExtractResult> {
  const { apiKey } = await getAIConfig()

  if (!apiKey) {
    return {
      content: rawText,
      sourceUrl: sourceUrl || ''
    }
  }

  try {
    const responseText = await aiRequest([
      {
        role: 'system',
        content: `从文本中提取AI提示词，返回JSON：
{"content":"纯净提示词","title":"标题10字内","description":"一句话描述","tags":["标签"],"category":"写作/编程/翻译/分析/图像/创意/效率/角色扮演/其他","promptType":"text/image/code/other","targetModel":"适用模型或null"}

规则：
- 去掉社交媒体噪音（兄弟们、欧巴等）
- 保留<instruction>等标签
- 图像生成类→promptType:"image",category:"图像"
- targetModel识别：Nano/Midjourney/DALL-E/Stable Diffusion/GPT/Claude/Gemini等，没提到就null
- 只返回JSON，不要markdown代码块`
      },
      {
        role: 'user',
        content: rawText
      }
    ])

    // 清理可能的 markdown 代码块
    const cleanJson = responseText.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim()
    const result = JSON.parse(cleanJson)

    return {
      content: result.content || rawText,
      title: result.title,
      description: result.description,
      tags: result.tags,
      category: result.category,
      promptType: result.promptType,
      targetModel: result.targetModel || undefined,
      sourceUrl: sourceUrl || ''
    }
  } catch (error) {
    console.error('提取失败:', error)
    return {
      content: rawText,
      sourceUrl: sourceUrl || ''
    }
  }
}

// 语义搜索 - 用 AI 理解搜索意图
export async function semanticSearch(query: string, prompts: Prompt[]): Promise<Prompt[]> {
  if (prompts.length === 0) return []

  const { apiKey } = await getAIConfig()

  // 无 API key 时用简单匹配
  if (!apiKey) {
    return simpleSearch(query, prompts)
  }

  try {
    // 构建提示词摘要列表
    const promptSummaries = prompts.map((p, i) => ({
      id: i,
      title: p.title,
      desc: p.description.slice(0, 50),
      category: p.category,
      tags: p.tags.slice(0, 3).join(',')
    }))

    const responseText = await aiRequest([
      {
        role: 'system',
        content: `用户要搜索提示词，理解用户意图，返回匹配的ID列表。
返回JSON数组，按相关度排序：[0, 3, 5]（数字是提示词ID）
没有匹配返回：[]
只返回JSON数组，不要其他内容。`
      },
      {
        role: 'user',
        content: `搜索：${query}\n\n提示词列表：\n${JSON.stringify(promptSummaries)}`
      }
    ], false, 15000) // 15秒超时

    const cleanJson = responseText.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim()
    const matchedIds: number[] = JSON.parse(cleanJson)

    // 按匹配顺序返回
    const results = matchedIds
      .filter(id => id >= 0 && id < prompts.length)
      .map(id => prompts[id])

    // 如果 AI 没找到，fallback 到简单搜索
    if (results.length === 0) {
      return simpleSearch(query, prompts)
    }

    return results
  } catch (error) {
    console.error('语义搜索失败，使用简单搜索:', error)
    return simpleSearch(query, prompts)
  }
}

// 简单文本搜索（fallback）
function simpleSearch(query: string, prompts: Prompt[]): Prompt[] {
  const q = query.toLowerCase()
  const keywords = q.split(/\s+/).filter(Boolean)

  return prompts
    .map(p => {
      const text = `${p.title} ${p.description} ${p.content} ${p.tags.join(' ')} ${p.category}`.toLowerCase()
      const score = keywords.reduce((acc, kw) => acc + (text.includes(kw) ? 1 : 0), 0)
      return { prompt: p, score }
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(item => item.prompt)
}

// 根据上下文匹配提示词
export async function matchPrompts(context: string, prompts: Prompt[], siteUrl?: string): Promise<Prompt[]> {
  // 先按网站筛选
  const candidates = siteUrl ? matchPromptsBysite(siteUrl, prompts) : prompts

  if (!context.trim()) return candidates.slice(0, 10)

  const scored = candidates.map(p => ({
    prompt: p,
    score: Math.max(
      calculateSimilarity(context, p.title),
      calculateSimilarity(context, p.description),
      calculateSimilarity(context, p.content),
      ...p.tags.map(t => calculateSimilarity(context, t))
    )
  }))

  return scored
    .filter(s => s.score > 0.05)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(s => s.prompt)
}
