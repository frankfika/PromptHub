import type { Prompt, AccessRule, User } from '../types/prompt'
import { settingsDB } from './db'

// ========== 自然语言权限过滤 ==========
// 使用 AI 理解自然语言权限规则，自动过滤提示词

interface FilterResult {
  allowed: Prompt[]
  blocked: Prompt[]
  reason?: string
}

// 根据自然语言规则过滤提示词
export async function filterByAccessRules(
  prompts: Prompt[],
  user: User,
  rules: AccessRule[]
): Promise<FilterResult> {
  // 找出适用于当前用户的规则
  const applicableRules = rules.filter(r =>
    r.isActive && r.appliesTo.some(role =>
      role === user.role || role === user.department || role === user.name
    )
  )

  // 如果没有规则限制，全部允许
  if (applicableRules.length === 0 && !user.customRules) {
    return { allowed: prompts, blocked: [] }
  }

  // 合并所有规则描述
  const ruleDescriptions = [
    ...applicableRules.map(r => r.description),
    user.customRules
  ].filter(Boolean).join('；')

  // 使用 AI 判断每个提示词是否允许访问
  const settings = await settingsDB.get()

  // 优先使用用户配置的 Key，其次使用环境变量
  let apiKey: string | undefined
  if (settings.aiProvider === 'openai') {
    apiKey = settings.openaiKey || import.meta.env.VITE_OPENAI_API_KEY
  } else {
    apiKey = settings.deepseekKey || import.meta.env.VITE_DEEPSEEK_API_KEY
  }

  if (!apiKey) {
    // 没有 API key，无法进行智能过滤，返回全部
    console.warn('未配置 API Key，跳过权限过滤')
    return { allowed: prompts, blocked: [] }
  }

  try {
    const result = await checkAccessWithAI(prompts, ruleDescriptions, settings)
    return result
  } catch (e) {
    console.error('权限过滤失败:', e)
    return { allowed: prompts, blocked: [] }
  }
}

// 使用 AI 批量检查访问权限
async function checkAccessWithAI(
  prompts: Prompt[],
  ruleDescription: string,
  settings: { aiProvider: string; openaiKey?: string; deepseekKey?: string }
): Promise<FilterResult> {
  const baseUrl = settings.aiProvider === 'openai'
    ? 'https://api.openai.com/v1'
    : 'https://api.deepseek.com'

  // 优先使用用户配置的 Key，其次使用环境变量
  let apiKey: string | undefined
  if (settings.aiProvider === 'openai') {
    apiKey = settings.openaiKey || import.meta.env.VITE_OPENAI_API_KEY
  } else {
    apiKey = settings.deepseekKey || import.meta.env.VITE_DEEPSEEK_API_KEY
  }

  // 构建提示词摘要列表
  const promptSummaries = prompts.map((p, i) => ({
    index: i,
    title: p.title,
    category: p.category,
    tags: p.tags.slice(0, 3),
    preview: p.description || p.content.slice(0, 100)
  }))

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: settings.aiProvider === 'openai' ? 'gpt-4o-mini' : 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: `你是一个权限审核助手。根据以下访问规则，判断用户能否访问每个提示词。

访问规则：${ruleDescription}

请返回 JSON 格式：
{
  "allowed": [0, 2, 5],  // 允许访问的提示词索引
  "blocked": [1, 3, 4],  // 禁止访问的提示词索引
  "reason": "简短说明过滤原因"
}

只返回 JSON，不要其他内容。`
        },
        {
          role: 'user',
          content: `请检查以下提示词的访问权限：\n${JSON.stringify(promptSummaries, null, 2)}`
        }
      ],
      temperature: 0.1,
      max_tokens: 1000
    })
  })

  const data = await response.json()
  if (data.error) throw new Error(data.error.message)

  const result = JSON.parse(
    data.choices[0].message.content
      .replace(/^```(?:json)?\s*\n?/i, '')
      .replace(/\n?```\s*$/i, '')
      .trim()
  )

  return {
    allowed: (result.allowed || []).map((i: number) => prompts[i]).filter(Boolean),
    blocked: (result.blocked || []).map((i: number) => prompts[i]).filter(Boolean),
    reason: result.reason
  }
}

// ========== 智能问答搜索 ==========
// 用户提问，AI 直接返回答案，而不是返回提示词列表

export interface SmartSearchResult {
  answer: string           // AI 生成的直接答案
  relatedPrompts: Prompt[] // 相关的提示词（供参考）
  confidence: number       // 答案置信度 0-1
}

export async function smartSearch(
  query: string,
  prompts: Prompt[]
): Promise<SmartSearchResult> {
  const settings = await settingsDB.get()

  // 优先使用用户配置的 Key，其次使用环境变量
  let apiKey: string | undefined
  if (settings.aiProvider === 'openai') {
    apiKey = settings.openaiKey || import.meta.env.VITE_OPENAI_API_KEY
  } else {
    apiKey = settings.deepseekKey || import.meta.env.VITE_DEEPSEEK_API_KEY
  }

  if (!apiKey) {
    return {
      answer: '请先配置 API Key 以启用智能搜索',
      relatedPrompts: [],
      confidence: 0
    }
  }

  // 构建提示词上下文
  const context = prompts.slice(0, 50).map((p, i) => ({
    index: i,
    title: p.title,
    category: p.category,
    content: p.content.slice(0, 300),
    tags: p.tags
  }))

  const baseUrl = settings.aiProvider === 'openai'
    ? 'https://api.openai.com/v1'
    : 'https://api.deepseek.com'

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: settings.aiProvider === 'openai' ? 'gpt-4o-mini' : 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: `你是一个提示词库助手。用户会问关于提示词的问题，你需要：

1. 直接回答用户的问题（不要说"请查看xxx"，要给出具体答案）
2. 如果用户想找某类提示词，直接推荐最合适的，并说明为什么推荐
3. 如果用户问怎么用，直接给出使用示例

返回 JSON 格式：
{
  "answer": "直接的答案，可以包含具体的提示词内容或使用建议",
  "relatedIndexes": [0, 3, 5],  // 相关提示词的索引
  "confidence": 0.9  // 答案置信度
}

只返回 JSON，不要其他内容。`
          },
          {
            role: 'user',
            content: `用户问题：${query}\n\n可用的提示词库：\n${JSON.stringify(context, null, 2)}`
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      })
    })

    const data = await response.json()
    if (data.error) throw new Error(data.error.message)

    const result = JSON.parse(
      data.choices[0].message.content
        .replace(/^```(?:json)?\s*\n?/i, '')
        .replace(/\n?```\s*$/i, '')
        .trim()
    )

    return {
      answer: result.answer || '未找到相关内容',
      relatedPrompts: (result.relatedIndexes || [])
        .map((i: number) => prompts[i])
        .filter(Boolean),
      confidence: result.confidence || 0.5
    }
  } catch (e) {
    console.error('智能搜索失败:', e)
    return {
      answer: '搜索出错，请稍后重试',
      relatedPrompts: [],
      confidence: 0
    }
  }
}
